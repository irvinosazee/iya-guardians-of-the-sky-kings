/* ============================================================
 * BootScene.js — generates every texture procedurally on canvas,
 * so the game runs with zero external image files.
 * ============================================================ */
class BootScene extends Phaser.Scene {
  constructor(){ super('BootScene'); }

  create(){
    this.createProceduralAssets();
    if(window.UI && UI.initIcons) UI.initIcons(this.textures);  // populate HUD icons from generated art
    this.scene.start('MenuScene');
  }

  makeCanvas(key, w, h, draw){
    if(this.textures.exists(key)) return;
    const tex = this.textures.createCanvas(key, w, h);
    draw(tex.context, w, h);
    tex.refresh();
  }

  createProceduralAssets(){
    const T = 32;

    /* ---------- floor (dirt with Benin ribbon flecks) ---------- */
    this.makeCanvas('floor', T, T, (c) => {
      const g = c.createLinearGradient(0,0,T,T);
      g.addColorStop(0,'#c9a16e'); g.addColorStop(1,'#b98f5c');
      c.fillStyle = g; c.fillRect(0,0,T,T);
      c.fillStyle = 'rgba(120,86,48,0.35)';
      for(let i=0;i<7;i++) c.fillRect((i*9+3)%T, (i*13+5)%T, 2, 2);
      c.strokeStyle = 'rgba(90,64,38,0.45)'; c.strokeRect(0.5,0.5,T-1,T-1);
    });

    /* ---------- red clay wall (fluted relief + bronze stud) ---------- */
    this.makeCanvas('wall', T, T, (c) => {
      const g = c.createLinearGradient(0,0,0,T);
      g.addColorStop(0,'#b14a26'); g.addColorStop(0.5,'#9c3f20'); g.addColorStop(1,'#7e3018');
      c.fillStyle = g; c.fillRect(0,0,T,T);
      c.strokeStyle = 'rgba(60,24,12,0.55)'; c.lineWidth = 1;
      for(let x=6;x<T;x+=8){ c.beginPath(); c.moveTo(x,2); c.lineTo(x,T-2); c.stroke(); }
      c.fillStyle = '#d9a441'; c.beginPath(); c.arc(16,16,2.2,0,Math.PI*2); c.fill();
      c.strokeStyle = 'rgba(40,16,8,0.8)'; c.lineWidth = 2; c.strokeRect(1,1,T-2,T-2);
    });

    /* ---------- soft drop shadow ---------- */
    this.makeCanvas('shadow', 32, 18, (c) => {
      const g = c.createRadialGradient(16,9,1,16,9,15);
      g.addColorStop(0,'rgba(0,0,0,0.45)'); g.addColorStop(1,'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0,0,32,18);
    });

    /* ---------- Adesua (coral regalia, faces +x) ---------- */
    this.makeCanvas('player', T, T, (c) => {
      c.fillStyle = '#2e2018'; c.beginPath(); c.arc(15,16,11,0,Math.PI*2); c.fill();      // cloak
      c.fillStyle = '#E06040'; c.beginPath(); c.arc(15,14,8,0,Math.PI*2); c.fill();        // body
      c.fillStyle = '#7a2a1a'; c.fillRect(8,12,14,3);                                       // sash
      c.fillStyle = '#f0c040'; c.beginPath(); c.arc(15,9,4.5,0,Math.PI*2); c.fill();        // coral crown
      c.fillStyle = '#d83a3a'; c.beginPath(); c.arc(15,9,2.2,0,Math.PI*2); c.fill();
      c.fillStyle = '#ffe9b0'; c.beginPath(); c.arc(22,14,2.4,0,Math.PI*2); c.fill();       // facing pip (+x)
    });

    /* ---------- guard (leopard cultist, spots + gold helm) ---------- */
    this.makeCanvas('guard', T, T, (c) => {
      c.fillStyle = '#caa12f'; c.beginPath(); c.arc(16,16,12,0,Math.PI*2); c.fill();
      c.fillStyle = '#7a5a10';
      [[11,11],[20,12],[13,20],[21,19],[16,15]].forEach(([x,y])=>{ c.beginPath(); c.arc(x,y,2.1,0,Math.PI*2); c.fill(); });
      c.fillStyle = '#e9cf6a'; c.beginPath(); c.arc(16,11,6,Math.PI,0); c.fill();           // helm
      c.fillStyle = '#3a2a08'; c.fillRect(13,13,2,2); c.fillRect(18,13,2,2);                // eyes
      c.fillStyle = '#ffe9b0'; c.beginPath(); c.arc(23,16,2.2,0,Math.PI*2); c.fill();        // facing pip
    });

    /* ---------- collectibles (drawn at 2x = 64px for crisp icons) ---------- */
    const rim = (c, draw) => { // soft dark outline behind shape for pop
      c.save(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 4; draw(); c.restore();
    };

    this.makeCanvas('coral', 64, 64, (c) => {                                                // strand of red coral beads
      c.lineWidth = 5; c.strokeStyle = '#7a1f1f';
      c.beginPath(); c.moveTo(14,16); c.quadraticCurveTo(32,8,50,18);
      c.quadraticCurveTo(56,40,40,52); c.quadraticCurveTo(16,54,12,34); c.stroke();
      const beads = [[16,18],[26,13],[37,15],[48,22],[51,36],[42,49],[27,51],[15,40],[18,28]];
      beads.forEach(([x,y]) => {
        rim(c, () => {
          const g = c.createRadialGradient(x-2,y-2,1,x,y,7);
          g.addColorStop(0,'#ff7d6a'); g.addColorStop(1,'#c52a2a');
          c.fillStyle = g; c.beginPath(); c.arc(x,y,6.5,0,Math.PI*2); c.fill();
        });
      });
    });

    this.makeCanvas('bronze', 64, 64, (c) => {                                               // Benin bronze plaque w/ figure
      rim(c, () => {
        const g = c.createLinearGradient(14,12,50,52);
        g.addColorStop(0,'#f0c878'); g.addColorStop(0.5,'#c08a30'); g.addColorStop(1,'#8a5e1c');
        c.fillStyle = g; c.fillRect(14,10,36,44);
      });
      c.lineWidth = 3; c.strokeStyle = '#5e3e12'; c.strokeRect(14,10,36,44);
      c.fillStyle = '#5e3e12';                                                                // stylized Oba figure
      c.beginPath(); c.arc(32,24,6,0,Math.PI*2); c.fill();                                    // head
      c.fillRect(26,30,12,16);                                                                // body
      c.fillRect(20,32,6,12); c.fillRect(38,32,6,12);                                         // arms
      c.fillStyle = '#fff0c0'; c.fillRect(30,16,4,4);                                          // crown gem
    });

    this.makeCanvas('mudfish', 64, 64, (c) => {                                              // clear fish silhouette
      rim(c, () => {
        const g = c.createLinearGradient(10,20,40,44);
        g.addColorStop(0,'#7fd08a'); g.addColorStop(1,'#3f8a52');
        c.fillStyle = g; c.beginPath(); c.ellipse(28,32,18,11,0,0,Math.PI*2); c.fill();
      });
      c.fillStyle = '#2f6e42'; c.beginPath(); c.moveTo(44,32); c.lineTo(58,22); c.lineTo(58,42); c.closePath(); c.fill(); // tail
      c.beginPath(); c.moveTo(26,21); c.lineTo(34,12); c.lineTo(38,22); c.closePath(); c.fill();                          // fin
      c.fillStyle = '#0a1a0e'; c.beginPath(); c.arc(18,29,2.6,0,Math.PI*2); c.fill();                                     // eye
      c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 2; c.beginPath(); c.arc(28,32,12,-0.6,0.6); c.stroke();      // gill
    });

    this.makeCanvas('cowrie', 64, 64, (c) => {                                               // cowrie shell
      rim(c, () => {
        const g = c.createLinearGradient(18,14,46,50);
        g.addColorStop(0,'#fffbee'); g.addColorStop(1,'#cdbb8c');
        c.fillStyle = g; c.beginPath(); c.ellipse(32,32,15,19,0,0,Math.PI*2); c.fill();
      });
      c.strokeStyle = '#9c8856'; c.lineWidth = 3; c.beginPath(); c.moveTo(32,16); c.lineTo(32,48); c.stroke();            // slit
      c.lineWidth = 1.5;
      for(let y=20;y<=44;y+=4){ c.beginPath(); c.moveTo(27,y); c.lineTo(31,y); c.moveTo(33,y); c.lineTo(37,y); c.stroke(); } // teeth
    });

    this.makeCanvas('plan', 64, 64, (c) => {                                                 // rolled scroll w/ seal
      rim(c, () => {
        c.fillStyle = '#f3ead0'; c.fillRect(16,12,32,40);
      });
      c.fillStyle = '#d8c9a0'; c.fillRect(16,12,32,5); c.fillRect(16,47,32,5);                // rolled ends
      c.strokeStyle = '#9a7a3a'; c.lineWidth = 2;
      for(let y=22;y<46;y+=5){ c.beginPath(); c.moveTo(22,y); c.lineTo(42,y); c.stroke(); }   // writing lines
      rim(c, () => { c.fillStyle = '#c02828'; c.beginPath(); c.arc(40,48,5,0,Math.PI*2); c.fill(); }); // wax seal
    });

    /* ---------- environment ---------- */
    this.makeCanvas('bush', T, T, (c) => {
      c.fillStyle = '#1f5a2c';
      c.beginPath(); c.arc(11,19,9,0,Math.PI*2); c.arc(21,19,9,0,Math.PI*2); c.arc(16,12,9,0,Math.PI*2); c.fill();
      c.fillStyle = '#2f7a3c';
      c.beginPath(); c.arc(13,15,3,0,Math.PI*2); c.arc(20,17,2.4,0,Math.PI*2); c.fill();
    });
    this.makeCanvas('mud', T, T, (c) => {
      c.fillStyle = '#5e4226'; c.fillRect(0,0,T,T);
      c.fillStyle = '#48311c';
      for(let i=0;i<6;i++){ c.beginPath(); c.arc((i*9+4)%T,(i*11+6)%T,3,0,Math.PI*2); c.fill(); }
      c.fillStyle = 'rgba(150,120,80,0.25)'; c.fillRect(0,0,T,3);
    });
    this.makeCanvas('water', T, T, (c) => {
      const g = c.createLinearGradient(0,0,0,T);
      g.addColorStop(0,'#2f6fa8'); g.addColorStop(1,'#1c4e80');
      c.fillStyle = g; c.fillRect(0,0,T,T);
      c.strokeStyle = 'rgba(180,220,255,0.4)'; c.lineWidth=1.5;
      c.beginPath(); c.moveTo(2,10); c.quadraticCurveTo(16,5,30,10); c.stroke();
      c.beginPath(); c.moveTo(2,22); c.quadraticCurveTo(16,17,30,22); c.stroke();
    });
    this.makeCanvas('exit', T, T, (c) => {                                                  // ornate gate
      c.fillStyle = '#2a1c0e'; c.fillRect(5,1,22,30);
      const g = c.createLinearGradient(8,4,24,28);
      g.addColorStop(0,'#f0c040'); g.addColorStop(1,'#a87a1e');
      c.fillStyle = g; c.fillRect(8,4,16,24);
      c.fillStyle = '#2a1c0e'; c.fillRect(15,8,2,18);
      c.fillStyle = '#fff0c0'; c.beginPath(); c.arc(11,15,1.6,0,Math.PI*2); c.arc(21,15,1.6,0,Math.PI*2); c.fill();
    });
    this.makeCanvas('brazier', T, T, (c) => {
      c.fillStyle = '#3a2a18'; c.fillRect(13,20,6,9);                                        // stand
      c.fillStyle = '#5a3a1e'; c.beginPath(); c.ellipse(16,19,9,4,0,0,Math.PI*2); c.fill();  // bowl
      c.fillStyle = '#ff7a20'; c.beginPath(); c.moveTo(16,4); c.lineTo(11,18); c.lineTo(21,18); c.closePath(); c.fill();
      c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(16,9); c.lineTo(13,18); c.lineTo(19,18); c.closePath(); c.fill();
    });
    this.makeCanvas('pillar', T, T, (c) => {
      const g = c.createLinearGradient(0,0,T,0);
      g.addColorStop(0,'#8a3a1e'); g.addColorStop(0.5,'#b1572e'); g.addColorStop(1,'#7e3018');
      c.fillStyle = g; c.fillRect(7,2,18,28);
      c.fillStyle = '#d9a441'; c.fillRect(5,2,22,4); c.fillRect(5,26,22,4);
    });

    /* ---------- FX textures ---------- */
    this.makeCanvas('light', 256, 256, (c) => {
      const g = c.createRadialGradient(128,128,0,128,128,128);
      g.addColorStop(0,'rgba(255,255,255,1)');
      g.addColorStop(0.45,'rgba(255,255,255,0.6)');
      g.addColorStop(1,'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0,0,256,256);
    });
    this.makeCanvas('spark', 8, 8, (c) => {
      const g = c.createRadialGradient(4,4,0,4,4,4);
      g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(1,'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0,0,8,8);
    });
    this.makeCanvas('vignette', 256, 256, (c) => {
      const g = c.createRadialGradient(128,128,60,128,128,150);
      g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(1,'rgba(255,255,255,1)');
      c.fillStyle = g; c.fillRect(0,0,256,256);
    });
  }
}
window.BootScene = BootScene;
