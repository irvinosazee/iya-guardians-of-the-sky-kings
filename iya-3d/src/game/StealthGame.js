/* ============================================================
 * StealthGame.js — the 3D core loop. Owns world/level/player/
 * guards/camera, runs the rAF loop, computes detection, drives
 * the shared DOM HUD, and handles acts / win / lose / pause.
 * ============================================================ */
const ACT_TITLES = { 1:'The Shadows of Igodomigodo', 2:'The Trench and the Totem', 3:"The Queen Mother's Blessing" };
const ACT_SPEAKER = { 2:'Oba Ewuare', 3:'Iyoba Idia' };
const ACT_DIALOGUE = {
  2: ["The plans are ours, Adesua. Now I decree the building of the Great Iya — the moat that will ring Benin.",
      "Every foot of earth we dig keeps the Ogiso curses at bay. Steal the corrupt chiefs' plans, and oversee the digging."],
  3: ["You have done well. But the final assault gathers in the dark, and steel alone will not hold it.",
      "Seek Iyoba Idia, the Queen Mother. Her juju — the echoes of the ancestors — may yet turn the night."],
};
const ROMAN = { 1:'I', 2:'II', 3:'III' };

class StealthGame {
  constructor(canvas, world){
    this.canvas = canvas;
    this.world = world || new World3D(canvas);
    this.running = false;
    this.paused = false;
    this.uiPaused = false;
    this.complete = false;
    this.objectiveTaken = false;
    this.detection = 0;
    this._detectMul = 1;
    this._lastStep = 0;
    this._t0 = 0;

    this.RATE_SEEN = 58; this.RATE_HEARD = 20; this.RATE_DECAY = 45;
    this._everMoved = this._everHid = this._everPicked = false;

    this.input = new Input(canvas);
    this._loop = this._loop.bind(this);
  }

  start(){
    this.buildAct();
    this.running = true;
    window.__stealth = this;
    if(window.UI){ UI.showHUD(); UI.updateHUD(); }
    if(window.Sound){ Sound.resume(); Sound.startAmbient(); }
    if(window.Settings && window.Sound) Settings.applyAudio();
    if(window.Tutorial && GameState.currentAct === 1) Tutorial.start();
    this.refreshObjective();
    this.showActBanner();
    this._t0 = performance.now();
    requestAnimationFrame(this._loop);
  }

  buildAct(){
    // always start from a clean scene (also clears the menu idle backdrop)
    if(this.guards) this.guards.forEach(g => g.destroy());
    this.world.clearScene();
    this.level = new Level3D(this.world);
    this.player = new Player3D(this.world);
    this.player.setPosition(this.level.playerStart.x, this.level.playerStart.z);
    this.rig = new OrbitCameraRig(this.world.camera, this.player.mesh);
    if(window.Settings){
      this.rig.sens = Settings.camSensitivity;
      if(Settings.camZoom) this.rig.dist = this.rig.ddist = Math.max(this.rig.minDist, Math.min(this.rig.maxDist, Settings.camZoom));
    }

    // guards: count scales with act, +1 while moat unfinished (same rule as 2D)
    let count = 2 + GameState.currentAct + Math.round(1 - GameState.moatProgress());
    count = Math.max(1, Math.min(5, count));
    this.guards = this.level.guardRoutes(count).map(r => new Guard3D(this.world, r));
    this.applyDifficulty();

    this.objectiveTaken = false;
    this.detection = 0;
    this.complete = false;
    this._buildIndicators();
  }

  _teardownLevel(){
    if(this.guards) this.guards.forEach(g => g.destroy());
    this.world.clearScene();
  }

  applyDifficulty(){
    const d = window.Settings ? Settings.difficultyParams() : { vision:1, fov:1, speed:1, detect:1 };
    this._detectMul = d.detect;
    this.guards.forEach(g => g.applyDifficulty(d));
    if(window.Settings && this.world) this.world.setBrightness(Settings.brightness);
  }

