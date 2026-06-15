/* ============================================================
 * VictoryScene.js — end screen (all acts cleared + moat sealed).
 * ============================================================ */
class VictoryScene extends Phaser.Scene {
  constructor(){ super('VictoryScene'); }

  create(){
    const { width, height } = this.scale;
    const RES = window.DPR || 2;
    if(window.UI) UI.hideHUD();
    if(window.Sound) Sound.victory();
    if(window.GameSave) GameSave.clear();   // game complete — clear the save slot

    this.add.rectangle(0, 0, width, height, 0x140d07).setOrigin(0);
    for(let x=0; x<width; x+=32) this.add.image(x+16, height-16, 'wall');

    // celebratory embers rising across the base
    this.add.particles(width/2, height, 'spark', {
      x:{min:0,max:width}, speedY:{min:-60,max:-130}, speedX:{min:-20,max:20},
      scale:{start:0.9,end:0}, alpha:{start:1,end:0}, lifespan:{min:1400,max:2400},
      frequency:50, tint:[0xffd24a,0xff8a20,0xf0c040], blendMode:'ADD',
    });

    const t = this.add.text(width/2, height/2 - 70, 'IGODOMIGODO ENDURES',
      { fontFamily:'Georgia', fontSize:'42px', color:'#f0c040', fontStyle:'bold', resolution:RES }).setOrigin(0.5);
    t.setShadow(0, 4, '#000', 10, true, true);
    this.add.text(width/2, height/2 - 8,
      'The Great Iya rings the city. The Sky-Kings are guarded.',
      { fontFamily:'Georgia', fontSize:'18px', color:'#E06040', resolution:RES }).setOrigin(0.5)
      .setShadow(0,2,'#000',5,false,true);
    this.add.text(width/2, height/2 + 42,
      `Cowries gathered: ${GameState.cowries}     Plaques forged: ${Object.keys(GameState.ownedPlaques).length}/3`,
      { fontFamily:'monospace', fontSize:'14px', color:'#e8d6a8', resolution:RES }).setOrigin(0.5);

    const p = this.add.text(width/2, height/2 + 104, '▶  Click to return to the title',
      { fontFamily:'Georgia', fontSize:'16px', color:'#ffffff', resolution:RES }).setOrigin(0.5);
    this.tweens.add({ targets:p, alpha:0.3, duration:800, yoyo:true, repeat:-1 });

    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.input.once('pointerdown', () => this.scene.start('MenuScene'));
  }
}
window.VictoryScene = VictoryScene;
