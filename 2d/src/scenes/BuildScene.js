/* ============================================================
 * BuildScene.js — Moat city-builder (16x16). Overlay over a
 * paused StealthScene. Dig the glowing ring with cowries.
 * ============================================================ */
class BuildScene extends Phaser.Scene {
  constructor(){ super('BuildScene'); }

  create(){
    const { width, height } = this.scale;
    this.grid = new MoatGrid();
    this.waterTiles = {};
    window.__buildOpen = true;

    if(window.Settings && !Settings.moatSeen && window.UI){
      Settings.moatSeen = true; Settings.save();
      UI.infoModal('The Great Iya (Moat)',
        'Dig the glowing ring of tiles with cowries (5 each). Seal the whole ring and the moat protects the city — fewer guards patrol at night, and a complete moat is required to win.',
        () => {});
    }

    const RES = window.DPR || 2;
    this.add.rectangle(0, 0, width, height, 0x0e0a05, 0.97).setOrigin(0);
    this.add.text(width/2, 24, 'THE GREAT IYA  —  Moat Construction',
      { fontFamily:'Georgia', fontSize:'24px', color:'#f0c040', resolution:RES }).setOrigin(0.5)
      .setShadow(0,2,'#000',5,false,true);
    this.info = this.add.text(width/2, 52, '',
      { fontFamily:'monospace', fontSize:'13px', color:'#e8d6a8', resolution:RES }).setOrigin(0.5);

    // progress bar
    this.barBg = this.add.rectangle(width/2, 70, 360, 8, 0x2a2016).setStrokeStyle(1, 0x5a4424);
    this.barFill = this.add.rectangle(width/2 - 180, 70, 1, 8, 0x2e8fd0).setOrigin(0, 0.5);

    this.add.text(width/2, height - 20,
      'Click the glowing ring tiles to dig (5 cowries each).    ESC / Back: return to the night',
      { fontFamily:'monospace', fontSize:'12px', color:'#cbb488', resolution:RES }).setOrigin(0.5);

    const size = 16, cell = 26;
    const gx = (width - size*cell) / 2, gy = 92;
    this.cellPx = cell; this.gx = gx; this.gy = gy;

    for(let r=0; r<size; r++){
      for(let c=0; c<size; c++){
        const req = this.grid.isRequired(r, c);
        const x = gx + c*cell, y = gy + r*cell;
        const rect = this.add.rectangle(x, y, cell-2, cell-2, 0x241b10).setOrigin(0);
        rect.setStrokeStyle(1, req ? 0xc9962f : 0x352818);
        rect.gridR = r; rect.gridC = c;
        if(req){
          rect.setInteractive({ useHandCursor:true });
          rect.on('pointerover', () => { if(!this.grid.isDug(r,c)) rect.setFillStyle(0x6b4a22); });
          rect.on('pointerout',  () => this.paint(rect));
          rect.on('pointerdown', () => this.dig(rect));
        }
        this.paint(rect);
        if(req && this.grid.isDug(r,c)) this.addWater(r, c);
      }
    }

    const back = this.add.text(width - 84, 24, '⟵ Back',
      { fontFamily:'Georgia', fontSize:'18px', color:'#E06040' })
      .setOrigin(0.5).setInteractive({ useHandCursor:true });
    back.on('pointerover', () => back.setColor('#ff8a6a'));
    back.on('pointerout',  () => back.setColor('#E06040'));
    back.on('pointerdown', () => this.close());
    this.input.keyboard.on('keydown-ESC', () => this.close());

    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.refresh();
  }

  paint(rect){
    if(this.grid.isDug(rect.gridR, rect.gridC)){ rect.setFillStyle(0x163a5e); return; }
    rect.setFillStyle(this.grid.isRequired(rect.gridR, rect.gridC) ? 0x4a3416 : 0x241b10);
  }

  addWater(r, c){
    const key = r + ',' + c;
    if(this.waterTiles[key]) return;
    const w = this.add.image(this.gx + c*this.cellPx + this.cellPx/2 - 1,
                             this.gy + r*this.cellPx + this.cellPx/2 - 1, 'water')
      .setDisplaySize(this.cellPx - 3, this.cellPx - 3);
    this.tweens.add({ targets:w, alpha:{ from:0.7, to:1 }, duration:900 + ((r*c)%400), yoyo:true, repeat:-1 });
    this.tweens.add({ targets:w, scale:{ from:w.scale*0.96, to:w.scale }, duration:1100, yoyo:true, repeat:-1 });
    this.waterTiles[key] = w;
  }

  dig(rect){
    const res = this.grid.dig(rect.gridR, rect.gridC);
    if(res === 'ok'){
      this.paint(rect);
      this.addWater(rect.gridR, rect.gridC);
      if(window.Sound) Sound.dig();
      this.refresh();
      if(window.autosave) autosave();
      if(this.grid.isComplete()) UI.toast('The Iya is sealed! Benin is ringed in water — patrols thin out.');
    } else if(res === 'poor'){
      UI.toast('Not enough cowries (need 5). Steal more in the night.');
    }
  }

  refresh(){
    const pct = Math.round(this.grid.progress() * 100);
    this.info.setText(`Cowries: ${GameState.cowries}      Moat: ${pct}%      (a sealed moat reduces night patrols)`);
    this.barFill.width = Math.max(1, 360 * this.grid.progress());
    if(window.UI) UI.updateHUD();
  }

  close(){
    if(window.Sound) Sound.click();
    window.__buildOpen = false;
    this.scene.stop();
    this.scene.resume('StealthScene');
  }
}
window.BuildScene = BuildScene;
