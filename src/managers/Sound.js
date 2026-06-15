/* ============================================================
 * Sound.js — procedural Web Audio engine with separate
 * MUSIC and SFX buses (independent volume), plus mute.
 * Drop a real loop at assets/audio/ambient.mp3 to override
 * the procedural ambient bed automatically.
 * ============================================================ */
class SoundFX {
  constructor(){
    this.ctx = null; this.master = null; this.musicGain = null; this.sfxGain = null;
    this.noiseBuf = null;
    this.muted = false; this.ambientOn = false; this.ambientTimer = null;
    this._ambientEl = null; this._triedFile = false;
    this.musicVol = 0.5; this.sfxVol = 0.7;
  }

  ensure(){
    if(this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 1; this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.musicVol; this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();   this.sfxGain.gain.value = this.sfxVol;     this.sfxGain.connect(this.master);
    const len = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = Math.random()*2 - 1;
    this.noiseBuf = buf;
  }

  resume(){ this.ensure(); if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  get t(){ return this.ctx.currentTime; }
  _bus(name){ return name === 'music' ? this.musicGain : this.sfxGain; }

  tone(freq, dur, type='sine', vol=0.3, slideTo=null, bus='sfx'){
    if(!this.ctx) return;
    const t = this.t, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this._bus(bus)); o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, vol=0.3, freq=1000, type='lowpass', bus='sfx'){
    if(!this.ctx) return;
    const t = this.t, s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noiseBuf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this._bus(bus)); s.start(t); s.stop(t + dur + 0.02);
  }

  // --- named SFX ---
  click(){ this.tone(680, 0.06, 'square', 0.16); }
  footstep(){ this.noise(0.06, 0.10, 400, 'lowpass'); }
  pickup(){ this.tone(660, 0.09, 'sine', 0.24); setTimeout(()=>this.tone(990, 0.12, 'sine', 0.2), 70); }
  craft(){ this.tone(300, 0.3, 'square', 0.16, 150); this.noise(0.22, 0.10, 2600, 'highpass'); setTimeout(()=>this.tone(520,0.3,'triangle',0.12,200),40); }
  dig(){ this.noise(0.16, 0.28, 320, 'lowpass'); this.tone(150, 0.2, 'sine', 0.18, 70); }
  alert(){ this.tone(440, 0.16, 'sawtooth', 0.22, 1200); }
  caught(){ this.tone(420, 0.55, 'sawtooth', 0.26, 80); this.noise(0.5, 0.18, 800, 'lowpass'); }
  victory(){ [523,659,784,1047,1319].forEach((f,i)=>setTimeout(()=>this.tone(f, 0.32, 'sine', 0.24), i*150)); }

  // --- volumes ---
  setMusicVolume(v){ this.musicVol = v; this.ensure(); if(this.musicGain) this.musicGain.gain.value = v; if(this._ambientEl) this._ambientEl.volume = v; }
  setSfxVolume(v){ this.sfxVol = v; this.ensure(); if(this.sfxGain) this.sfxGain.gain.value = v; }

  setMuted(m){
    this.muted = m;
    if(this.master) this.master.gain.value = m ? 0 : 1;
    if(this._ambientEl) this._ambientEl.muted = m;
    if(m) this._stopProc(); else this.startAmbient();
    return this.muted;
  }
  toggleMute(){ return this.setMuted(!this.muted); }

  startAmbient(){
    this.ensure();
    if(this.muted || this.ambientOn) return;
    if(this._ambientEl){ this._ambientEl.play().catch(()=>{}); this.ambientOn = true; return; }
    if(!this._triedFile){
      this._triedFile = true;
      const a = new Audio('assets/audio/ambient.mp3');
      a.loop = true; a.volume = this.musicVol;
      a.play().then(() => { this._ambientEl = a; this.ambientOn = true; })
              .catch(() => this._procAmbient());
      return;
    }
    this._procAmbient();
  }

  _procAmbient(){
    if(this.ambientOn) return;
    this.ambientOn = true;
    let step = 0;
    const pat = [1,0,0,1, 0,0,1,0];
    this.ambientTimer = setInterval(() => {
      if(!this.ambientOn) return;
      if(pat[step % 8]) this.tone(110 + (step % 16 === 0 ? 22 : 0), 0.28, 'sine', 0.5, 70, 'music');
      if(step % 8 === 4) this.noise(0.05, 0.18, 6000, 'highpass', 'music');
      step++;
    }, 300);
  }

  _stopProc(){
    this.ambientOn = false;
    if(this.ambientTimer){ clearInterval(this.ambientTimer); this.ambientTimer = null; }
    if(this._ambientEl) this._ambientEl.pause();
  }
}
window.Sound = new SoundFX();
