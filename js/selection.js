// Fases e dificuldade são escolhas por partida; o servidor valida o progresso.
class StageSelectScene extends Phaser.Scene {
  constructor() { super('StageSelect'); }
  init(data = {}) { this.charId = data.char; this.stageId = data.stage || 'forest'; }
  create() {
    const W = CONFIG.width;
    menuBackdrop(this);
    this.add.image(W / 2, 360, 'vignette').setDepth(4).setAlpha(0.9);
    mkText(this, W / 2, 98, 'ESCOLHA SEU CAMINHO', 42, '#e6d6a8').setOrigin(0.5).setDepth(10);
    mkText(this, W / 2, 138, 'Da floresta ao castelo. Além do último selo, a fortaleza do Inferno.', 18, '#b8acc7').setOrigin(0.5).setDepth(10);
    this.going = false;
    this.ids = ['forest', 'castle', 'catacombs'];
    this.sel = Math.max(0, this.ids.indexOf(this.stageId));
    const stages = [
      { id: 'forest', title: 'FLORESTA', color: 0x78aa86, subtitle: 'A FLORESTA DOS ESQUECIDOS',
        description: 'Siga os lampiões, enfrente os guardiões e abra a passagem para o castelo.' },
      { id: 'castle', title: 'CASTELO', color: 0xc6a06c, subtitle: 'A FORTALEZA SOMBRIA',
        description: 'Derrote o Cavaleiro. O chão se rompe e a queda na lava leva ao Inferno.' },
      { id: 'catacombs', title: 'INFERNO', color: 0xff9850, subtitle: 'A FORTALEZA DAS CORRENTES',
        description: 'Fortaleza em chamas. Chefe aos 15:00: Arquidemônio das Cinzas.' },
    ];
    this.cards = stages.map((stage, i) => {
      const x = 240 + i * 400, y = 374;
      const panel = this.add.rectangle(x, y, 360, 430, 0x15111d, 0.97).setStrokeStyle(2, stage.color).setDepth(10);
      const art = this.stageArt(stage.id, x - 156, y - 187);
      mkText(this, x - 148, y - 166, '0' + (i + 1), 17, '#d7c6a3').setDepth(12);
      mkText(this, x, y - 3, stage.title, 32, '#' + stage.color.toString(16).padStart(6, '0')).setOrigin(0.5).setDepth(12);
      mkText(this, x, y + 34, stage.subtitle, 13, '#a99bb8').setOrigin(0.5).setDepth(12);
      mkText(this, x, y + 62, stage.description, 17, '#cfc3d8', { wordWrap: { width: 308 }, align: 'center' }).setOrigin(0.5, 0).setDepth(12);
      const status = mkText(this, x, y + 163, '', 16, '#efd59c').setOrigin(0.5).setDepth(12);
      const shortcut = mkText(this, x, y + 192, '[ ' + (i + 1) + ' ]', 13, '#8b809d').setOrigin(0.5).setDepth(12);
      {
        panel.setInteractive({ useHandCursor: true });
        panel.on('pointerover', () => this.select(i));
        panel.on('pointerdown', () => { this.select(i); this.confirm(); });
      }
      return { ...stage, panel, art, status, shortcut };
    });
    this.hint = mkText(this, W / 2, 626, '', 17, '#a99bb8').setOrigin(0.5).setDepth(10);
    mkText(this, W / 2, 675, '← → escolher   •   1 · 2 · 3: iniciar   •   ENTER: confirmar   •   ESC: heróis', 17, '#8f829e').setOrigin(0.5).setDepth(10);
    const keyboard = this.input.keyboard;
    keyboard.on('keydown-LEFT', () => this.select((this.sel + 2) % 3));
    keyboard.on('keydown-A', () => this.select((this.sel + 2) % 3));
    keyboard.on('keydown-RIGHT', () => this.select((this.sel + 1) % 3));
    keyboard.on('keydown-D', () => this.select((this.sel + 1) % 3));
    ['ONE', 'TWO', 'THREE'].forEach((key, i) => keyboard.on('keydown-' + key, () => { this.select(i); this.confirm(); }));
    keyboard.on('keydown-ENTER', () => this.confirm());
    keyboard.on('keydown-SPACE', () => this.confirm());
    keyboard.on('keydown-ESC', () => { if (!this.going) { this.going = true; this.scene.start('Select'); } });
    const refresh = () => this.refreshProgress();
    window.addEventListener('muralha-session', refresh);
    this.events.once('shutdown', () => window.removeEventListener('muralha-session', refresh));
    this.refreshProgress();
    this.cameras.main.fadeIn(250);
  }
  stageArt(id, x, y) {
    const key = drawStagePreview(this, id);
    return this.add.image(x, y, key).setOrigin(0).setDepth(11);
  }
  refreshProgress() {
    this.cards.forEach((card) => {
      const playable = GamePortal.canPlayStage(card.id);
      card.status.setText(playable ? (card.id === 'forest' ? 'INICIAR CAMPANHA' : card.id === 'castle' ? 'ENTRAR NO CASTELO' : 'ENTRAR NO INFERNO') : card.id === 'catacombs' ? 'BLOQUEADO · CONCLUA O CASTELO' : 'BLOQUEADO · CONCLUA A FLORESTA');
      card.status.setFontSize(playable ? 16 : 13);
      card.status.setColor(playable ? '#efd59c' : '#9e8eaa');
      card.art.setAlpha(playable ? 1 : 0.78);
      if (card.panel.input) card.panel.input.cursor = playable ? 'pointer' : 'default';
    });
    this.select(this.sel);
  }
  select(i) {
    if (this.going || !this.cards[i]) return;
    this.sel = i;
    this.cards.forEach((card, index) => card.panel.setStrokeStyle(index === i ? 4 : 2, index === i ? 0xffdf9c : card.color)
      .setFillStyle(index === i ? 0x2a2034 : 0x15111d));
    const id = this.ids[i];
    this.hint.setText(!GamePortal.canPlayStage(id) ? (id === 'catacombs' ? 'Derrote o Cavaleiro: a queda na lava leva ao Inferno.' : 'Atravesse a floresta para liberar o castelo neste perfil.')
      : GamePortal.user ? `Progresso de ${GamePortal.user.username}` : 'Progresso de convidado salvo neste navegador.');
  }
  confirm() {
    const stage = this.ids[this.sel];
    if (this.going || !GamePortal.canPlayStage(stage)) return;
    this.going = true;
    Sfx.play('ui');
    this.cameras.main.fadeOut(220);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (!GamePortal.canPlayStage(stage)) {
        this.going = false; this.refreshProgress(); this.cameras.main.fadeIn(180); return;
      }
      this.scene.start('Difficulty', { char: this.charId, stage });
    });
  }
}

