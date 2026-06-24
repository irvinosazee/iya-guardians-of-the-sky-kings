/* ============================================================
 * ui.js — DOM HUD/overlay bridge for the 3D build.
 * Mirrors the 2D UI object so shared modules (Forge, Tutorial,
 * Settings) work unchanged.
 * ============================================================ */
const AVATARS = {
  'The Elder Caster': { e:'🧓', c:'#b5792a' },
  'Oba Ewuare':       { e:'👑', c:'#f0c040' },
  'Iyoba Idia':       { e:'👸', c:'#E06040' },
};
const SVG_SOUND_ON  = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>';
const SVG_SOUND_OFF = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>';
const SVG_HELP = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 1 1 4.5 2.6c-.9.6-1.6 1.2-1.6 2.4"/><circle cx="12" cy="17.5" r="0.6" fill="currentColor"/></svg>';
const SVG_GEAR = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.2.61.78 1.05 1.51 1.05H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

const _show = (id) => { const e=document.getElementById(id); e.classList.remove('hidden'); e.classList.add('flex'); };
const _hide = (id) => { const e=document.getElementById(id); e.classList.add('hidden'); e.classList.remove('flex'); };
const _open = (id) => !document.getElementById(id).classList.contains('hidden');

const UI = {
  showHUD(){ _show('hud'); this.updateHUD(); },
  hideHUD(){ _hide('hud'); this.setContext(null); this.setHidden(false); this.setDanger(0);
    const mm=document.getElementById('minimap-wrap'); if(mm) mm.classList.add('hidden'); },

  setObjective(t){ const e=document.getElementById('hud-objective'); if(e) e.textContent='► Objective: '+t; },

  updateHUD(){
    const gs=window.GameState; if(!gs) return;
    let beads=''; for(let i=0;i<gs.maxHealth;i++) beads+=`<span style="color:${i<gs.hp?'#ff6a4d':'#4a322a'}">●</span>`;
    document.getElementById('hud-hp').innerHTML=beads;
    document.getElementById('ct-cowrie').textContent=gs.cowries;
    document.getElementById('ct-coral').textContent=gs.materials.coral;
    document.getElementById('ct-bronze').textContent=gs.materials.bronze;
    document.getElementById('ct-mudfish').textContent=gs.materials.mudfish;
    document.getElementById('hud-act').textContent='ACT '+({1:'I',2:'II',3:'III'}[gs.currentAct]||gs.currentAct);
    document.getElementById('hud-moat').textContent='Moat '+Math.round(gs.moatProgress()*100)+'%';
  },

  setAlert(pct){
    const f=document.getElementById('alert-fill'); f.style.width=pct+'%';
    const lab=document.getElementById('alert-label');
    if(pct>75){ f.style.background='#ff3030'; lab.textContent='SPOTTED'; lab.className='text-[10px] font-bold tracking-wider text-red-400'; }
    else if(pct>35){ f.style.background='#f0c040'; lab.textContent='SEARCHING'; lab.className='text-[10px] font-bold tracking-wider text-amber-300'; }
    else { f.style.background='#40e070'; lab.textContent='CLEAR'; lab.className='text-[10px] font-bold tracking-wider text-emerald-400'; }
  },

  toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('opacity-100'); t.classList.remove('opacity-0'); clearTimeout(this._tt); this._tt=setTimeout(()=>{ t.classList.add('opacity-0'); t.classList.remove('opacity-100'); },2400); },

  // contextual prompt (null/'' hides it)
  setContext(text, icon){
    const el=document.getElementById('context-prompt');
    if(!text){ el.classList.add('hidden'); el.classList.remove('flex'); return; }
    document.getElementById('ctx-text').textContent=text;
    document.getElementById('ctx-icon').textContent=icon||'▸';
    el.classList.remove('hidden'); el.classList.add('flex');
  },
  setHidden(on){ const el=document.getElementById('hidden-badge'); if(on){ el.classList.remove('hidden'); el.classList.add('flex'); } else { el.classList.add('hidden'); el.classList.remove('flex'); } },
  setDanger(v){ document.getElementById('danger-vignette').style.opacity = Math.max(0, Math.min(1, v)); },

  actBanner(title, sub){
    document.getElementById('ab-title').textContent=title;
    document.getElementById('ab-sub').textContent=sub;
    const el=document.getElementById('act-banner'); el.classList.remove('hidden'); el.classList.add('flex'); el.style.animation='fadeUp .5s ease';
    clearTimeout(this._abT); this._abT=setTimeout(()=>{ el.classList.add('hidden'); el.classList.remove('flex'); },1900);
  },

  // dialogue (typewriter)
  showDialogue(speaker, lines, onDone){
    this._dl=lines.slice(); this._di=0; this._dcb=onDone;
    const av=AVATARS[speaker]||{e:'🗣️',c:'#caa472'};
    const port=document.getElementById('dlg-portrait'); port.textContent=av.e; port.style.borderColor=av.c;
    port.classList.remove('pop'); void port.offsetWidth; port.classList.add('pop');
    document.getElementById('dlg-speaker').textContent=speaker;
    _show('dialogue'); this._type();
  },
  dialogueOpen(){ return _open('dialogue'); },
  _type(){ clearInterval(this._tw); const full=this._dl[this._di], el=document.getElementById('dlg-text'); el.textContent=''; this._twDone=false; let i=0; this._tw=setInterval(()=>{ el.textContent=full.slice(0,++i); if(i>=full.length){ clearInterval(this._tw); this._twDone=true; } },16); },
  _dadvance(){ if(!this._dl) return; if(window.Sound) Sound.click(); if(!this._twDone){ clearInterval(this._tw); document.getElementById('dlg-text').textContent=this._dl[this._di]; this._twDone=true; return; } this._di++; if(this._di>=this._dl.length){ _hide('dialogue'); const cb=this._dcb; this._dcb=null; this._dl=null; if(cb) cb(); } else this._type(); },

  // help / info
  openHelp(){ if(window.__stealth) __stealth.uiPaused=true; _show('help-overlay'); if(window.Sound) Sound.click(); },
  helpOpen(){ return _open('help-overlay'); },
  closeHelp(){ _hide('help-overlay'); if(window.__stealth && this._noModals()) __stealth.uiPaused=false; if(window.Sound) Sound.click(); },
  infoModal(title, body, onOk){ document.getElementById('info-title').textContent=title; document.getElementById('info-body').textContent=body; _show('info-modal'); this._infoCb=onOk; if(window.Sound) Sound.click(); },
  infoOpen(){ return _open('info-modal'); },
  closeInfo(){ _hide('info-modal'); const cb=this._infoCb; this._infoCb=null; if(cb) cb(); },

  // pause
  pauseOpen(){ return _open('pause-menu'); },
  openPause(){ if(!window.__stealth) return; __stealth.uiPaused=true; const o=document.getElementById('pause-objective'); if(o) o.textContent=document.getElementById('hud-objective').textContent.replace('► ',''); _show('pause-menu'); if(window.Sound) Sound.click(); },
  resumeGame(){ _hide('pause-menu'); if(window.__stealth && this._noModals()) __stealth.uiPaused=false; if(window.Sound) Sound.click(); },
  restartAct(){ _hide('pause-menu'); if(window.__stealth){ __stealth.uiPaused=false; __stealth.restartAct(); } },
  quitToTitle(){ _hide('pause-menu'); if(window.__stealth) __stealth.quitToTitle(); },

  // settings
  settingsOpen(){ return _open('settings-overlay'); },
  openSettings(fromPause){ this._sFromPause=!!fromPause; if(!fromPause && window.__stealth) __stealth.uiPaused=true; this.syncSettingsUI(); _show('settings-overlay'); if(window.Sound) Sound.click(); },
  closeSettings(){ _hide('settings-overlay'); if(window.Settings) Settings.save(); if(!this._sFromPause && window.__stealth && this._noModals()) __stealth.uiPaused=false; if(window.Sound) Sound.click(); },
  syncSettingsUI(){
    const S=window.Settings; if(!S) return;
    document.getElementById('set-music').value=Math.round(S.musicVol*100);
    document.getElementById('set-sfx').value=Math.round(S.sfxVol*100);
    document.getElementById('set-bright').value=Math.round(S.brightness*100);
    document.getElementById('set-sens').value=Math.round(S.camSensitivity*100);
    document.getElementById('set-motion').checked=S.reduceMotion;
    document.getElementById('lbl-music').textContent=Math.round(S.musicVol*100)+'%';
    document.getElementById('lbl-sfx').textContent=Math.round(S.sfxVol*100)+'%';
    document.getElementById('lbl-bright').textContent=Math.round(S.brightness*100)+'%';
    document.getElementById('lbl-sens').textContent=Math.round(S.camSensitivity*100)+'%';
    document.querySelectorAll('.diff-btn').forEach(b=>{ const on=b.dataset.diff===S.difficulty; b.classList.toggle('bg-amber-600',on); b.classList.toggle('text-stone-900',on); });
  },
  resetProgress(){ if(window.GameSave) GameSave.clear(); if(window.GameState) GameState.reset(); if(window.Settings){ Settings.tutorialDone=false; Settings.forgeSeen=false; Settings.moatSeen=false; Settings.save(); } this.toast('Progress reset.'); this.closeSettings(); this.showMenu(); },

  toggleMute(){ if(!window.Sound) return; const m=Sound.toggleMute(); document.querySelectorAll('.btn-mute').forEach(b=>b.innerHTML=m?SVG_SOUND_OFF:SVG_SOUND_ON); },

  // screens
  showMenu(){ if(window.__stealth){ __stealth.destroy(); window.__stealth=null; } this.hideHUD(); _hide('victory'); _hide('pause-menu'); _show('menu'); this._refreshContinue(); if(window.startIdle) startIdle(); },
  showVictory(){ this.hideHUD(); document.getElementById('victory-stats').textContent=`Cowries gathered: ${GameState.cowries}     Plaques forged: ${Object.keys(GameState.ownedPlaques).length}/3`; _show('victory'); if(window.Sound) Sound.victory(); },

  newGame(){ if(window.Sound){ Sound.resume(); Sound.click(); Sound.startAmbient(); } GameState.reset(); if(window.autosave) autosave();
    this.showDialogue('The Elder Caster', [
      "Igodomigodo — the city of red walls. By night, the bronze still glows in the casters' pits.",
      "You are ADESUA, Royal Bronze Caster. The Ogiso loyalists move in shadow, sharpening knives for Oba Ewuare before the Igue festival.",
      "The polished red walls hold secrets, Adesua. Cast the brass... but watch the shadows.",
    ], () => { _hide('menu'); window.startGame(); }); },
  continueGame(){ if(window.Sound){ Sound.resume(); Sound.click(); Sound.startAmbient(); } GameState.apply(this._saved); _hide('menu'); window.startGame(); },
  _refreshContinue(){
    const btn=document.getElementById('continue-btn');
    if(window.GameSave) GameSave.load().then(d=>{
      if(d && (d.currentAct>1 || (d.cowries!=null&&d.cowries!==40) || Object.keys(d.ownedPlaques||{}).length || Object.keys(d.moatDug||{}).length)){
        this._saved=d; btn.textContent=`Continue — Act ${({1:'I',2:'II',3:'III'}[d.currentAct]||d.currentAct)}, ${d.cowries} cowries`; btn.classList.remove('hidden');
      } else btn.classList.add('hidden');
    });
  },

  _noModals(){ return !this.helpOpen() && !this.settingsOpen() && !this.pauseOpen() && !this.infoOpen() && !_open('forge-overlay') && !_open('moat-overlay'); },
  handleEscape(){
    if(this.dialogueOpen()) return;
    if(this.infoOpen()){ this.closeInfo(); return; }
    if(this.settingsOpen()){ this.closeSettings(); return; }
    if(this.helpOpen()){ this.closeHelp(); return; }
    if(_open('forge-overlay')){ if(window.Forge) Forge.close(); return; }
    if(_open('moat-overlay')){ if(window.Moat) Moat.close(); return; }
    if(this.pauseOpen()){ this.resumeGame(); return; }
    if(window.__stealth && !__stealth.complete) this.openPause();
  },
};
window.UI = UI;

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.btn-mute').forEach(b=>b.innerHTML=SVG_SOUND_ON);
  document.querySelectorAll('.btn-help-ic').forEach(b=>b.innerHTML=SVG_HELP);
  document.querySelectorAll('.btn-gear').forEach(b=>b.innerHTML=SVG_GEAR);
  document.getElementById('dialogue').addEventListener('click',()=>UI._dadvance());
  document.getElementById('forge-close').addEventListener('click',()=>window.Forge&&Forge.close());
  document.getElementById('info-ok').addEventListener('click',()=>UI.closeInfo());

  const S=()=>window.Settings;
  document.getElementById('set-music').addEventListener('input',e=>{ S().musicVol=e.target.value/100; document.getElementById('lbl-music').textContent=e.target.value+'%'; if(window.Sound) Sound.setMusicVolume(S().musicVol); S().save(); });
  document.getElementById('set-sfx').addEventListener('input',e=>{ S().sfxVol=e.target.value/100; document.getElementById('lbl-sfx').textContent=e.target.value+'%'; if(window.Sound){ Sound.setSfxVolume(S().sfxVol); Sound.click(); } S().save(); });
  document.getElementById('set-bright').addEventListener('input',e=>{ S().brightness=e.target.value/100; document.getElementById('lbl-bright').textContent=e.target.value+'%'; if(window.__stealth&&__stealth.world) __stealth.world.setBrightness(S().brightness); S().save(); });
  document.getElementById('set-sens').addEventListener('input',e=>{ S().camSensitivity=e.target.value/100; document.getElementById('lbl-sens').textContent=e.target.value+'%'; if(window.__stealth&&__stealth.rig) __stealth.rig.sens=S().camSensitivity; S().save(); });
  document.querySelectorAll('.diff-btn').forEach(b=>b.addEventListener('click',()=>{ S().difficulty=b.dataset.diff; UI.syncSettingsUI(); if(window.__stealth&&__stealth.applyDifficulty) __stealth.applyDifficulty(); S().save(); }));
  document.getElementById('set-motion').addEventListener('change',e=>{ S().reduceMotion=e.target.checked; S().save(); });

  window.addEventListener('keydown',(e)=>{
    const k=e.key.toLowerCase();
    if(UI.dialogueOpen() && (e.key==='Enter'||e.key===' ')){ e.preventDefault(); UI._dadvance(); return; }
    if(e.key==='Escape'){ e.preventDefault(); UI.handleEscape(); return; }
    if(!window.__stealth || __stealth.uiPaused) return;
    if(k==='f') __stealth.openForge();
    else if(k==='b') __stealth.openMoat();
    else if(k==='h') UI.openHelp();
    else if(k==='m') UI.toggleMute();
  });

  const unlock=()=>{ if(window.Sound){ Sound.resume(); Sound.startAmbient(); } window.removeEventListener('pointerdown',unlock); window.removeEventListener('keydown',unlock); };
  window.addEventListener('pointerdown',unlock); window.addEventListener('keydown',unlock);
});
