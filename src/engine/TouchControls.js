/* ============================================================
 * TouchControls.js — virtual joystick + action buttons for
 * mobile. Writes into Input's touch state; the game stays
 * input-agnostic. Camera look/pinch is handled by Input on the
 * canvas; this module owns the stick (bottom-left) and the
 * action buttons (bottom-right).
 * ============================================================ */
class TouchControls {
  constructor(input){
    this.input = input;
    this.stick = document.getElementById('touch-stick');
    this.knob  = document.getElementById('touch-knob');
    this.crouchOn = false;
    this._stickId = null;
    this._cx = 0; this._cy = 0; this._radius = 56;
    this._bound = [];
    document.body.classList.add('touch');
    this._wireStick();
    this._wireButtons();
  }

  _wireStick(){
    const start = (e) => {
      const r = this.stick.getBoundingClientRect();
      this._cx = r.left + r.width/2; this._cy = r.top + r.height/2;
      this._radius = r.width/2;
      this._stickId = e.pointerId;
      try { this.stick.setPointerCapture(e.pointerId); } catch(_){}
      this._moveStick(e.clientX, e.clientY);
      e.preventDefault(); e.stopPropagation();
    };
    const move = (e) => {
      if(e.pointerId !== this._stickId) return;
      this._moveStick(e.clientX, e.clientY);
      e.preventDefault();
    };
    const end = (e) => {
      if(e.pointerId !== this._stickId) return;
      this._stickId = null;
      this.knob.style.transform = 'translate(-50%,-50%)';
      this.input.touchMove.x = 0; this.input.touchMove.z = 0; this.input.touchMove.active = false;
    };
    this.stick.addEventListener('pointerdown', start);
    this.stick.addEventListener('pointermove', move);
    this.stick.addEventListener('pointerup', end);
    this.stick.addEventListener('pointercancel', end);
    this._bound.push([this.stick,'pointerdown',start],[this.stick,'pointermove',move],[this.stick,'pointerup',end],[this.stick,'pointercancel',end]);
  }

  _moveStick(px, py){
    let dx = px - this._cx, dy = py - this._cy;
    const d = Math.hypot(dx, dy), max = this._radius;
    if(d > max){ dx = dx/d*max; dy = dy/d*max; }
    this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const nx = dx/max, nz = dy/max;        // screen: up(-y) = forward(-z)
    const raw = Math.hypot(nx, nz);
    const dead = 0.14;
    // remap past the deadzone to 0..1 so small pushes still register cleanly
    const mag = raw < dead ? 0 : (raw - dead) / (1 - dead);
    this.input.touchMove.x = nx;
    this.input.touchMove.z = nz;
    this.input.touchMove.mag = Math.min(1, mag);
    this.input.touchMove.active = mag > 0;
  }

  _btn(id, onDown, onUp){
    const el = document.getElementById(id);
    if(!el) return;
    const d = (e) => { onDown(el); e.preventDefault(); e.stopPropagation(); };
    const u = (e) => { if(onUp) onUp(el); e.preventDefault(); };
    el.addEventListener('pointerdown', d);
    el.addEventListener('pointerup', u);
    el.addEventListener('pointercancel', u);
    this._bound.push([el,'pointerdown',d],[el,'pointerup',u],[el,'pointercancel',u]);
  }

  _wireButtons(){
    this._btn('btn-sprint',
      (el) => { this.input.touchBtn.sprint = true; el.classList.add('held'); if(window.Haptics) Haptics.tap(); },
      (el) => { this.input.touchBtn.sprint = false; el.classList.remove('held'); });
    this._btn('btn-crouch', (el) => {
      this.crouchOn = !this.crouchOn;
      this.input.touchBtn.crouch = this.crouchOn;
      el.classList.toggle('held', this.crouchOn);
      if(window.Haptics) Haptics.tap();
    });
    this._btn('btn-throw', () => { this.input._throw = true; if(window.Haptics) Haptics.tap(); });
  }

  destroy(){
    this._bound.forEach(([el,ev,fn]) => el.removeEventListener(ev, fn));
    this._bound = [];
    document.body.classList.remove('touch');
  }
}
window.TouchControls = TouchControls;
