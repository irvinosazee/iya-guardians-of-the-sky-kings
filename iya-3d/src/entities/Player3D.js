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
    this._bob = 0;
  }

  get position(){ return this.mesh.position; }

  // worldDir: {x,z} already rotated into world space; walls: array of {minX,maxX,minZ,maxZ}
  update(worldDir, dt, walls, inMud, canDash){
    let speed = this.baseSpeed * (inMud && !canDash ? 0.42 : 1);
    this.moving = worldDir.active;

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
