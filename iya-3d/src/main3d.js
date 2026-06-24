/* ============================================================
 * main3d.js — boot. One shared World3D drives both the menu
 * idle backdrop and the StealthGame, so there is only ever a
 * single WebGL renderer on the canvas.
 * ============================================================ */
(function(){
  const canvas = document.getElementById('c');
  let world = null;
  let idleRAF = null;

  function ensureWorld(){ if(!world) world = new World3D(canvas); return world; }

  // slow torch-lit idle scene behind the menu
  window.startIdle = function(){
    const w = ensureWorld();
    w.clearScene();
    const g = MeshFactory.brazier(); g.position.set(0,0,0); w.scene.add(g);
    const pl = new THREE.PointLight(0xff8a30, 1.6, 16); pl.position.set(0,2.2,1.4); w.scene.add(pl);
    const fire = g.getObjectByName('fire');
    cancelAnimationFrame(idleRAF);
    (function spin(t){
      if(window.__stealth){ return; }                 // game took over the canvas
      if(fire){ const s=0.85+Math.sin(t*0.01)*0.2; fire.scale.set(s,1+Math.sin(t*0.013)*0.25,s); }
      w.camera.position.set(Math.sin(t*0.0003)*6, 3.2, Math.cos(t*0.0003)*6);
      w.camera.lookAt(0,1.3,0);
      w.render();
      idleRAF = requestAnimationFrame(spin);
    })(0);
  };

  window.startGame = function(){
    cancelAnimationFrame(idleRAF);
    if(window.__stealth){ window.__stealth.destroy(); window.__stealth = null; }
    const game = new StealthGame(canvas, ensureWorld());
    game.start();
  };

  window.addEventListener('load', () => {
    if(window.Settings){ Settings.load(); if(window.Sound){ Sound.musicVol=Settings.musicVol; Sound.sfxVol=Settings.sfxVol; } }
    UI._refreshContinue();
    startIdle();
  });
})();
