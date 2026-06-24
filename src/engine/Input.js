/* ============================================================
 * Input.js — keyboard + mouse for a third-person orbit game.
 *   • WASD  -> movement intent (camera-relative)
 *   • Arrows-> camera rotate (yaw/pitch)
 *   • Mouse drag on the canvas -> orbit camera
 *   • Wheel -> zoom
 * Drag only starts on the canvas, so HUD buttons stay clickable.
 * ============================================================ */
class Input {
  constructor(canvas){
    this.canvas = canvas;
    this.keys = {};
    this.drag = { active:false, dx:0, dy:0, lx:0, ly:0 };
    this.zoomDelta = 0;

    this._throw = false;
    this._onDown = (e) => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      if(k === 'e') this._throw = true;
    };
    this._onUp   = (e) => { this.keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', this._onDown);
    window.addEventListener('keyup', this._onUp);

    this._onPDown = (e) => {
      if(e.button !== 0 && e.button !== 2) return;     // left or right drag
      this.drag.active = true; this.drag.lx = e.clientX; this.drag.ly = e.clientY;
    };
    this._onPMove = (e) => {
      if(!this.drag.active) return;
      this.drag.dx += e.clientX - this.drag.lx;
      this.drag.dy += e.clientY - this.drag.ly;
      this.drag.lx = e.clientX; this.drag.ly = e.clientY;
    };
    this._onPUp = () => { this.drag.active = false; };
    this._onWheel = (e) => { this.zoomDelta += Math.sign(e.deltaY); e.preventDefault(); };
    this._onCtx = (e) => e.preventDefault();   // allow right-drag without context menu

    canvas.addEventListener('pointerdown', this._onPDown);
    window.addEventListener('pointermove', this._onPMove);
    window.addEventListener('pointerup', this._onPUp);
    canvas.addEventListener('wheel', this._onWheel, { passive:false });
    canvas.addEventListener('contextmenu', this._onCtx);
  }

  down(...names){ return names.some(n => this.keys[n]); }

  // WASD only — screen-relative (forward = -z, right = +x)
  intent(){
    let x = 0, z = 0;
    if(this.down('w')) z -= 1;
    if(this.down('s')) z += 1;
    if(this.down('a')) x -= 1;
    if(this.down('d')) x += 1;
    const len = Math.hypot(x, z);
    if(len > 0){ x /= len; z /= len; }
    return { x, z, active: len > 0 };
  }

  // movement modifiers
  modifiers(){
    return {
      sprint: this.down('shift'),
      crouch: this.down('c'),     // hold C (Ctrl avoided — Ctrl+W closes the tab)
    };
  }

  // consume a one-shot throw press (E)
  consumeThrow(){ const t = this._throw; this._throw = false; return t; }

  // arrows -> camera. yaw: left/right, pitch: up/down
  camIntent(){
    let yaw = 0, pitch = 0;
    if(this.down('arrowleft'))  yaw -= 1;
    if(this.down('arrowright')) yaw += 1;
    if(this.down('arrowup'))    pitch += 1;
    if(this.down('arrowdown'))  pitch -= 1;
    return { yaw, pitch };
  }

  consumeMouse(){ const d = { dx:this.drag.dx, dy:this.drag.dy }; this.drag.dx = 0; this.drag.dy = 0; return d; }
  consumeZoom(){ const z = this.zoomDelta; this.zoomDelta = 0; return z; }

  destroy(){
    window.removeEventListener('keydown', this._onDown);
    window.removeEventListener('keyup', this._onUp);
    this.canvas.removeEventListener('pointerdown', this._onPDown);
    window.removeEventListener('pointermove', this._onPMove);
    window.removeEventListener('pointerup', this._onPUp);
    this.canvas.removeEventListener('wheel', this._onWheel);
    this.canvas.removeEventListener('contextmenu', this._onCtx);
  }
}
window.Input = Input;
