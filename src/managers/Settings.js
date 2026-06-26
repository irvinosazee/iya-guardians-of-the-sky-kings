/* ============================================================
 * Settings.js — player preferences (audio, brightness,
 * difficulty, accessibility) + one-time-seen flags.
 * Persisted synchronously to localStorage so it applies at boot.
 * ============================================================ */
const Settings = {
  musicVol: 0.5,
  sfxVol: 0.7,
  brightness: 0.5,          // 0 = darkest, 1 = brightest
  difficulty: 'normal',     // 'easy' | 'normal' | 'hard'
  reduceMotion: false,
  camSensitivity: 1,        // mouse/arrow camera sensitivity multiplier
  camZoom: 9,               // remembered orbit distance
  haptics: true,            // mobile vibration feedback

  // one-time onboarding flags
  tutorialDone: false,
  forgeSeen: false,
  moatSeen: false,

  KEY: 'iya-settings',

  load(){
    try {
      const raw = localStorage.getItem(this.KEY);
      if(raw) Object.assign(this, JSON.parse(raw));
    } catch(e){}
    return this;
  },
  save(){
    try {
      localStorage.setItem(this.KEY, JSON.stringify({
        musicVol:this.musicVol, sfxVol:this.sfxVol, brightness:this.brightness,
        difficulty:this.difficulty, reduceMotion:this.reduceMotion,
        camSensitivity:this.camSensitivity, camZoom:this.camZoom, haptics:this.haptics,
        tutorialDone:this.tutorialDone, forgeSeen:this.forgeSeen, moatSeen:this.moatSeen,
      }));
    } catch(e){}
  },

  // push audio prefs into the sound engine
  applyAudio(){
    if(window.Sound){ Sound.setMusicVolume(this.musicVol); Sound.setSfxVolume(this.sfxVol); }
  },

  // night darkness derived from brightness (higher brightness = less dark)
  darkness(){ return 0.9 - this.brightness * 0.32; },   // 0.58 .. 0.9

  // multipliers applied to guard senses / detection
  difficultyParams(){
    switch(this.difficulty){
      case 'easy': return { vision:0.85, fov:0.85, speed:0.85, detect:0.78 };
      case 'hard': return { vision:1.18, fov:1.12, speed:1.18, detect:1.3 };
      default:     return { vision:1, fov:1, speed:1, detect:1 };
    }
  },
};
Settings.load();
window.Settings = Settings;
