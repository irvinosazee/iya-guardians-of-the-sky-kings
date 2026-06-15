/* ============================================================
 * StealthScene.js — the core action/stealth loop, now with
 * night lighting, braziers, particles, vignette & juice.
 * ============================================================ */
const ACT_TITLES = {
  1: 'The Shadows of Igodomigodo',
  2: 'The Trench and the Totem',
  3: "The Queen Mother's Blessing",
};
const ACT_SPEAKER = { 2: 'Oba Ewuare', 3: 'Iyoba Idia' };
const ACT_DIALOGUE = {
  2: [
    "The plans are ours, Adesua. Now I decree the building of the Great Iya — the moat that will ring Benin.",
    "Every foot of earth we dig keeps the Ogiso curses at bay. Steal the corrupt chiefs' plans, and oversee the digging.",
  ],
  3: [
    "You have done well. But the final assault gathers in the dark, and steel alone will not hold it.",
    "Seek Iyoba Idia, the Queen Mother. Her juju — the echoes of the ancestors — may yet turn the night.",
  ],
};
function toRoman(n){ return ({1:'I',2:'II',3:'III'})[n] || String(n); }

class StealthScene extends Phaser.Scene {
  constructor(){ super('StealthScene'); }

  create(){
    this.T = 32;
    this.uiPaused = false;
    this.complete = false;
    this.objectiveTaken = false;
    this.detection = 0;
    this.wallRects = [];
    this._exitPulsing = false;
    this._lastStep = 0;

    this.RATE_SEEN  = 0.058;
    this.RATE_HEARD = 0.020;
    this.RATE_DECAY = 0.045;

    this.buildLevel();
    this.createPlayer();
    this.createGuards();
    this.createLightingAndFX();

    this.coneGfx = this.add.graphics().setDepth(4);
    this.setupInput();

    window.__stealth = this;
    UI.showHUD();
    UI.updateHUD();
    if(window.Sound){ Sound.resume(); Sound.startAmbient(); }

    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.showActCard();

    this.events.on('resume', () => { this.uiPaused = false; UI.updateHUD(); });
    this.events.once('shutdown', () => { if(window.__stealth === this) window.__stealth = null; });

    this.lastHudTick = 0;
  }

  /* ---------------- level ---------------- */
  buildLevel(){
    const T = this.T, W = 26, H = 18;
    this.gridW = W; this.gridH = H;
    this.physics.world.setBounds(0, 0, W*T, H*T);
    this.add.tileSprite(0, 0, W*T, H*T, 'floor').setOrigin(0).setDepth(-10);

    this.wallGroup = this.physics.add.staticGroup();
    this.pillarTiles = [];
    const addWall = (cx, cy) => {
      this.wallGroup.create(cx*T + T/2, cy*T + T/2, 'wall');
      this.wallRects.push(new Phaser.Geom.Rectangle(cx*T, cy*T, T, T));
    };
    for(let x=0; x<W; x++){ addWall(x,0); addWall(x,H-1); }
    for(let y=1; y<H-1; y++){ addWall(0,y); addWall(W-1,y); }

    const cells = [];
    const vline = (x,y0,y1) => { for(let y=y0;y<=y1;y++) cells.push([x,y]); };
    const hline = (y,x0,x1) => { for(let x=x0;x<=x1;x++) cells.push([x,y]); };
    vline(7, 1, 6); vline(15, 4, 12); hline(9, 9, 14);
    for(let x=18;x<=21;x++) for(let y=8;y<=10;y++) cells.push([x,y]);
    cells.forEach(([x,y]) => addWall(x,y));

    // decorative pillars on a few wall caps
    [[7,1],[15,4],[15,12],[9,9],[14,9]].forEach(([cx,cy]) =>
      this.add.image(cx*T + T/2, cy*T + T/2, 'pillar').setDepth(1));

    // collectibles
    this.items = this.physics.add.group();
    const place = (cx, cy, key, type) => {
      const s = this.items.create(cx*T + T/2, cy*T + T/2, key);
      s.itemType = type; s.setDepth(4);
      const base = 30 / s.width;                 // item art is 64px -> show ~30px
      s.setScale(base);
      if(s.body){ s.body.moves = false; s.body.setSize(40, 40); s.body.setOffset((s.width-40)/2, (s.height-40)/2); }
      // bob via scale (physics owns x/y on dynamic bodies, so don't tween position)
      this.tweens.add({ targets:s, scale:{ from:base*0.92, to:base*1.08 }, duration:850, yoyo:true, repeat:-1, ease:'Sine.inOut' });
      return s;
    };
    [[2,4],[20,14]].forEach(p => place(p[0],p[1],'coral','coral'));
    [[12,2],[3,14]].forEach(p => place(p[0],p[1],'bronze','bronze'));
    [[23,8],[10,15]].forEach(p => place(p[0],p[1],'mudfish','mudfish'));
    [[22,3],[4,8],[13,15],[18,2],[8,12]].forEach(p => place(p[0],p[1],'cowrie','cowrie'));
    place(12, 12, 'plan', 'plan');

    // bushes
    this.bushRects = [];
    [[10,2],[11,2],[2,9],[2,10],[20,5],[21,5],[5,15],[6,15]].forEach(([cx,cy]) => {
      this.add.image(cx*T + T/2, cy*T + T/2, 'bush').setDepth(5);
      this.bushRects.push(new Phaser.Geom.Rectangle(cx*T, cy*T, T, T));
    });

    // mud
    this.mudRects = [];
    [[16,14],[17,14],[16,15],[17,15]].forEach(([cx,cy]) => {
      this.add.image(cx*T + T/2, cy*T + T/2, 'mud').setDepth(-5);
      this.mudRects.push(new Phaser.Geom.Rectangle(cx*T, cy*T, T, T));
    });

    // exit gate
    this.exitSprite = this.add.image(24*T + T/2, 1*T + T/2, 'exit').setDepth(4);
    this.exitZone = this.add.zone(24*T + T/2, 1*T + T/2, T, T);
    this.physics.add.existing(this.exitZone, true);

    // brazier tile positions (drawn + lit in createLightingAndFX)
    this.brazierTiles = [[5,3],[13,8],[20,12],[9,12]];
  }

