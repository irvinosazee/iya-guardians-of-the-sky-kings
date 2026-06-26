/* ============================================================
 * Haptics.js — light vibration feedback on mobile.
 * No-ops on desktop, when unsupported, or when disabled in Settings.
 * ============================================================ */
const Haptics = {
  _ok(){
    return window.MOBILE
      && (window.Settings ? Settings.haptics : true)
      && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  },
  buzz(pattern){ try { if(this._ok()) navigator.vibrate(pattern); } catch(e){} },
  tap(){ this.buzz(8); },
  pickup(){ this.buzz(14); },
  craft(){ this.buzz(22); },
  spotted(){ this.buzz([0, 26, 30, 26]); },
  caught(){ this.buzz([0, 50, 40, 70]); },
};
window.Haptics = Haptics;
