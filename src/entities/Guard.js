/* ============================================================
 * Guard.js — Leopard-cultist patrol AI.
 *   • Waypoint patrolling + chase
 *   • Vision arc (radius R, FOV alpha) + raycast line-of-sight
 *   • Hearing radius (a moving player makes noise)
 *   • FSM: calm -> suspicious -> alert, with "!"/"?" bubbles
 * ============================================================ */
class Guard extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, tileWaypoints, T){
    const start = tileWaypoints[0];
    super(scene, start.x*T + T/2, start.y*T + T/2, 'guard');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(6);

    this.shadow = scene.add.image(this.x, this.y + 10, 'shadow').setDepth(5).setAlpha(0.5);
    this.bubble = scene.add.text(this.x, this.y - 20, '', {
      fontFamily:'Georgia', fontSize:'20px', fontStyle:'bold', color:'#ffffff', resolution:window.DPR||2
    }).setOrigin(0.5).setDepth(8).setShadow(0,2,'#000',4,false,true);

    this.T = T;
    this.waypoints = tileWaypoints.map(w => ({ x: w.x*T + T/2, y: w.y*T + T/2 }));
    this.wpIndex = Math.min(1, this.waypoints.length - 1);
    this.dir = 1;

    this.speed = 72; this.chaseSpeed = 116;
    this.visionRadius = 158; this.fov = Phaser.Math.DegToRad(64);
    this.hearingRadius = 95;

    this.state = 'calm';
    this.facing = 0;
    this.investigate = null;
    this.investTimer = 0;
    this._prevState = 'calm';
  }

  update(dt){
    if(this.state === 'alert' && this.investigate){
      this.moveTo(this.investigate, this.chaseSpeed);
      if(Phaser.Math.Distance.Between(this.x, this.y, this.investigate.x, this.investigate.y) < 8){
        this.investigate = null; this.state = 'suspicious'; this.investTimer = 1600;
      }
    } else if(this.state === 'suspicious'){
      this.setVelocity(0, 0);
      this.facing += 0.045;
      this.investTimer -= dt;
      if(this.investTimer <= 0) this.state = 'calm';
    } else {
      this.patrol();
    }
    this.sync();
  }

  patrol(){
    if(this.waypoints.length < 2){ this.setVelocity(0,0); return; }
    const wp = this.waypoints[this.wpIndex];
    this.moveTo(wp, this.speed);
    if(Phaser.Math.Distance.Between(this.x, this.y, wp.x, wp.y) < 5){
      this.wpIndex += this.dir;
      if(this.wpIndex >= this.waypoints.length){ this.wpIndex = this.waypoints.length - 2; this.dir = -1; }
      else if(this.wpIndex < 0){ this.wpIndex = 1; this.dir = 1; }
    }
  }

  moveTo(p, speed){
    const a = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
    this.setVelocity(Math.cos(a)*speed, Math.sin(a)*speed);
    this.facing = Phaser.Math.Angle.RotateTo(this.facing, a, 0.25);
    this.rotation = this.facing;
  }

  sync(){
    this.shadow.setPosition(this.x, this.y + 11);
    this.bubble.setPosition(this.x, this.y - 20);
    const want = this.state === 'alert' ? '!' : this.state === 'suspicious' ? '?' : '';
    if(want !== this.bubble.text){
      this.bubble.setText(want);
      this.bubble.setColor(this.state === 'alert' ? '#ff4040' : '#f0c040');
      if(want){ this.scene.tweens.add({ targets:this.bubble, scale:{ from:1.8, to:1 }, duration:200 }); }
    }
    if(this.state === 'alert' && this.state !== this._prevState && window.Sound) Sound.alert();
    this._prevState = this.state;
  }

  perceive(player, wallRects, hidden, noiseMult){
    const d = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const heard = player.moving && d <= this.hearingRadius * noiseMult;
    if(hidden || d > this.visionRadius) return { seen:false, heard };

    const ang  = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const diff = Math.abs(Phaser.Math.Angle.Wrap(ang - this.facing));
    if(diff > this.fov / 2) return { seen:false, heard };

    const line = new Phaser.Geom.Line(this.x, this.y, player.x, player.y);
    for(const r of wallRects){
      if(Phaser.Geom.Intersects.LineToRectangle(line, r)) return { seen:false, heard };
    }
    return { seen:true, heard };
  }

  drawCone(g){
    const base = this.state === 'alert' ? 0xff3030 : this.state === 'suspicious' ? 0xf0c040 : 0x40e070;
    // two layers fake a soft gradient
    g.fillStyle(base, 0.10);
    g.slice(this.x, this.y, this.visionRadius, this.facing - this.fov/2, this.facing + this.fov/2, false);
    g.fillPath();
    g.fillStyle(base, 0.16);
    g.slice(this.x, this.y, this.visionRadius * 0.6, this.facing - this.fov/2, this.facing + this.fov/2, false);
    g.fillPath();
    g.lineStyle(1, base, 0.4);
    g.beginPath();
    g.arc(this.x, this.y, this.visionRadius, this.facing - this.fov/2, this.facing + this.fov/2, false);
    g.strokePath();
  }

  destroy(fromScene){
    if(this.shadow) this.shadow.destroy();
    if(this.bubble) this.bubble.destroy();
    super.destroy(fromScene);
  }
}
window.Guard = Guard;