class DifficultyScene extends Phaser.Scene {
  constructor() { super('Difficulty'); }
  init(data = {}) { this.charId = data.char; this.stageId = resolveStage(data.stage).id; }
  create() {
    const W = CONFIG.width;
    menuBackdrop(this);
    this.add.image(W / 2, 360, 'vignette').setDepth(4).setAlpha(0.9);
    mkText(this, W / 2, 64, 'ESCOLHA SEU DESAFIO', 42, '#e6d6a8').setOrigin(0.5).setDepth(10);
    const journey=this.stageId==='catacombs'?'Inferno':this.stageId==='castle'?'Castelo → Inferno':'Floresta → Castelo → Inferno';
    mkText(this, W / 2, 113, journey+' • 15 min por fase • minibosses aos 5 e 10', 18, '#b8acc7').setOrigin(0.5).setDepth(10);
    this.going = false;
    this.ids = Object.keys(DIFFICULTIES);
    this.sel = Math.max(0, this.ids.indexOf(this.registry.get('difficulty') || 'medium'));
    this.cards = this.ids.map((id, i) => {
      const d = DIFFICULTIES[id], x = 175 + i * 310, y = 352;
      const panel = this.add.rectangle(x, y, 280, 370, 0x15111d, 0.97).setStrokeStyle(3, d.color).setDepth(10).setInteractive({ useHandCursor: true });
      const color = '#' + d.color.toString(16).padStart(6, '0');
      mkText(this, x, y - 137, '[ ' + (i + 1) + ' ]', 22, color).setOrigin(0.5).setDepth(11);
      mkText(this, x, y - 84, d.name.toUpperCase(), 29, color).setOrigin(0.5).setDepth(11);
      mkText(this, x, y - 31, d.desc, 17, '#d3c8df', { wordWrap: { width: 242 }, align: 'center' }).setOrigin(0.5, 0).setDepth(11);
      mkText(this, x, y + 100, 'PONTOS ×' + d.scoreMul.toLocaleString('pt-BR'), 21, '#f1d590').setOrigin(0.5).setDepth(11);
      mkText(this, x, y + 143, id === 'hardcore' ? 'SEM TRÉGUA' : 'SELECIONAR', 15, id === 'hardcore' ? '#ff6a67' : '#a59ab7').setOrigin(0.5).setDepth(11);
      panel.on('pointerover', () => this.select(i));
      panel.on('pointerdown', () => { this.select(i); this.confirm(); });
      return panel;
    });
    mkText(this, W / 2, 590, 'Ataques automáticos • SHIFT / ESPAÇO: dash • G: receitas do grimório', 18, '#b8acc7').setOrigin(0.5).setDepth(10);
    mkText(this, W / 2, 636, '← → escolher   •   1 a 4: iniciar   •   ENTER: confirmar   •   ESC: fases', 17, '#8f829e').setOrigin(0.5).setDepth(10);
    this.input.keyboard.on('keydown-LEFT', () => this.select((this.sel + 3) % 4));
    this.input.keyboard.on('keydown-RIGHT', () => this.select((this.sel + 1) % 4));
    ['ONE', 'TWO', 'THREE', 'FOUR'].forEach((key, i) => this.input.keyboard.on('keydown-' + key, () => { this.select(i); this.confirm(); }));
    this.input.keyboard.on('keydown-ENTER', () => this.confirm());
    this.input.keyboard.on('keydown-SPACE', () => this.confirm());
    this.input.keyboard.on('keydown-ESC', () => { if (!this.going) this.scene.start('StageSelect', { char: this.charId, stage: this.stageId }); });
    this.select(this.sel);
    this.cameras.main.fadeIn(250);
  }
  select(i) {
    if (this.going) return;
    this.sel = i;
    this.cards.forEach((card, index) => card.setStrokeStyle(index === i ? 5 : 2, index === i ? 0xffe3a0 : DIFFICULTIES[this.ids[index]].color).setFillStyle(index === i ? 0x2b2035 : 0x15111d));
  }
  confirm() {
    if (this.going) return;
    if (!GamePortal.canPlayStage(this.stageId)) {
      this.scene.start('StageSelect', { char: this.charId, stage: this.stageId }); return;
    }
    this.going = true;
    const difficulty = this.ids[this.sel];
    this.registry.set('difficulty', difficulty);
    Sfx.play('ui');
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (!GamePortal.canPlayStage(this.stageId)) { this.scene.start('StageSelect', { char: this.charId, stage: this.stageId }); return; }
      this.scene.start('Game', { char: this.charId, difficulty, stage: this.stageId });
    });
  }
}