  createPlayer(){
    const T = this.T;
    this.player = new Player(this, 1*T + T/2, 1*T + T/2);
    this.physics.add.collider(this.player, this.wallGroup);
    this.physics.add.overlap(this.player, this.items, this.collect, null, this);
    this.physics.add.overlap(this.player, this.exitZone, this.tryExit, null, this);
  }

  createGuards(){
    this.guards = [];
    this.guardRoutes().forEach(route => this.guards.push(new Guard(this, route, this.T)));
  }

  guardRoutes(){
    const base = [
      [{x:9,y:2},{x:13,y:2},{x:13,y:5},{x:9,y:5}],
      [{x:3,y:16},{x:22,y:16}],
      [{x:23,y:3},{x:23,y:12}],
      [{x:4,y:11},{x:14,y:11},{x:14,y:13},{x:4,y:13}],
      [{x:9,y:7},{x:14,y:7}],
    ];
    let count = 2 + GameState.currentAct;
    count += Math.round(1 - GameState.moatProgress());
    count = Phaser.Math.Clamp(count, 1, base.length);
    return base.slice(0, count);
  }

  createLightingAndFX(){
    const T = this.T;
    this.lighting = new Lighting(this, this.gridW*T, this.gridH*T, { darkness: 0.82 });
    this.playerLight = this.lighting.addLight(this.player.x, this.player.y, 165, 7);

    // braziers + embers + light
    this.brazierTiles.forEach(([cx,cy]) => {
      const bx = cx*T + T/2, by = cy*T + T/2;
      this.add.image(bx, by, 'brazier').setDepth(5);
      this.lighting.addLight(bx, by - 4, 118, 16);
      this.add.particles(bx, by - 8, 'spark', {
        speed:{min:6,max:22}, angle:{min:255,max:285}, gravityY:-12,
        scale:{start:0.7,end:0}, alpha:{start:0.9,end:0}, lifespan:{min:500,max:1000},
        frequency:90, quantity:1, tint:[0xffd24a,0xff8a20], blendMode:'ADD',
      }).setDepth(7);
    });
    // gate beacon light
    this.lighting.addLight(24*T + T/2, 1*T + T/2, 92, 6);

    // dust kicked up while walking
    this.dust = this.add.particles(0, 0, 'spark', {
      lifespan:350, speed:{min:6,max:18}, scale:{start:0.5,end:0},
      alpha:{start:0.5,end:0}, tint:0xc9a16e, frequency:-1, quantity:2,
    }).setDepth(5);

    // detection vignette
    const { width, height } = this.scale;
    this.vignette = this.add.image(width/2, height/2, 'vignette')
      .setDepth(9).setScrollFactor(0).setDisplaySize(width, height)
      .setTint(0xff2020).setAlpha(0);
  }

