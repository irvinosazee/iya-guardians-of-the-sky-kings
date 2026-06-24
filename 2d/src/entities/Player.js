/* ============================================================
 * Player.js — Adesua. Movement, stealth state, shadow + bob.
 * ============================================================ */
class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y){
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.body.setSize(20, 20).setOffset(6, 6);
    this.setDepth(6);

    this.shadow = scene.add.image(x, y + 10, 'shadow').setDepth(5).setAlpha(0.5);

    this.baseSpeed = 158;
    this.moving = false;
    this.hidden = false;
    this._bob = 0;
  }

  control(cursors, keys, inMud, canDash){
    let vx = 0, vy = 0;
    if(cursors.left.isDown  || keys.A.isDown) vx = -1;
    else if(cursors.right.isDown || keys.D.isDown) vx = 1;
    if(cursors.up.isDown    || keys.W.isDown) vy = -1;
    else if(cursors.down.isDown  || keys.S.isDown) vy = 1;

    const len = Math.hypot(vx, vy) || 1; vx /= len; vy /= len;
    let speed = this.baseSpeed;
    if(inMud && !canDash) speed *= 0.42;

    this.setVelocity(vx * speed, vy * speed);
    this.moving = (vx !== 0 || vy !== 0);

    if(this.moving){
      const target = Math.atan2(vy, vx);
      this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, target, 0.35); // smooth turn
      this._bob += 0.3;
    } else {
      this._bob += 0.05;
    }
  }

  sync(){
    // gentle walk/idle bob + keep shadow under feet
    const bob = Math.sin(this._bob) * (this.moving ? 1.6 : 0.8);
    this.setScale(1, 1 + bob * 0.02);
    this.shadow.setPosition(this.x, this.y + 11).setAlpha(this.hidden ? 0.25 : 0.5);
  }

  freeze(){ this.setVelocity(0, 0); this.moving = false; }

  destroy(fromScene){
    if(this.shadow) this.shadow.destroy();
    super.destroy(fromScene);
  }
}
window.Player = Player;
