/* ============================================================
 * OrbitCameraRig.js — Fortnite/Genshin-style orbit camera.
 * Holds (yaw, pitch, distance) around a chest-height focus on the
 * target. Mouse/arrows steer it; movement is camera-relative.
 *   • damped follow (focus, yaw, pitch, distance all eased)
 *   • wall-aware zoom (pulls in when a wall blocks the view)
 *   • optional walk bob (respects reduce-motion)
 * ============================================================ */
class OrbitCameraRig {
  constructor(camera, target){
    this.camera = camera;
    this.target = target;

    this.yaw = Math.PI / 2;          // ground-forward = (cos yaw, sin yaw)
    this.pitch = 0.28;               // radians above horizon — low, so you see AHEAD
    this.dist = 9;
    this.minDist = 4.5; this.maxDist = 16;
    this.minPitch = 0.06; this.maxPitch = 1.15;   // can't quite top-down or ground-level
    this.focusHeight = 1.5;
    this.lookAhead = 2.4;            // aim slightly ahead of Adesua toward the horizon
    this.sens = 1;                   // multiplied by Settings sensitivity

    // damped (display) values
    this.dyaw = this.yaw; this.dpitch = this.pitch; this.ddist = this.dist;
    this.focus = new THREE.Vector3(target.position.x, this.focusHeight, target.position.z);
    this._bob = 0; this._bobAmt = 0;

    this._ray = new THREE.Raycaster();
    this._from = new THREE.Vector3();
    this._dir = new THREE.Vector3();
  }

  addYaw(d){ this.yaw += d; }
  addPitch(d){ this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch + d)); }
  zoom(d){ this.dist = Math.max(this.minDist, Math.min(this.maxDist, this.dist + d)); }
  forwardYaw(){ return this.dyaw; }    // use the smoothed yaw for movement basis

  _lerpAngle(a, b, t){
    let d = b - a;
    while(d > Math.PI) d -= Math.PI*2;
    while(d < -Math.PI) d += Math.PI*2;
    return a + d * t;
  }

  update(dt, wallMeshes, opts){
    opts = opts || {};
    // walk bob target
    const bobTarget = (opts.moving && !opts.reduceMotion) ? 1 : 0;
    this._bobAmt += (bobTarget - this._bobAmt) * 0.1;
    if(opts.moving && !opts.reduceMotion) this._bob += dt * 9;

    // damp orbit params
    this.dyaw = this._lerpAngle(this.dyaw, this.yaw, 0.2);
    this.dpitch += (this.pitch - this.dpitch) * 0.2;
    this.ddist += (this.dist - this.ddist) * 0.14;

    // damp focus toward the target's chest
    const tp = this.target.position;
    const bobY = Math.sin(this._bob) * 0.06 * this._bobAmt;
    this.focus.x += (tp.x - this.focus.x) * 0.18;
    this.focus.z += (tp.z - this.focus.z) * 0.18;
    this.focus.y += ((this.focusHeight + bobY) - this.focus.y) * 0.18;

    // desired camera position from spherical coords
    const hd = Math.cos(this.dpitch) * this.ddist;
    const vy = Math.sin(this.dpitch) * this.ddist;
    const fx = Math.cos(this.dyaw), fz = Math.sin(this.dyaw);
    let camX = this.focus.x - fx * hd;
    let camY = this.focus.y + vy;
    let camZ = this.focus.z - fz * hd;

    // wall-aware zoom: ray from focus toward the camera; if blocked, pull in
    if(wallMeshes && wallMeshes.length){
      this._from.copy(this.focus);
      this._dir.set(camX - this.focus.x, camY - this.focus.y, camZ - this.focus.z);
      const fullLen = this._dir.length();
      this._dir.normalize();
      this._ray.set(this._from, this._dir);
      this._ray.far = fullLen;
      const hits = this._ray.intersectObjects(wallMeshes, false);
      if(hits.length){
        const safe = Math.max(this.minDist * 0.5, hits[0].distance - 0.4);
        camX = this.focus.x + this._dir.x * safe;
        camY = this.focus.y + this._dir.y * safe;
        camZ = this.focus.z + this._dir.z * safe;
      }
    }

    this.camera.position.set(camX, camY, camZ);
    // look slightly ahead of and above the focus so the path ahead is visible
    this.camera.lookAt(
      this.focus.x + fx * this.lookAhead,
      this.focus.y + 0.35,
      this.focus.z + fz * this.lookAhead
    );
  }
}
window.OrbitCameraRig = OrbitCameraRig;