  showActCard(){
    const { width, height } = this.scale;
    const RES = window.DPR || 2;
    const title = this.add.text(width/2, height/2 - 14, 'ACT ' + toRoman(GameState.currentAct),
      { fontFamily:'Georgia', fontSize:'42px', color:'#f0c040', fontStyle:'bold', resolution:RES })
      .setOrigin(0.5).setDepth(60).setScrollFactor(0).setAlpha(0).setShadow(0,3,'#000',8,false,true);
    const sub = this.add.text(width/2, height/2 + 26, ACT_TITLES[GameState.currentAct],
      { fontFamily:'Georgia', fontSize:'20px', color:'#E06040', resolution:RES })
      .setOrigin(0.5).setDepth(60).setScrollFactor(0).setAlpha(0).setShadow(0,2,'#000',5,false,true);
    this.tweens.add({ targets:[title, sub], alpha:1, duration:500, yoyo:true, hold:1100,
      onComplete:()=>{ title.destroy(); sub.destroy(); } });
  }

  setupInput(){
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');
    this.input.keyboard.on('keydown-F', () => this.openForge());
    this.input.keyboard.on('keydown-B', () => this.openBuild());
    this.input.keyboard.on('keydown-H', () => window.UI && UI.openHelp());
    this.input.keyboard.on('keydown-M', () => window.Sound && UI.toast(Sound.toggleMute() ? 'Muted' : 'Sound on'));
  }

  openForge(){
    if(this.uiPaused || this.complete) return;
    this.uiPaused = true; this.player.freeze();
    if(window.Sound) Sound.click();
    Forge.open(() => { this.uiPaused = false; });
  }

  openBuild(){
    if(this.uiPaused || this.complete) return;
    this.uiPaused = true; this.player.freeze();
    if(window.Sound) Sound.click();
    this.scene.launch('BuildScene');
    this.scene.pause();
  }

  /* ---------------- helpers (juice) ---------------- */
  popText(x, y, msg, color){
    const t = this.add.text(x, y, msg, { fontFamily:'Georgia', fontSize:'16px', color:color||'#ffe9b0', fontStyle:'bold', resolution:window.DPR||2 })
      .setOrigin(0.5).setDepth(8);
    t.setShadow(0, 2, '#000', 4, false, true);
    this.tweens.add({ targets:t, y:y - 28, alpha:0, duration:850, ease:'Cubic.out', onComplete:()=>t.destroy() });
  }
  burst(x, y, tint){
    const e = this.add.particles(x, y, 'spark', {
      speed:{min:40,max:130}, scale:{start:0.7,end:0}, alpha:{start:1,end:0},
      lifespan:520, tint:tint||0xffe080, blendMode:'ADD', quantity:0,
    }).setDepth(8);
    e.explode(14, x, y);
    this.time.delayedCall(650, () => e.destroy());
  }

  /* ---------------- gameplay ---------------- */
  collect(player, item){
    const x = item.x, y = item.y;
    switch(item.itemType){
      case 'cowrie':  GameState.cowries += 5;        this.popText(x,y,'+5 cowries','#fff7e2'); break;
      case 'coral':   GameState.materials.coral++;   this.popText(x,y,'Coral +1','#ff8a78'); break;
      case 'bronze':  GameState.materials.bronze++;  this.popText(x,y,'Bronze +1','#e0a84a'); break;
      case 'mudfish': GameState.materials.mudfish++; this.popText(x,y,'Mudfish +1','#7fd08a'); break;
      case 'plan':
        this.objectiveTaken = true;
        this.popText(x,y,'PLANS STOLEN!','#f0c040');
        UI.toast('Plans stolen — reach the glowing gate →');
        break;
    }
    this.burst(x, y, item.itemType === 'plan' ? 0xf0c040 : 0xffe080);
    if(window.Sound) Sound.pickup();
    item.destroy();
    UI.updateHUD();
    if(window.autosave) autosave();
  }

