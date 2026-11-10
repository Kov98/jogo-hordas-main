// ============================================================
//  MAIN — configuração do Phaser e início do jogo.
// ============================================================
window.GAME = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: CONFIG.width,
  height: CONFIG.height,
  backgroundColor: '#07060a',
  pixelArt: true,
  // No Phaser 3.80.1, a contagem inclui o índice 0 do mouse: 3 permite dois toques.
  input: { activePointers: 3 },
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  fps: { target: 60 },
  disableContextMenu: true,
  scene: [BootScene, MenuScene, SelectScene, StageSelectScene, DifficultyScene, GameScene, UIScene, EndScene, IntroScene, FinaleOverlayScene],
});
