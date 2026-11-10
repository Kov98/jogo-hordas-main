// ============================================================
//  CENAS DE MENU — Boot (gera sprites), Menu, Seleção de personagem
//  e Fim de partida (vitória/derrota). Também ajudantes de UI.
// ============================================================
const FONT = '"Courier New", Courier, monospace';

function mkText(scene, x, y, str, size, color, extra) {
  return scene.add.text(x, y, str, Object.assign({
    fontFamily: FONT, fontSize: size + 'px', fontStyle: 'bold', color: color || '#e8e4f0',
    stroke: '#000000', strokeThickness: Math.max(2, Math.round(size / 8)),
  }, extra || {}));
}

function mkButton(scene, x, y, w, h, label, cb, o) {
  o = o || {};
  const depth = o.depth || 0;
  const r = scene.add.rectangle(x, y, w, h, 0x241c30).setStrokeStyle(3, 0x8a6a3a).setDepth(depth).setInteractive({ useHandCursor: true });
  const t = mkText(scene, x, y, label, o.size || 24, '#e8d8b0').setOrigin(0.5).setDepth(depth + 1);
  r.on('pointerover', () => { r.setFillStyle(0x3a2c4c).setStrokeStyle(3, 0xffd070); t.setColor('#ffffff'); });
  r.on('pointerout', () => { r.setFillStyle(0x241c30).setStrokeStyle(3, 0x8a6a3a); t.setColor('#e8d8b0'); });
  r.on('pointerdown', () => { Sfx.play('ui'); cb(); });
  return { r, t, objs: [r, t], destroy() { r.destroy(); t.destroy(); } };
}

// Fundo comum do menu e da seleção: paisagem animada (ver landscape.js)
function menuBackdrop(scene) {
  scene.cameras.main.setBackgroundColor('#07060a');
  return new Landscape(scene);
}

// ---------------------------------------------------------------- Boot
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    SPR.generateAll(this);
    const b = document.getElementById('boot');
    if (b) b.remove();
    document.title = CONFIG.title;
    const q = new URLSearchParams(location.search);
    let started = false;
    const go = async () => {
      if (started) return;
      started = true;
      await GamePortal.ready;
      if (q.has('char') && CHARACTERS[q.get('char')]) { this.scene.start('Game', { char: q.get('char'), difficulty: q.get('difficulty') || 'medium', stage: q.get('stage') || 'forest' }); return; }  // atalho para testes
      this.scene.start('Menu');
      if (q.has('nointro')) GamePortal.offerLogin();
      if (!q.has('nointro')) this.scene.launch('Intro');   // abertura por cima do menu (?nointro pula)
    };
    // A logo vem embutida em js/logo.js (base64), então funciona sem servidor
    if (typeof LOGO_B64 === 'string' && !this.textures.exists('logo60')) {
      this.textures.once('addtexture-logo60', go);
      this.textures.addBase64('logo60', LOGO_B64);
      setTimeout(go, 2500);   // segurança: não trava se a imagem falhar
    } else go();
  }
}

// ---------------------------------------------------------------- Menu
class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }
  create() {
    const W = CONFIG.width, H = CONFIG.height;
    this.cameras.main.fadeIn(350);
    menuBackdrop(this);

    // Morcegos pequenos aparecem somente durante a noite.
    this.menuBats = [];
    for (let i = 0; i < 5; i++) {
      const bat = this.add.sprite(-80, 200 + i * 60, 'e_bat', 0).setScale(1.15).setDepth(3).setAlpha(0);
      bat.play('walk_e_bat'); bat.anims.msPerFrame = 90;
      this.tweens.add({ targets: bat, x: W + 100, duration: 9000 + i * 1700, delay: i * 1800, repeat: -1 });
      this.tweens.add({ targets: bat, y: bat.y + 40, yoyo: true, repeat: -1, duration: 700 + i * 130, ease: 'Sine.easeInOut' });
      this.menuBats.push(bat);
    }
    this.menuLife = new MenuLife(this);
    this.menuSkeletons = this.menuLife.skeletons;
    this.menuVillagers = this.menuLife.villagers;

    // véu escuro para legibilidade
    this.add.image(W / 2, H / 2, 'vignette').setDepth(6).setAlpha(0.55);
    this.add.image(W / 2, 420, 'glow').setTint(0x000000).setScale(5.4, 2.9).setAlpha(0.62).setDepth(7);

    const t1 = mkText(this, W / 2, 112, CONFIG.title.toUpperCase(), 62, '#e6d6a8', { strokeThickness: 8 }).setOrigin(0.5).setDepth(10);
    t1.setShadow(0, 0, '#c01818', 22, true, true);
    this.tweens.add({ targets: t1, scaleX: 1.02, scaleY: 1.02, yoyo: true, repeat: -1, duration: 1800, ease: 'Sine.easeInOut' });

    this.btn = mkButton(this, W / 2, 392, 300, 72, 'JOGAR', () => this.go(), { size: 34, depth: 10 });
    mkText(this, W / 2, 458, 'ENTER ou ESPAÇO', 16, '#9a8fb0').setOrigin(0.5).setDepth(10);
    mkButton(this, W / 2, 532, 330, 46, 'COLEÇÃO E DESAFIOS · C', () => MetaProgress.openCollection(), {size:18,depth:10});
    mkText(this, W / 2, 668, 'WASD / SETAS: mover  •  SHIFT / ESPAÇO: dash  •  P: pausa  •  G: grimório', 17, '#a89cc0').setOrigin(0.5).setDepth(10);
    mkText(this, W / 2, 696, 'Floresta Sombria → Castelo → Inferno • 4 dificuldades', 15, '#7a6f90').setOrigin(0.5).setDepth(10);

    this.input.keyboard.on('keydown-ENTER', () => this.go());
    this.input.keyboard.on('keydown-SPACE', () => this.go());
    this.input.keyboard.on('keydown-M', () => Sfx.toggle());
    this.input.keyboard.on('keydown-C', event => { if (!GamePortal.dialogOpen) { event.preventDefault(); MetaProgress.openCollection(); } });
    this.going = false;
  }
  go() {
    if (this.going || this.scene.isActive('Intro')) return;   // espera a abertura terminar
    this.going = true;
    this.cameras.main.fadeOut(220);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Select'));
  }
}