  update(time, delta){
    if(this.complete){ this.player && this.player.sync(); return; }

    if(this.uiPaused){
      this.player.freeze();
      this.guards.forEach(g => g.setVelocity(0,0));
      this.coneGfx.clear();
      this.guards.forEach(g => g.drawCone(this.coneGfx));
      return;
    }

    const px = this.player.x, py = this.player.y;
    const inMud = this.mudRects.some(r => Phaser.Geom.Rectangle.Contains(r, px, py));
    this.player.control(this.cursors, this.keys, inMud, GameState.canMudDash);
    this.player.hidden = this.bushRects.some(r => Phaser.Geom.Rectangle.Contains(r, px, py));
    this.player.setAlpha(this.player.hidden ? 0.5 : 1);
    this.player.sync();

    // footsteps (sound + dust)
    if(this.player.moving && time - this._lastStep > 270){
      this._lastStep = time;
      if(window.Sound) Sound.footstep();
      if(this.dust) this.dust.explode(2, this.player.x, this.player.y + 8);
    }

    let anySeen = false, anyHeard = false;
    this.guards.forEach(g => {
      const res = g.perceive(this.player, this.wallRects, this.player.hidden, GameState.noiseMultiplier);
      if(res.seen){ anySeen = true; g.state = 'alert'; g.investigate = { x: px, y: py }; }
      else if(res.heard && g.state === 'calm'){ g.state = 'suspicious'; g.investTimer = 1200; }
      if(res.heard) anyHeard = true;
      g.update(delta);
    });

    if(anySeen)       this.detection += delta * this.RATE_SEEN;
    else if(anyHeard) this.detection += delta * this.RATE_HEARD;
    else              this.detection -= delta * this.RATE_DECAY;
    this.detection = Phaser.Math.Clamp(this.detection, 0, 100);
    if(this.detection >= 100) this.onCaught();

    // cones + lighting + vignette
    this.coneGfx.clear();
    this.guards.forEach(g => g.drawCone(this.coneGfx));
    if(this.lighting){
      this.lighting.move(this.playerLight, this.player.x, this.player.y);
      this.lighting.update(time);
    }
    const pulse = this.detection > 70 ? (0.12 * (0.5 + 0.5*Math.sin(time/120))) : 0;
    this.vignette.setAlpha((this.detection / 100) * 0.45 + pulse);

    UI.setAlert(this.detection);
    if(time - this.lastHudTick > 250){ UI.updateHUD(); this.lastHudTick = time; }

    if(this.objectiveTaken && !this._exitPulsing){
      this._exitPulsing = true;
      this.tweens.add({ targets:this.exitSprite, scale:1.25, duration:500, yoyo:true, repeat:-1 });
    }
  }

  onCaught(){
    this.detection = 0;
    GameState.hp--;
    UI.updateHUD();
    if(window.autosave) autosave();
    this.cameras.main.shake(260, 0.012);
    this.cameras.main.flash(260, 140, 0, 0);
    if(window.Sound) Sound.caught();
    this.guards.forEach(g => { g.state = 'calm'; g.investigate = null; g.investTimer = 0; });

    if(GameState.hp <= 0){
      GameState.hp = GameState.maxHealth;
      this.complete = true;
      UI.toast('Captured! The Ogiso drag you back into the dark...');
      this.cameras.main.fadeOut(450, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart());
    } else {
      UI.toast('Spotted! Health −1. Slip back into the shadows.');
      const T = this.T;
      this.player.setPosition(1*T + T/2, 1*T + T/2);
    }
  }

  tryExit(){
    if(!this.objectiveTaken || this.complete) return;
    this.complete = true;
    this.player.freeze();

    const reward = 20 + GameState.currentAct * 10;
    GameState.cowries += reward;
    UI.updateHUD();
    if(window.autosave) autosave();
    this.popText(this.player.x, this.player.y, '+' + reward + ' cowries', '#fff7e2');
    if(window.Sound) Sound.pickup();

    const act = GameState.currentAct;

    if(act >= GameState.maxAct){
      if(GameState.isMoatComplete()){
        UI.showDialogue('Iyoba Idia', [
          "The leopard rules the forest by day, but the night belongs to the ancestors.",
          "The Iya is whole. The curse breaks upon our walls. Igodomigodo endures — and your name with it, Adesua.",
        ], () => {
          this.cameras.main.fadeOut(500, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('VictoryScene'));
        });
      } else {
        UI.showDialogue('Iyoba Idia', [
          "You hold the final plans, child — but the Great Iya is not yet a closed ring.",
          "Spend your cowries at the Moat (press B) and seal the city. Then return to greet the dawn.",
        ], () => {
          const T = this.T;
          this.player.setPosition(22*T + T/2, 4*T + T/2);
          this.complete = false;
        });
      }
      return;
    }

    const next = act + 1;
    UI.showDialogue(ACT_SPEAKER[next], ACT_DIALOGUE[next], () => {
      GameState.currentAct = next;
      if(window.autosave) autosave();
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart());
    });
  }
}
window.StealthScene = StealthScene;
