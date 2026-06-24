/* ============================================================
 * MenuScene.js — title screen, narrative intro, Continue/New.
 * ============================================================ */
class MenuScene extends Phaser.Scene {
  constructor(){ super('MenuScene'); }

  create(){
    const { width, height } = this.scale;
    const RES = window.DPR || 2;
    if(window.UI){ UI.hideHUD(); UI.showHelpButton(); }
    this.savedData = null;

    this.add.rectangle(0, 0, width, height, 0x140d07).setOrigin(0);
    for(let x=0; x<width; x+=32){ this.add.image(x+16, 16, 'wall'); this.add.image(x+16, height-16, 'wall'); }

    // braziers with embers
    [104, width-104].forEach(x => {
      this.add.image(x, height/2 + 30, 'brazier').setScale(1.7);
      this.add.particles(x, height/2 + 12, 'spark', {
        speed:{min:8,max:26}, angle:{min:255,max:285}, gravityY:-14,
        scale:{start:0.9,end:0}, alpha:{start:0.9,end:0}, lifespan:{min:600,max:1100},
        frequency:80, tint:[0xffd24a,0xff8a20], blendMode:'ADD',
      });
    });

    const title = this.add.text(width/2, height/2 - 104, 'IYA',
      { fontFamily:'Georgia', fontSize:'92px', color:'#E06040', fontStyle:'bold', resolution:RES }).setOrigin(0.5);
    title.setShadow(0, 4, '#000000', 10, true, true);
    this.tweens.add({ targets:title, scale:{ from:0.94, to:1 }, duration:1600, yoyo:true, repeat:-1, ease:'Sine.inOut' });

    this.add.text(width/2, height/2 - 34, 'Guardians of the Sky-Kings',
      { fontFamily:'Georgia', fontSize:'27px', color:'#f0c040', resolution:RES }).setOrigin(0.5)
      .setShadow(0,2,'#000',6,false,true);
    this.add.text(width/2, height/2 + 2, 'Benin City  •  the age of Oba Ewuare',
      { fontFamily:'Georgia', fontSize:'15px', color:'#d8b88a', resolution:RES }).setOrigin(0.5);

    const prompt = this.add.text(width/2, height/2 + 70, '▶  Press ENTER or Click for a New Game',
      { fontFamily:'Georgia', fontSize:'19px', color:'#ffffff', resolution:RES }).setOrigin(0.5)
      .setShadow(0,2,'#000',5,false,true);
    this.tweens.add({ targets:prompt, alpha:0.25, duration:850, yoyo:true, repeat:-1 });

    this.continueText = this.add.text(width/2, height/2 + 104, '',
      { fontFamily:'Georgia', fontSize:'16px', color:'#7fd08a', resolution:RES }).setOrigin(0.5);

    // controls bar — keycap badges
    this.drawControlsBar(width, height - 42, RES);

    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.input.keyboard.once('keydown-ENTER', () => this.begin());
    this.input.once('pointerdown', () => this.begin());
    this.input.keyboard.on('keydown-C', () => { if(this.savedData) this.continueGame(); });

    // look for an existing save
    if(window.GameSave){
      GameSave.load().then(d => {
        if(d && (d.currentAct > 1 || (d.cowries != null && d.cowries !== 40) ||
                 Object.keys(d.ownedPlaques||{}).length || Object.keys(d.moatDug||{}).length)){
          this.savedData = d;
          this.continueText.setText(`Press  C  to Continue  —  Act ${({1:'I',2:'II',3:'III'}[d.currentAct]||d.currentAct)}, ${d.cowries} cowries`);
          this.tweens.add({ targets:this.continueText, alpha:{ from:0.5, to:1 }, duration:900, yoyo:true, repeat:-1 });
        }
      });
    }
  }

  drawControlsBar(width, y, RES){
    const items = [
      { key:'WASD', label:'Move' },
      { key:'F', label:'Forge' },
      { key:'B', label:'Moat' },
      { key:'Esc', label:'Pause' },
      { key:'H', label:'Help' },
      { key:'M', label:'Mute' },
    ];
    const keyH = 22;
    const groups = items.map(it => {
      const kw = Math.max(26, it.key.length * 9 + 14);
      const lw = it.label.length * 7.5 + 4;
      return { ...it, kw, lw, w: kw + 6 + lw };
    });
    const gap = 16;
    const total = groups.reduce((s,g) => s + g.w, 0) + gap * (groups.length - 1);

    this.add.rectangle(width/2, y, total + 36, 36, 0x000000, 0.5).setStrokeStyle(1, 0x6b4a22);
    let x = width/2 - total/2;
    groups.forEach(g => {
      const cx = x + g.kw/2;
      this.add.rectangle(cx, y, g.kw, keyH, 0x2a1c10).setStrokeStyle(1.5, 0xd9a441);
      this.add.rectangle(cx, y - keyH/2 + 3, g.kw - 6, 3, 0xf0c040, 0.25);   // top highlight
      this.add.text(cx, y - 1, g.key,
        { fontFamily:'monospace', fontSize:'12px', color:'#f0c040', fontStyle:'bold', resolution:RES }).setOrigin(0.5);
      this.add.text(x + g.kw + 6, y, g.label,
        { fontFamily:'Georgia', fontSize:'13px', color:'#e8d6a8', resolution:RES }).setOrigin(0, 0.5);
      x += g.w + gap;
    });
  }

  begin(){
    if(window.Sound){ Sound.resume(); Sound.click(); Sound.startAmbient(); }
    GameState.reset();
    if(window.autosave) autosave();
    UI.showDialogue('The Elder Caster', [
      "Igodomigodo — the city of red walls. By night, the bronze still glows in the casters' pits.",
      "You are ADESUA, Royal Bronze Caster. The Ogiso loyalists move in shadow, sharpening knives for Oba Ewuare before the Igue festival.",
      "The polished red walls hold secrets, Adesua. Cast the brass... but watch the shadows.",
    ], () => this.scene.start('StealthScene'));
  }

  continueGame(){
    if(window.Sound){ Sound.resume(); Sound.click(); Sound.startAmbient(); }
    GameState.apply(this.savedData);
    this.scene.start('StealthScene');
  }
}
window.MenuScene = MenuScene;
