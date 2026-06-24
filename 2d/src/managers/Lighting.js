/* ============================================================
 * Lighting.js — night-time darkness + torch lights.
 * Fills a RenderTexture with darkness each frame, then "erases"
 * soft radial holes at each light source (player torch, braziers,
 * the gate) to create dramatic pools of warm light.
 * Fails safe: if anything throws it disables itself silently.
 * ============================================================ */
class Lighting {
  constructor(scene, w, h, opts={}){
    this.scene = scene;
    this.enabled = false;
    this.lights = [];
    this.color = opts.color != null ? opts.color : 0x06040c;
    this.darkness = opts.darkness != null ? opts.darkness : 0.82;
    try {
      this.rt = scene.add.renderTexture(0, 0, w, h).setOrigin(0).setDepth(3);
      this.enabled = true;
    } catch(e){ console.warn('Lighting disabled:', e); }
  }

  addLight(x, y, radius, flicker=0){
    if(!this.enabled) return null;
    const img = this.scene.make.image({ key: 'light', add: false }).setOrigin(0.5);
    const light = { img, x, y, baseR: radius, flicker, phase: x*0.13 + y*0.07 };
    this.lights.push(light);
    return light;
  }

  move(light, x, y){ if(light){ light.x = x; light.y = y; } }

  update(time){
    if(!this.enabled) return;
    try {
      this.rt.clear();
      this.rt.fill(this.color, this.darkness);
      for(const l of this.lights){
        let r = l.baseR;
        if(l.flicker){
          r += Math.sin(time/110 + l.phase) * l.flicker
             + Math.sin(time/37  + l.phase*2) * l.flicker * 0.45;
        }
        l.img.setPosition(l.x, l.y).setDisplaySize(r*2, r*2);
        this.rt.erase(l.img);
      }
    } catch(e){
      this.enabled = false;
      if(this.rt) this.rt.destroy();
    }
  }
}
window.Lighting = Lighting;
