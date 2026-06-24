/* ============================================================
 * Guard3D.js — patrolling leopard-cultist in 3D.
 *   • Waypoint patrol + chase on the XZ plane
 *   • Flat ground vision sector (recolors by state)
 *   • Raycast line-of-sight vs wall meshes (THREE.Raycaster)
 *   • Hearing radius; FSM calm -> suspicious -> alert
 * ============================================================ */
class Guard3D {
  constructor(world, route){
    this.world = world;
    this.mesh = MeshFactory.guard();
    this.waypoints = route.slice();
    this.mesh.position.set(this.waypoints[0].x, 0, this.waypoints[0].y !== undefined ? 0 : 0);
    this.mesh.position.x = this.waypoints[0].x;
    this.mesh.position.z = this.waypoints[0].z;
    world.scene.add(this.mesh);

    this.wpIndex = Math.min(1, this.waypoints.length - 1);
    this.dir = 1;

    this.speed = 3.4; this.chaseSpeed = 5.4;
    this.visionRadius = 10; this.fov = Phaser_DegToRad(64);
    this.hearingRadius = 6;
    this.baseSpeed = this.speed; this.baseChase = this.chaseSpeed;
    this.baseVision = this.visionRadius; this.baseFov = this.fov;

    this.state = 'calm'; this.facing = 0;
    this.investigate = null; this.investTimer = 0; this._prevState = 'calm';
    this.lastSeenPos = null;

    this._buildCone();
    this.bubble = MeshFactory.bubbleSprite();
    this.bubble.position.set(0, 2.2, 0); this.mesh.add(this.bubble);

    this._ray = new THREE.Raycaster();
    this._origin = new THREE.Vector3();
    this._dirv = new THREE.Vector3();
  }

  get position(){ return this.mesh.position; }

  _buildCone(){
    const seg = 28;
    const geo = new THREE.CircleGeometry(this.visionRadius, seg, -this.fov/2, this.fov);
    geo.rotateX(-Math.PI/2);                       // lay flat on the ground
    this.coneMat = new THREE.MeshBasicMaterial({ color:0x40e070, transparent:true, opacity:0.16, side:THREE.DoubleSide, depthWrite:false });
    this.cone = new THREE.Mesh(geo, this.coneMat);
    this.cone.position.y = 0.06;
    this.world.scene.add(this.cone);
  }

  _setConeColor(c){ this.coneMat.color.setHex(c); }

  update(dt){
    if(this.state === 'alert' && this.investigate){
      this._moveTo(this.investigate, this.chaseSpeed, dt);
      if(this._dist(this.investigate) < 0.4){ this.investigate = null; this.state = 'suspicious'; this.investTimer = 1.6; }
    } else if(this.state === 'suspicious'){
      this.facing += dt * 2.2;
      this.investTimer -= dt;
      if(this.investTimer <= 0) this.state = 'calm';
    } else {
      this._patrol(dt);
    }
    this._sync(dt);
  }

  _patrol(dt){
    if(this.waypoints.length < 2) return;
    const wp = this.waypoints[this.wpIndex];
    this._moveTo(wp, this.speed, dt);
    if(this._dist(wp) < 0.3){
      this.wpIndex += this.dir;
      if(this.wpIndex >= this.waypoints.length){ this.wpIndex = this.waypoints.length - 2; this.dir = -1; }
      else if(this.wpIndex < 0){ this.wpIndex = 1; this.dir = 1; }
    }
  }

  _moveTo(p, speed, dt){
    const dx = p.x - this.position.x, dz = p.z - this.position.z;
    const a = Math.atan2(dz, dx);
    this.facing = this._turn(this.facing, a, 0.18);
    this.position.x += Math.cos(a) * speed * dt;
    this.position.z += Math.sin(a) * speed * dt;
  }

  _dist(p){ return Math.hypot(p.x - this.position.x, p.z - this.position.z); }

  _turn(cur, target, t){
    let d = target - cur;
    while(d > Math.PI) d -= Math.PI*2;
    while(d < -Math.PI) d += Math.PI*2;
    return cur + d * t;
  }

  _sync(dt){
    this.mesh.rotation.y = -this.facing;
    this.cone.position.set(this.position.x, 0.06, this.position.z);
    this.cone.rotation.y = -this.facing;
    const col = this.state === 'alert' ? 0xff3030 : this.state === 'suspicious' ? 0xf0c040 : 0x40e070;
    this._setConeColor(col);

    if(this.state !== this._prevState){
      const ch = this.state === 'alert' ? '!' : this.state === 'suspicious' ? '?' : '';
      this.bubble.userData.draw(ch, this.state === 'alert' ? '#ff4040' : '#f0c040');
      this.bubble.visible = !!ch;
      if(this.state === 'alert' && window.Sound) Sound.alert();
    }
    this._prevState = this.state;
  }

  // returns { seen, heard }
  perceive(player, wallMeshes, hidden, noiseMult){
    const p = player.position;
    const dx = p.x - this.position.x, dz = p.z - this.position.z;
    const d = Math.hypot(dx, dz);
    const heard = player.moving && d <= this.hearingRadius * noiseMult;
    if(hidden || d > this.visionRadius) return { seen:false, heard };

    const ang = Math.atan2(dz, dx);
    let diff = ang - this.facing;
    while(diff > Math.PI) diff -= Math.PI*2;
    while(diff < -Math.PI) diff += Math.PI*2;
    if(Math.abs(diff) > this.fov/2) return { seen:false, heard };

    // raycast LOS at torso height
    this._origin.set(this.position.x, 1.0, this.position.z);
    this._dirv.set(dx, 0, dz).normalize();
    this._ray.set(this._origin, this._dirv);
    this._ray.far = d;
    const hits = this._ray.intersectObjects(wallMeshes, false);
    if(hits.length && hits[0].distance < d - 0.3) return { seen:false, heard };
    return { seen:true, heard };
  }

  applyDifficulty(d){
    this.visionRadius = this.baseVision * d.vision;
    this.fov = this.baseFov * d.fov;
    this.speed = this.baseSpeed * d.speed;
    this.chaseSpeed = this.baseChase * d.speed;
    // rebuild cone geometry for new radius/fov
    this.cone.geometry.dispose();
    const geo = new THREE.CircleGeometry(this.visionRadius, 28, -this.fov/2, this.fov);
    geo.rotateX(-Math.PI/2); this.cone.geometry = geo;
  }

  destroy(){
    this.world.scene.remove(this.mesh);
    this.world.scene.remove(this.cone);
  }
}
// tiny standalone helper (Phaser not loaded in 3D build)
function Phaser_DegToRad(d){ return d * Math.PI / 180; }
window.Guard3D = Guard3D;
