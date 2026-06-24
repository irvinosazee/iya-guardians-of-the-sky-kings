/* ============================================================
 * Input.js — keyboard state -> intent vector.
 * W/Up = forward (into screen), S/Down = back, A/D = strafe.
 * Returns {x, z} screen-relative; the game rotates it by the
 * camera yaw to get world movement.
 * ============================================================ */
class Input {
  constructor(){
    this.keys = {};
    this._onDown = (e) => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;
    };
    this._onUp = (e) => { this.keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', this._onDown);
    window.addEventListener('keyup', this._onUp);
  }

  down(...names){ return names.some(n => this.keys[n]); }

  // screen-relative intent: forward is -z, right is +x
  intent(){
    let x = 0, z = 0;
    if(this.down('w','arrowup'))    z -= 1;
    if(this.down('s','arrowdown'))  z += 1;
    if(this.down('a','arrowleft'))  x -= 1;
    if(this.down('d','arrowright')) x += 1;
    const len = Math.hypot(x, z);
    if(len > 0){ x /= len; z /= len; }
    return { x, z, active: len > 0 };
  }

  destroy(){
    window.removeEventListener('keydown', this._onDown);
    window.removeEventListener('keyup', this._onUp);
  }
}
window.Input = Input;