// ---------------------------------------------------------------- Seleção de personagem
class SelectScene extends Phaser.Scene {
  constructor() { super('Select'); }
  create() {
    const W = CONFIG.width, H = CONFIG.height;
    this.cameras.main.fadeIn(250);
    menuBackdrop(this);
    this.add.image(W / 2, H / 2, 'vignette').setDepth(1);
    mkText(this, W / 2, 92, 'ESCOLHA SEU HERÓI', 30, '#e6d6a8', { strokeThickness: 5 }).setOrigin(0.5).setDepth(10);

    this.ids = Object.keys(CHARACTERS);
    this.sel = Math.max(0, this.ids.indexOf(this.registry.get('lastChar') || ''));
    this.cards = [];
    const cy = 385, CW = 284, CH = 520, gap = 26;

    this.ids.forEach((id, i) => {
      const c = CHARACTERS[id], x = W / 2 + (i - (this.ids.length - 1) / 2) * (CW + gap);
      const o = [];
      const panel = this.add.rectangle(x, cy, CW, CH, 0x15111d, 0.94).setStrokeStyle(4, 0x4a3c5c).setDepth(5).setInteractive({ useHandCursor: true });
      o.push(panel);
      const glow = this.add.image(x, cy - 170, 'glow').setTint(c.color).setBlendMode(Phaser.BlendModes.ADD).setScale(2.2).setAlpha(0.35).setDepth(5);
      const spr = this.add.sprite(x, cy - 170, 'c_' + id, 0).setScale(3).setDepth(6);
      spr.play('walk_' + id);
      o.push(glow, spr);
      o.push(mkText(this, x, cy - 76, c.name.toUpperCase(), 25, '#ffffff').setOrigin(0.5).setDepth(6));
      o.push(mkText(this, x, cy - 46, c.title, 12, '#e0b040').setOrigin(0.5).setDepth(6));
      o.push(mkText(this, x, cy - 24, c.desc, 14, '#bdb8cc', { wordWrap: { width: 244 }, align: 'center', strokeThickness: 2 }).setOrigin(0.5, 0).setDepth(6));
      o.push(mkText(this, x, cy + 72, `${c.hp} HP · ${c.speed} velocidade`, 13, '#d5e4e8', {strokeThickness:2}).setOrigin(0.5).setDepth(6));
      // poder inicial
      const pw = POWERS[typeof MetaProgress !== 'undefined' ? MetaProgress.loadout(id).startPower : c.startPower];
      o.push(this.add.rectangle(x, cy + 112, 252, 54, 0x0e0b14, 1).setStrokeStyle(2, 0x3a2f4c).setDepth(6));
      const powerIcon = this.add.image(x - 104, cy + 112, 'i_' + pw.icon).setScale(0.72).setDepth(7);
      o.push(powerIcon);
      o.push(mkText(this, x - 78, cy + 98, 'Poder inicial', 11, '#8a7fa0', { strokeThickness: 2 }).setDepth(7));
      const powerName = mkText(this, x - 78, cy + 114, pw.name, 16, '#ffe9a8', { strokeThickness: 3 }).setDepth(7);
      o.push(powerName);
      // atributos
      let k = 0;
      for (const label in c.stats) {
        const yy = cy + 170 + k * 26;
        o.push(mkText(this, x - 122, yy - 8, label, 13, '#cfc8dc', { strokeThickness: 2 }).setDepth(6));
        o.push(this.add.rectangle(x + 62, yy, 120, 12, 0x0a0810).setStrokeStyle(2, 0x3a2f4c).setDepth(6));
        const v = c.stats[label];
        o.push(this.add.rectangle(x + 4, yy, 116 * v, 8, c.color).setOrigin(0, 0.5).setDepth(7));
        k++;
      }
      panel.on('pointerover', () => this.select(i));
      panel.on('pointerdown', () => { this.select(i); this.confirm(); });
      mkButton(this, x, 654, 246, 26, 'PERSONALIZAR', () => {
        if (!this.going) MetaProgress.openCollection({char:id,onChange:()=>this.refreshLoadouts()});
      }, {size:13,depth:12});
      this.cards.push({ panel, glow, spr, powerIcon, powerName, objs: o });
    });

    mkText(this, W / 2, 690, '← → escolher   ENTER jogar   1 · 2 · 3 · 4 atalhos   C coleção   ESC voltar', 15, '#a89cc0').setOrigin(0.5).setDepth(10);

    const K = this.input.keyboard;
    K.on('keydown-LEFT', () => this.select((this.sel + this.ids.length - 1) % this.ids.length));
    K.on('keydown-A', () => this.select((this.sel + this.ids.length - 1) % this.ids.length));
    K.on('keydown-RIGHT', () => this.select((this.sel + 1) % this.ids.length));
    K.on('keydown-D', () => this.select((this.sel + 1) % this.ids.length));
    K.on('keydown-ONE', () => { this.select(0); this.confirm(); });
    K.on('keydown-TWO', () => { this.select(1); this.confirm(); });
    K.on('keydown-THREE', () => { this.select(2); this.confirm(); });
    K.on('keydown-FOUR', () => { this.select(3); this.confirm(); });
    K.on('keydown-ENTER', () => this.confirm());
    K.on('keydown-SPACE', () => this.confirm());
    K.on('keydown-ESC', () => this.back());
    K.on('keydown-C', event => { if (!this.going && !GamePortal.dialogOpen) { event.preventDefault(); MetaProgress.openCollection({char:this.ids[this.sel],onChange:()=>this.refreshLoadouts()}); } });
    this.going = false;
    this.select(this.sel, true);
    this.refreshLoadouts();
    this.onProfileLoadout = () => this.refreshLoadouts();
    window.addEventListener?.('muralha-session', this.onProfileLoadout);
    this.events.once('shutdown', () => window.removeEventListener?.('muralha-session', this.onProfileLoadout));
  }
  refreshLoadouts() {
    if (typeof MetaProgress === 'undefined') return;
    this.cards.forEach((card,i) => {
      const choice=MetaProgress.loadout(this.ids[i]), power=POWERS[choice.startPower];
      card.powerIcon.setTexture('i_'+power.icon); card.powerName.setText(power.name);
      const tint=MetaProgress.SKINS[choice.skin].tint;
      if (tint==null) card.spr.clearTint(); else card.spr.setTint(tint);
    });
  }
  select(i, silent) {
    if (this.going) return;
    if (i !== this.sel && !silent) Sfx.play('pick');
    this.sel = i;
    this.cards.forEach((c, n) => {
      const on = n === i;
      c.panel.setStrokeStyle(on ? 5 : 4, on ? 0xffd070 : 0x4a3c5c);
      c.glow.setAlpha(on ? 0.55 : 0.18);
      c.objs.forEach((o) => { if (o !== c.panel && o.setAlpha) o.setAlpha(on ? 1 : 0.62); });
      c.glow.setAlpha(on ? 0.55 : 0.15);
      c.spr.setScale(on ? 3.4 : 3);
    });
  }
  confirm() {
    if (this.going) return;
    this.going = true;
    const id = this.ids[this.sel];
    this.registry.set('lastChar', id);
    Sfx.play('ui');
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', async () => { await GamePortal.ready; this.scene.start('StageSelect', { char: id }); });
  }
  back() {
    if (this.going) return;
    this.going = true;
    this.scene.start('Menu');
  }
}

