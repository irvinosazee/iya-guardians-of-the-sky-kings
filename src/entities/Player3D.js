/* ============================================================
 * Player3D.js — Adesua in 3D. Camera-relative movement on the
 * XZ plane with circle-vs-AABB wall collision and a walk bob.
 * ============================================================ */
class Player3D {
  constructor(world){
    this.mesh = MeshFactory.adesua();
    this.mesh.position.set(0, 0, 0);
    world.scene.add(this.mesh);

    this.radius = 0.42;
    this.baseSpeed = 6.2;          // world units / sec
    this.heading = 0;              // facing angle (radians, XZ)
    this.moving = false;
    this.hidden = false;
    this.stance = 'stand';         // 'stand' | 'crouch' | 'sprint'
    this.noiseFactor = 1;          // multiplies hearing radius
    this._bob = 0; this._scaleY = 1;
  }

  get position(){ return this.mesh.position; }

  // worldDir: world-space {x,z}; walls: AABBs; mods: {sprint, crouch}
  update(worldDir, dt, walls, inMud, canDash, mods){
    mods = mods || {};
    this.stance = mods.crouch ? 'crouch' : (mods.sprint && worldDir.active ? 'sprint' : 'stand');
    const stanceSpeed = this.stance === 'crouch' ? 0.5 : this.stance === 'sprint' ? 1.55 : 1;
    this.noiseFactor = this.stance === 'crouch' ? 0.4 : this.stance === 'sprint' ? 1.9 : 1;

    let speed = this.baseSpeed * stanceSpeed * (inMud && !canDash ? 0.42 : 1);
    // analog: joystick lean -> creep, full push -> run (keyboard reports mag 1)
    const m = (worldDir.mag != null) ? worldDir.mag : 1;
    if(worldDir.active) speed *= Math.max(0.42, Math.pow(m, 1.25));
    this.moving = worldDir.active;

    // crouch lowers the silhouette
    const targetScaleY = this.stance === 'crouch' ? 0.7 : 1;
    this._scaleY += (targetScaleY - this._scaleY) * 0.2;
    this.mesh.scale.y = this._scaleY;

    if(this.moving){
      this.heading = Math.atan2(worldDir.z, worldDir.x);
      const nx = this.position.x + worldDir.x * speed * dt;
      const nz = this.position.z + worldDir.z * speed * dt;
      // resolve axes independently so we slide along walls
      if(!this._blocked(nx, this.position.z, walls)) this.position.x = nx;
      if(!this._blocked(this.position.x, nz, walls)) this.position.z = nz;
      // smooth turn toward heading (mesh faces +X, ground yaw = -heading)
      this.mesh.rotation.y = this._turn(this.mesh.rotation.y, -this.heading, 0.3);
      this._bob += dt * 12;
    } else {
      this._bob += dt * 2;
    }

    const body = this.mesh.userData.body;
    if(body) body.position.y = 0.75 + Math.abs(Math.sin(this._bob)) * (this.moving ? 0.07 : 0.02);
    this.mesh.userData.head && (this.mesh.userData.head.position.y = 1.32 + Math.sin(this._bob)*0.01);
    // arm swing
    const swing = Math.sin(this._bob) * (this.moving ? 0.7 : 0.05);
    if(this.mesh.userData.armL) this.mesh.userData.armL.rotation.z = swing;
    if(this.mesh.userData.armR) this.mesh.userData.armR.rotation.z = -swing;
  }

  _blocked(x, z, walls){
    for(const w of walls){
      const cx = Math.max(w.minX, Math.min(x, w.maxX));
      const cz = Math.max(w.minZ, Math.min(z, w.maxZ));
      if((x-cx)*(x-cx) + (z-cz)*(z-cz) < this.radius*this.radius) return true;
    }
    return false;
  }

  _turn(cur, target, t){
    let d = target - cur;
    while(d > Math.PI) d -= Math.PI*2;
    while(d < -Math.PI) d += Math.PI*2;
    return cur + d * t;
  }

  setPosition(x, z){ this.position.set(x, 0, z); }
}
window.Player3D = Player3D;
