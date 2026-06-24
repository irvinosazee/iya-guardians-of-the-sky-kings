/* ============================================================
 * Input.js — keyboard + mouse + touch for the orbit game.
 *   • WASD / virtual stick -> movement intent (camera-relative)
 *   • Arrows -> camera rotate; mouse/1-finger drag -> orbit
 *   • Wheel / 2-finger pinch -> zoom
 * Touch state is written by TouchControls and merged here so the
 * rest of the game reads a single, input-agnostic interface.
 * ============================================================ */
class Input {
  constructor(canvas){
    this.canvas = canvas;
    this.keys = {};
    this.drag = { active:false, dx:0, dy:0, lx:0, ly:0 };
    this.zoomDelta = 0;
    this._throw = false;

    // touch state (written by TouchControls)
    this.touchMove = { x:0, z:0, active:false };
    this.touchBtn  = { sprint:false, crouch:false };

    this._ptrs = new Map();      // active canvas touch pointers
    this._pinch = null;

    this._onDown = (e) => { const k = e.key.toLowerCase(); this.keys[k] = true; if(k === 'e') this._throw = true; };
    this._onUp   = (e) => { this.keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', this._onDown);
    window.addEventListener('keyup', this._onUp);

    this._onPDown = (e) => {
      if(e.pointerType === 'mouse'){
        if(e.button !== 0 && e.button !== 2) return;
        this.drag.active = true; this.drag.lx = e.clientX; this.drag.ly = e.clientY;
        return;
      }
      // touch on the canvas = look / pinch
      this._ptrs.set(e.pointerId, { x:e.clientX, y:e.clientY });
      if(this._ptrs.size === 2){
        const [a,b] = [...this._ptrs.values()];
        this._pinch = Math.hypot(a.x-b.x, a.y-b.y);
      }
    };
    this._onPMove = (e) => {
      if(e.pointerType === 'mouse'){
        if(!this.drag.active) return;
        this.drag.dx += e.clientX - this.drag.lx; this.drag.dy += e.clientY - this.drag.ly;
        this.drag.lx = e.clientX; this.drag.ly = e.clientY;
        return;
      }
      if(!this._ptrs.has(e.pointerId)) return;
      const prev = this._ptrs.get(e.pointerId);
      const ndx = e.clientX - prev.x, ndy = e.clientY - prev.y;
      this._ptrs.set(e.pointerId, { x:e.clientX, y:e.clientY });
      if(this._ptrs.size === 1){
        this.drag.dx += ndx; this.drag.dy += ndy;            // 1-finger look
      } else if(this._ptrs.size === 2 && this._pinch != null){
        const [a,b] = [...this._ptrs.values()];
        const d = Math.hypot(a.x-b.x, a.y-b.y);
        this.zoomDelta += (this._pinch - d) * 0.03;          // pinch zoom
        this._pinch = d;
      }
    };
    this._onPUp = (e) => {
      if(e.pointerType === 'mouse'){ this.drag.active = false; return; }
      this._ptrs.delete(e.pointerId);
      if(this._ptrs.size < 2) this._pinch = null;
    };
    this._onWheel = (e) => { this.zoomDelta += Math.sign(e.deltaY); e.preventDefault(); };
    this._onCtx = (e) => e.preventDefault();

    canvas.addEventListener('pointerdown', this._onPDown);
    window.addEventListener('pointermove', this._onPMove);
    window.addEventListener('pointerup', this._onPUp);
    window.addEventListener('pointercancel', this._onPUp);
    canvas.addEventListener('wheel', this._onWheel, { passive:false });
    canvas.addEventListener('contextmenu', this._onCtx);
  }

  down(...names){ return names.some(n => this.keys[n]); }

  // movement intent — virtual stick takes priority, else WASD
  intent(){
    if(this.touchMove.active){
      const { x, z } = this.touchMove;
      const len = Math.hypot(x, z) || 1;
      return { x:x/len, z:z/len, active:true, mag: Math.min(1, Math.hypot(x,z)) };
    }
    let x = 0, z = 0;
    if(this.down('w')) z -= 1;
    if(this.down('s')) z += 1;
    if(this.down('a')) x -= 1;
    if(this.down('d')) x += 1;
    const len = Math.hypot(x, z);
    if(len > 0){ x /= len; z /= len; }
    return { x, z, active: len > 0, mag: 1 };
  }

  modifiers(){
    return {
      sprint: this.down('shift') || this.touchBtn.sprint,
      crouch: this.down('c') || this.touchBtn.crouch,
    };
  }

  consumeThrow(){ const t = this._throw; this._throw = false; return t; }

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
    window.removeEventListener('pointercancel', this._onPUp);
    this.canvas.removeEventListener('wheel', this._onWheel);
    this.canvas.removeEventListener('contextmenu', this._onCtx);
  }
}
window.Input = Input;