// ---------------------------------------------------------------- Fim de partida
class EndScene extends Phaser.Scene {
  constructor() { super('End'); }
  init(d) { this.d = d; }
  create() {
    const d = this.d, W = CONFIG.width, H = CONFIG.height, win = d.win;
    const col = win ? '#ffe070' : '#ff5a5a';
    this.add.rectangle(W / 2, H / 2, W, H, win ? 0x0a0614 : 0x120306, 0.82);
    this.add.rectangle(W / 2, H / 2 - 10, 680, 580, 0x15111d, 0.97).setStrokeStyle(4, win ? 0xc8a640 : 0x8a2a2a);
    mkText(this, W / 2, 82, resolveDifficulty(d.difficulty).name.toUpperCase() + ' • ' + resolveStage(d.stage || 'castle').shortName.toUpperCase(), 18, '#d9b77b').setOrigin(0.5);
    const title = mkText(this, W / 2, 130, win ? 'VITÓRIA!' : 'VOCÊ CAIU', 62, col, { strokeThickness: 8 }).setOrigin(0.5);
    title.setShadow(0, 0, win ? '#c8a640' : '#c01818', 20, true, true);
    this.tweens.add({ targets: title, scaleX: 1.04, scaleY: 1.04, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.easeInOut' });
    mkText(this, W / 2, 190, win ? 'O Arquidemônio caiu. As correntes se romperam e as almas estão livres.' : d.stage === 'forest' ? 'As raízes da floresta guardaram mais uma alma.' : d.stage === 'catacombs' ? 'A fortaleza do Inferno reclamou mais uma alma.' : 'As sombras do castelo reclamaram mais uma alma.', 17, '#b8a8c8', { wordWrap: { width: 580 }, align: 'center', strokeThickness: 2 }).setOrigin(0.5);

    const rows = [['Herói', CHARACTERS[d.char].name], ['Tempo de sobrevivência', fmtTime(d.time)], ['Nível alcançado', String(d.level)], ['Inimigos derrotados', String(d.kills)], ['Dano causado', Math.floor(d.damage || 0).toLocaleString('pt-BR')], ['Pontos', Math.floor(d.points || 0).toLocaleString('pt-BR')]];
    rows.forEach((r, i) => {
      mkText(this, W / 2 - 250, 240 + i * 32, r[0], 20, '#9a8fb0').setOrigin(0, 0.5);
      mkText(this, W / 2 + 250, 240 + i * 32, r[1], 22, '#ffffff').setOrigin(1, 0.5);
    });
    const saveLabel = mkText(this, W / 2, 442, 'Registrando resultado…', 14, '#b8a8c8').setOrigin(0.5);
    const currentResult = Symbol('resultado'); this.currentResult = currentResult;
    Promise.resolve(d.submission).then(result => {
      if (!this.scene.isActive() || this.currentResult !== currentResult) return;
      saveLabel.setText(result?.error ? result.error : result?.saved && result?.ranked ? 'Resultado salvo no ranking.' : d.practice || result?.saved ? 'Partida de treino: fora do ranking.' : GamePortal.user ? 'Resultado não salvo. Confira sua conexão ou sua sessão.' : 'Jogue conectado para registrar seu resultado.');
    });
    // poderes
    d.powers.forEach((p, i) => {
      const spacing = Math.min(76, 570 / Math.max(1, d.powers.length));
      const x = W / 2 - (d.powers.length - 1) * spacing / 2 + i * spacing;
      this.add.rectangle(x, 490, 56, 56, 0x0e0b14).setStrokeStyle(2, 0x3a2f4c);
      this.add.image(x, 488, 'i_' + p.icon).setScale(0.95);
      mkText(this, x + 23, 512, String(p.level), 14, '#ffe9a8', { strokeThickness: 3 }).setOrigin(1, 1);
    });

    mkButton(this, W / 2 - 150, 565, 270, 60, 'JOGAR NOVAMENTE', () => this.again(), { size: 20 });
    mkButton(this, W / 2 + 150, 565, 270, 60, 'MENU', () => this.menu(), { size: 22 });
    mkText(this, W / 2, 618, 'ENTER: jogar novamente   •   ESC: menu', 15, '#7a6f90').setOrigin(0.5);

    this.input.keyboard.on('keydown-ENTER', () => this.again());
    this.input.keyboard.on('keydown-R', () => this.again());
    this.input.keyboard.on('keydown-ESC', () => this.menu());
    this.done = false;
    Sfx.play(win ? 'win' : 'lose');
  }
  again() {
    if (this.done) return; this.done = true;
    this.game.scene.stop('UI');
    this.scene.start('Game', {
      char: this.d.char, difficulty: this.d.difficulty,
      stage: this.d.win ? this.d.startStage || 'forest' : this.d.stage || 'forest',
      checkpoint: this.d.win ? null : this.d.checkpoint,
    });
  }
  menu() {
    if (this.done) return; this.done = true;
    this.game.scene.stop('UI');
    this.game.scene.stop('Game');
    this.scene.start('Menu');
  }
}
