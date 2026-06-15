/* ============================================================
 * main.js — Phaser configuration & scene routing.
 * ============================================================ */
const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 832,
  height: 576,
  backgroundColor: '#1a120b',
  pixelArt: false,
  render: { antialias: true, antialiasGL: true, roundPixels: true, mipmapFilter: 'LINEAR_MIPMAP_LINEAR' },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x:0, y:0 }, debug: false },
  },
  scene: [BootScene, MenuScene, StealthScene, BuildScene, VictoryScene],
};

window.addEventListener('load', () => {
  window.game = new Phaser.Game(config);
});
