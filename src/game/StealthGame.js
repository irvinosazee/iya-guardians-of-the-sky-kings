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
    this.cinematic = null;
    this._pebbles = [];
    this._buildIndicators();

    // objective waypoint beam
    this.beam = MeshFactory.beam();
    this.world.scene.add(this.beam);

    // minimap
    this.minimap = new Minimap(this.level);
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
    // flat chevron arrow on the ground, pointing +X (aimed via rotation.y)
    const sh = new THREE.Shape();
    sh.moveTo(0.55, 0); sh.lineTo(-0.15, 0.34); sh.lineTo(0.02, 0); sh.lineTo(-0.15, -0.34); sh.closePath();
    const arrowGeo = new THREE.ShapeGeometry(sh);
    arrowGeo.rotateX(-Math.PI/2);                       // lay flat on the ground
    this.locator = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({ color:0xf0c040, transparent:true, opacity:0.9 }));
    this.locator.position.y = 0.08; this.world.scene.add(this.locator);

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
    if(this.cinematic){ this._updateCinematic(dt, now); }
    else if(!this.paused && !this.uiPaused && !this.complete) this._tick(dt, now);
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
    const mods = this.input.modifiers();
    this.player.update(worldDir, dt, this.level.walls, inMud, GameState.canMudDash, mods);

    // distraction throw (E) — pebble lands ahead and pulls guards to investigate
    if(this.input.consumeThrow()) this.throwDistraction();
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

    // light & shadow stealth: exposure 0 (dark) .. 1 (bright) scales how fast you're seen
    const exposure = this._lightExposure(p);
    const seenScale = 0.55 + exposure * 0.9;

    // detection
    const effNoise = GameState.noiseMultiplier * this.player.noiseFactor;
    let anySeen = false, anyHeard = false;
    this.guards.forEach(gd => {
      const res = gd.perceive(this.player, this.level.wallMeshes, this.player.hidden, effNoise);
      if(res.seen){ anySeen = true; gd.state = 'alert'; gd.investigate = { x:p.x, z:p.z }; gd.lastSeenPos = { x:p.x, z:p.z }; }
      else if(res.heard && gd.state === 'calm'){ gd.state = 'suspicious'; gd.investTimer = 1.2; }
      if(res.heard) anyHeard = true;
      gd.updateAware(res.seen, dt);
      gd.update(dt);
    });
    if(anySeen) this.detection += dt * this.RATE_SEEN * this._detectMul * seenScale;
    else if(anyHeard) this.detection += dt * this.RATE_HEARD * this._detectMul;
    else this.detection -= dt * this.RATE_DECAY;
    this.detection = Math.max(0, Math.min(100, this.detection));
    if(this.detection >= 100) this.onCaught();

    // footsteps + noise ring
    if(this.player.moving && now - this._lastStep > 270){ this._lastStep = now; if(window.Sound) Sound.footstep(); }
    this._updatePebbles(dt);
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
        this.locator.position.set(p.x + Math.cos(a)*1.7, 0.08, p.z + Math.sin(a)*1.7);
        this.locator.rotation.y = -a;                  // flat arrow faces +X -> aim by yaw
        this.locator.material.opacity = 0.6 + 0.35*Math.sin(now*0.006);
      } else this.locator.visible = false;
    } else this.locator.visible = false;

    // waypoint beam sits on the objective
    if(this.beam){
      if(target){
        this.beam.visible = true;
        this.beam.position.set(target.x, 0, target.z);
        const pulse = 0.5 + 0.5*Math.sin(now*0.004);
        this.beam.userData.cyl.material.opacity = 0.12 + 0.10*pulse;
        this.beam.userData.ring.scale.setScalar(1 + 0.15*pulse);
      } else this.beam.visible = false;
    }

    if(this.player.moving){
      this.noiseRing.visible = true;
      const r = 6 * GameState.noiseMultiplier * (this.player.noiseFactor || 1);
      this.noiseRing.scale.set(r, r, r);
      this.noiseRing.position.set(p.x, 0.05, p.z);
      this.noiseRing.material.opacity = 0.18 + 0.07*Math.sin(now*0.008);
    } else this.noiseRing.visible = false;

    // contextual prompt + hidden badge
    if(window.UI){
      if(this.player.hidden){ UI.setHidden(true); UI.setContext('You are hidden — guards can’t see you here', '🌿'); }
      else {
        UI.setHidden(false);
        if(target){
          const d = Math.hypot(target.x-p.x, target.z-p.z);
          if(!this.objectiveTaken && d < 2.4) UI.setContext('Walk over the scroll to steal the plans', '✋');
          else if(this.objectiveTaken && d < 3) UI.setContext('Escape through the glowing gate', '🚪');
          else UI.setContext(null);
        } else UI.setContext(null);
      }
      // danger vignette from global detection
      UI.setDanger(this.detection > 30 ? (this.detection-30)/70 * 0.9 : 0);
    }

    if(this.minimap) this.minimap.update(this);
  }

  // brightest nearby light at a point -> 0 (shadow) .. 1 (bright)
  _lightExposure(p){
    let e = 0;
    for(const L of this.level.lights){
      const d = Math.hypot(p.x - L.x, p.z - L.z);
      if(d < L.range) e = Math.max(e, 1 - d / L.range);
    }
    return e;
  }

  throwDistraction(){
    const p = this.player.position, h = this.player.heading;
    // pebble lands ~7 units ahead (or short if a wall is closer)
    let range = 7;
    const tx = p.x + Math.cos(h) * range, tz = p.z + Math.sin(h) * range;
    const pebble = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), MeshFactory.mat(0xcfc2a0));
    pebble.position.set(p.x, 1.0, p.z); this.world.scene.add(pebble);
    const dur = 0.5; let t = 0;
    const sx = p.x, sz = p.z;
    this._pebbles = this._pebbles || [];
    this._pebbles.push({ m:pebble, t:0, dur, sx, sz, tx, tz });
    if(window.Sound) Sound.click();
    UI.toast('You toss a pebble — a distraction');
    // remember landing to ping guards when it lands
    pebble.userData.land = { x:tx, z:tz };
  }

  _updatePebbles(dt){
    if(!this._pebbles || !this._pebbles.length) return;
    for(let i = this._pebbles.length - 1; i >= 0; i--){
      const pb = this._pebbles[i]; pb.t += dt;
      const k = Math.min(1, pb.t / pb.dur);
      pb.m.position.x = pb.sx + (pb.tx - pb.sx) * k;
      pb.m.position.z = pb.sz + (pb.tz - pb.sz) * k;
      pb.m.position.y = 1.0 + Math.sin(k * Math.PI) * 1.4;   // arc
      if(k >= 1){
        // landed — nearby calm/suspicious guards investigate the spot
        const L = pb.m.userData.land;
        if(window.Sound) Sound.footstep();
        this.guards.forEach(g => {
          if(g.state !== 'alert' && Math.hypot(g.position.x-L.x, g.position.z-L.z) < 12){
            g.state = 'suspicious'; g.investigate = { x:L.x, z:L.z }; g.investTimer = 2.2; g.lastSeenPos = { x:L.x, z:L.z };
            g.state = 'alert'; // walk to it, then revert via its own logic
          }
        });
        this.world.scene.remove(pb.m); this._pebbles.splice(i, 1);
      }
    }
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
    if(!(window.Settings && Settings.reduceMotion)){ this._flash(); if(this.rig) this.rig.ddist = Math.max(this.rig.minDist, this.rig.dist - 3.5); }  // quick zoom punch
    this.guards.forEach(g => { g.state='calm'; g.investigate=null; g.investTimer=0; g.aware = 0; });
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

  win(){ this.cinematic = { mode:'win', t:0 }; }

  _updateCinematic(dt, now){
    this.cinematic.t += dt;
    if(this.cinematic.mode === 'win'){
      if(!(window.Settings && Settings.reduceMotion)) this.rig.yaw += dt * 0.6;   // slow orbit
      this.rig.update(dt, this.level && this.level.wallMeshes, { moving:false });
      this.level && this.level.update(now);
      if(this.cinematic.t > 2.6){ this.cinematic = null; this.running = false; if(window.GameSave) GameSave.clear(); if(window.UI) UI.showVictory(); }
    }
  }

  restartAct(){ this.complete = false; this.detection = 0; this.buildAct(); this.refreshObjective(); this.showActBanner(); }

  quitToTitle(){ this.running = false; window.__stealth = null; if(window.UI) UI.showMenu(); }

  destroy(){ this.running = false; this.input.destroy(); }
}
window.StealthGame = StealthGame;