  _buildIndicators(){
    // off-screen-ish objective arrow on the ground
    const arrowGeo = new THREE.ConeGeometry(0.35, 0.9, 4);
    arrowGeo.rotateX(Math.PI/2);
    this.locator = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({ color:0xf0c040 }));
    this.locator.position.y = 0.1; this.world.scene.add(this.locator);

    // noise ring
    this.noiseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.0, 32),
      new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.25, side:THREE.DoubleSide }));
    this.noiseRing.rotation.x = -Math.PI/2; this.noiseRing.position.y = 0.05;
    this.world.scene.add(this.noiseRing);
  }

  refreshObjective(){
    if(!window.UI) return;
    if(GameState.currentAct >= GameState.maxAct && this.objectiveTaken && !GameState.isMoatComplete())
      UI.setObjective('Seal the Moat (press B), then reach the gate');
    else if(!this.objectiveTaken) UI.setObjective('Steal the construction plans (the scroll)');
    else UI.setObjective('Reach the glowing gate to escape');
  }

  showActBanner(){
    if(window.UI && UI.actBanner) UI.actBanner('ACT ' + (ROMAN[GameState.currentAct]||GameState.currentAct), ACT_TITLES[GameState.currentAct]);
  }

  /* ----- overlays ----- */
  openForge(){
    if(this.uiPaused || this.complete) return;
    this.uiPaused = true;
    const go = () => Forge.open(() => { this.uiPaused = false; });
    if(window.Settings && !Settings.forgeSeen){
      Settings.forgeSeen = true; Settings.save();
      UI.infoModal('The Artisan’s Forge', 'Spend gathered materials to cast bronze plaques — permanent upgrades: more health, quieter steps, or dashing through mud.', go);
    } else go();
  }
  openMoat(){
    if(this.uiPaused || this.complete) return;
    this.uiPaused = true;
    const go = () => Moat.open(() => { this.uiPaused = false; this.refreshObjective(); });
    if(window.Settings && !Settings.moatSeen){
      Settings.moatSeen = true; Settings.save();
      UI.infoModal('The Great Iya (Moat)', 'Dig the glowing ring with cowries (5 each). Seal the ring to thin out night patrols — and it is required to win.', go);
    } else go();
  }

  /* ----- main loop ----- */
  _loop(now){
    if(!this.running) return;
    const dt = Math.min(0.05, (now - this._t0) / 1000);
    this._t0 = now;
    if(!this.paused && !this.uiPaused && !this.complete) this._tick(dt, now);
    else if((this.complete || this.uiPaused) && this.rig){ this.rig.update(dt, this.level && this.level.wallMeshes, { moving:false, reduceMotion: window.Settings && Settings.reduceMotion }); }
    this.level && this.level.update(now);
    this.world.render();
    requestAnimationFrame(this._loop);
  }

  _tick(dt, now){
    const p = this.player.position;

    // ----- camera steering (mouse drag / arrows / wheel) -----
    const md = this.input.consumeMouse();
    const s = (window.Settings ? Settings.camSensitivity : 1) * 0.005;
    if(md.dx) this.rig.addYaw(md.dx * s);
    if(md.dy) this.rig.addPitch(-md.dy * s);
    const ci = this.input.camIntent();
    if(ci.yaw)   this.rig.addYaw(ci.yaw * dt * 2.2);
    if(ci.pitch) this.rig.addPitch(ci.pitch * dt * 1.6);
    const z = this.input.consumeZoom();
    if(z){ this.rig.zoom(z * 1.3); if(window.Settings){ Settings.camZoom = this.rig.dist; Settings.save(); } }

    // ----- camera-relative movement (basis from camera yaw) -----
    const intent = this.input.intent();
    const yaw = this.rig.forwardYaw();
    const fx = Math.cos(yaw), fz = Math.sin(yaw);   // camera-forward on ground
    const rx = -fz, rz = fx;                        // camera-right
    let wx = fx * (-intent.z) + rx * intent.x;
    let wz = fz * (-intent.z) + rz * intent.x;
    const wl = Math.hypot(wx, wz);
    const worldDir = { x: wl?wx/wl:0, z: wl?wz/wl:0, active: intent.active };

    const inMud = this.level.muds.some(m => (p.x-m.x)**2 + (p.z-m.z)**2 < m.r*m.r);
    this.player.update(worldDir, dt, this.level.walls, inMud, GameState.canMudDash);
    this.player.hidden = this.level.bushes.some(b => (p.x-b.x)**2 + (p.z-b.z)**2 < b.r*b.r);
    this.player.mesh.userData.body && (this.player.mesh.userData.body.material.opacity = this.player.hidden ? 0.55 : 1,
      this.player.mesh.userData.body.material.transparent = this.player.hidden);

    if(this.player.moving) this._everMoved = true;
    if(this.player.hidden) this._everHid = true;
    if(window.Tutorial) Tutorial.update(this);

    // gentle auto-align: drift the camera behind movement when not actively dragging
    if(worldDir.active && !this.input.drag.active)
      this.rig.yaw = this.rig._lerpAngle(this.rig.yaw, this.player.heading, 0.02);
    this.rig.update(dt, this.level.wallMeshes, { moving: this.player.moving, reduceMotion: window.Settings && Settings.reduceMotion });

    // item pickups
    for(const g of this.level.items){
      if(!g.visible) continue;
      if((p.x-g.position.x)**2 + (p.z-g.position.z)**2 < 1.1) this.collect(g);
    }

    // detection
    let anySeen = false, anyHeard = false;
    this.guards.forEach(gd => {
      const res = gd.perceive(this.player, this.level.wallMeshes, this.player.hidden, GameState.noiseMultiplier);
      if(res.seen){ anySeen = true; gd.state = 'alert'; gd.investigate = { x:p.x, z:p.z }; gd.lastSeenPos = { x:p.x, z:p.z }; }
      else if(res.heard && gd.state === 'calm'){ gd.state = 'suspicious'; gd.investTimer = 1.2; }
      if(res.heard) anyHeard = true;
      gd.update(dt);
    });
    if(anySeen) this.detection += dt * this.RATE_SEEN * this._detectMul;
    else if(anyHeard) this.detection += dt * this.RATE_HEARD * this._detectMul;
    else this.detection -= dt * this.RATE_DECAY;
    this.detection = Math.max(0, Math.min(100, this.detection));
    if(this.detection >= 100) this.onCaught();

    // footsteps + noise ring
    if(this.player.moving && now - this._lastStep > 270){ this._lastStep = now; if(window.Sound) Sound.footstep(); }
    this._updateIndicators(now);
    this._checkExit();

    if(window.UI){ UI.setAlert(this.detection); if(!this._hudT || now-this._hudT>250){ UI.updateHUD(); this._hudT=now; } }
  }

  _updateIndicators(now){
    const p = this.player.position;
    let target = null;
    if(!this.objectiveTaken && this.level.planItem.visible) target = this.level.planItem.position;
    else if(this.objectiveTaken) target = this.level.exit;
    if(target){
      const dx = target.x - p.x, dz = target.z - p.z, dist = Math.hypot(dx, dz);
      if(dist > 2.5){
        const a = Math.atan2(dz, dx);
        this.locator.visible = true;
        this.locator.position.set(p.x + Math.cos(a)*1.6, 0.1, p.z + Math.sin(a)*1.6);
        this.locator.rotation.z = -a;
        this.locator.material.opacity = 0.6 + 0.4*Math.sin(now*0.006);
      } else this.locator.visible = false;
    } else this.locator.visible = false;

    if(this.player.moving){
      this.noiseRing.visible = true;
      const r = 6 * GameState.noiseMultiplier;
      this.noiseRing.scale.set(r, r, r);
      this.noiseRing.position.set(p.x, 0.05, p.z);
      this.noiseRing.material.opacity = 0.18 + 0.07*Math.sin(now*0.008);
    } else this.noiseRing.visible = false;
  }

  collect(g){
    g.visible = false;
    this._everPicked = true;
    const t = g.userData.itemType;
    if(t === 'cowrie'){ GameState.cowries += 5; UI.toast('+5 cowries'); }
    else if(t === 'coral'){ GameState.materials.coral++; UI.toast('Coral +1'); }
    else if(t === 'bronze'){ GameState.materials.bronze++; UI.toast('Bronze +1'); }
    else if(t === 'mudfish'){ GameState.materials.mudfish++; UI.toast('Mudfish +1'); }
    else if(t === 'plan'){ this.objectiveTaken = true; UI.toast('Plans stolen — reach the glowing gate →'); this.refreshObjective(); }
    if(window.Sound) Sound.pickup();
    UI.updateHUD();
    if(window.autosave) autosave();

    // exit check is continuous:
    if(this.objectiveTaken) this._exitArmed = true;
  }

  _checkExit(){
    if(!this.objectiveTaken || this.complete) return;
    const p = this.player.position, e = this.level.exit;
    if((p.x-e.x)**2 + (p.z-e.z)**2 < 1.6) this.onExit();
  }

  onCaught(){
    this.detection = 0;
    GameState.hp--;
    UI.updateHUD();
    if(window.autosave) autosave();
    if(window.Sound) Sound.caught();
    if(!(window.Settings && Settings.reduceMotion)) this._flash();
    this.guards.forEach(g => { g.state='calm'; g.investigate=null; g.investTimer=0; });
    if(GameState.hp <= 0){
      GameState.hp = GameState.maxHealth;
      this.complete = true;
      UI.toast('Captured! The Ogiso drag you back into the dark...');
      setTimeout(() => this.restartAct(), 900);
    } else {
      UI.toast('Spotted! Health −1. Slip back into the shadows.');
      this.player.setPosition(this.level.playerStart.x, this.level.playerStart.z);
    }
  }

  _flash(){
    const el = document.getElementById('flash');
    if(!el) return;
    el.style.transition = 'none'; el.style.opacity = '0.6';
    requestAnimationFrame(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; });
  }

  onExit(){
    this.complete = true;
    const reward = 20 + GameState.currentAct * 10;
    GameState.cowries += reward; UI.updateHUD();
    if(window.autosave) autosave();
    if(window.Sound) Sound.pickup();
    const act = GameState.currentAct;
    if(act >= GameState.maxAct){
      if(GameState.isMoatComplete()){
        UI.showDialogue('Iyoba Idia', [
          "The leopard rules the forest by day, but the night belongs to the ancestors.",
          "The Iya is whole. The curse breaks upon our walls. Igodomigodo endures — and your name with it, Adesua.",
        ], () => this.win());
      } else {
        UI.showDialogue('Iyoba Idia', [
          "You hold the final plans, child — but the Great Iya is not yet a closed ring.",
          "Spend your cowries at the Moat (press B) and seal the city. Then return to greet the dawn.",
        ], () => { this.player.setPosition(this.level.exit.x, this.level.exit.z + 4); this.complete = false; this.refreshObjective(); });
      }
      return;
    }
    const next = act + 1;
    UI.showDialogue(ACT_SPEAKER[next], ACT_DIALOGUE[next], () => {
      GameState.currentAct = next; if(window.autosave) autosave();
      this.buildAct(); this.refreshObjective(); this.showActBanner();
    });
  }

  win(){ this.running = false; if(window.GameSave) GameSave.clear(); if(window.UI) UI.showVictory(); }

  restartAct(){ this.complete = false; this.detection = 0; this.buildAct(); this.refreshObjective(); this.showActBanner(); }

  quitToTitle(){ this.running = false; window.__stealth = null; if(window.UI) UI.showMenu(); }

  destroy(){ this.running = false; this.input.destroy(); }
}
window.StealthGame = StealthGame;
