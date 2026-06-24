/* ============================================================
 * CameraRig.js — third-person follow camera.
 * Floats behind/above the target, lerps smoothly, looks slightly
 * ahead of the target in its facing direction.
 * ============================================================ */
class CameraRig {
  constructor(camera, target){
    this.camera = camera;
    this.target = target;             // THREE.Object3D to follow
    this.height = 9;
    this.distance = 11;
    this.lookAhead = 3;
    this.posLerp = 0.08;
    this.lookLerp = 0.12;
    this._look = new THREE.Vector3();
    this._desired = new THREE.Vector3();
    this.facing = 0;                  // target's heading (radians, on XZ)

    // snap behind target initially
    this._desired.set(target.position.x, this.height, target.position.z + this.distance);
    this.camera.position.copy(this._desired);
    this._look.copy(target.position);
  }

  setFacing(rad){ this.facing = rad; }

  update(){
    const t = this.target.position;
    // camera sits behind the heading direction
    const bx = Math.cos(this.facing), bz = Math.sin(this.facing);
    this._desired.set(
      t.x - bx * this.distance,
      this.height,
      t.z - bz * this.distance
    );
    this.camera.position.lerp(this._desired, this.posLerp);

    const lookTarget = new THREE.Vector3(
      t.x + bx * this.lookAhead, 1.2, t.z + bz * this.lookAhead);
    this._look.lerp(lookTarget, this.lookLerp);
    this.camera.lookAt(this._look);
  }
}
window.CameraRig = CameraRig;
