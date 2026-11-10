// ============================================================
//  INTRO — tela de abertura (aparece toda vez que o jogo é aberto).
//  Fundo preto, logo, créditos e descrição. Depois do OK (ou de alguns
//  segundos) a tela sobe devagar e revela o menu animado por trás.
//  Os textos e tempos ficam em CONFIG.intro (config.js).
// ============================================================
class IntroScene extends Phaser.Scene {
  constructor() { super('Intro'); }

  create() {
    const W = CONFIG.width, H = CONFIG.height, I = CONFIG.intro;
    this.done = false;
    this.ready = false;

    const root = this.add.container(0, 0);
    this.root = root;
    root.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 1));

    // Cada elemento aparece com um pequeno atraso
    const show = (obj, delay) => {
      obj.setAlpha(0);
      root.add(obj);
      this.tweens.add({ targets: obj, alpha: 1, duration: 800, delay });
      return obj;
    };

    if (this.textures.exists('logo60')) {
      const logo = this.add.image(W / 2, 128, 'logo60');
      const scale = Math.min(190 / logo.width, 190 / logo.height);
      logo.setScale(scale);
      show(logo, 300);
    }
    show(mkText(this, W / 2, 262, I.welcome, 22, '#9a8fb0').setOrigin(0.5), 1100);
    show(mkText(this, W / 2, 302, I.author, 38, '#ffe070', { strokeThickness: 5 }).setOrigin(0.5), 1700);
    show(mkText(this, W / 2, 348, I.school, 24, '#ffffff').setOrigin(0.5), 2300);
    show(mkText(this, W / 2, 380, I.course, 22, '#cfc8dc').setOrigin(0.5), 2800);
    show(this.add.rectangle(W / 2, 418, 420, 2, 0x8a6a3a), 3300);

    const title = mkText(this, W / 2, 452, CONFIG.title.toUpperCase(), 34, '#e6d6a8', { strokeThickness: 6 }).setOrigin(0.5);
    title.setShadow(0, 0, '#c01818', 16, true, true);
    show(title, 3500);
    show(mkText(this, W / 2, 490, I.description, 18, '#bdb8cc', { wordWrap: { width: 960 }, align: 'center', strokeThickness: 2, lineSpacing: 4 }).setOrigin(0.5, 0), 4000);
    show(mkText(this, W / 2, 606, I.wish, 22, '#ffe9a8').setOrigin(0.5), 4700);

    // Botão OK aparece depois de ~5 s
    const btn = mkButton(this, W / 2, 664, 200, 52, 'OK', () => this.finish(), { size: 26 });
    btn.objs.forEach((o) => { o.setAlpha(0); root.add(o); });
    btn.r.disableInteractive();
    this.time.delayedCall(I.okAfterMs, () => {
      this.ready = true;
      btn.r.setInteractive({ useHandCursor: true });
      this.tweens.add({ targets: btn.objs, alpha: 1, duration: 500 });
    });

    // ENTER, ESPAÇO ou clique em qualquer lugar (depois que o botão aparece)
    this.input.keyboard.on('keydown-ENTER', () => this.finish());
    this.input.keyboard.on('keydown-SPACE', () => this.finish());
    this.input.on('pointerdown', () => this.finish());
    // Se ninguém clicar, segue sozinho
    this.time.delayedCall(I.autoMs, () => this.finish(true));
  }

  finish(force) {
    if (this.done || (!this.ready && !force)) return;
    this.done = true;
    Sfx.play('ui');
    this.tweens.add({
      targets: this.root, y: -CONFIG.height - 20, duration: CONFIG.intro.slideMs, ease: 'Sine.easeInOut',
      onComplete: () => { this.scene.stop('Intro'); GamePortal.offerLogin(); },
    });
  }
}
