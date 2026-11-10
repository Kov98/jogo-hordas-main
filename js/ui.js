// ============================================================
//  UISCENE — interface sobreposta ao jogo: barras de vida e XP,
//  tempo, poderes, aviso de eventos, barra do chefe, escolha de
//  melhoria ao subir de nível e menu de pausa.
// ============================================================
class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  init(d) { this.G = d.game; this.ready = false; }

  create() {
    // A queued launch may run after GameScene has started the arrival film.
    this.scene.setVisible(!this.G.cinematic);
    const W = CONFIG.width, H = CONFIG.height;
    this.add.image(W / 2, H / 2, 'vignette').setDepth(0).setAlpha(0.85);
    this.hurt = this.add.rectangle(W / 2, H / 2, W, H, 0xff0000, 0).setDepth(1);
    this.g = this.add.graphics().setDepth(10);

    this.txtLvl = mkText(this, W / 2, 15, 'NV 1', 14, '#ffffff').setOrigin(0.5).setDepth(12);
    this.heart = this.add.image(30, 50, 'i_heart').setScale(0.6).setDepth(12);
    this.txtHp = mkText(this, 175, 50, '', 15, '#ffffff').setOrigin(0.5).setDepth(12);
    this.txtTime = mkText(this, W / 2, 50, '00:00', 26, '#e8e0d0').setOrigin(0.5).setDepth(12);
    this.txtKills = mkText(this, W - 16, 36, '', 18, '#cfc8d8').setOrigin(1, 0).setDepth(12);
    this.txtDamage = mkText(this, W - 16, 64, '', 15, '#c0b5cb').setOrigin(1, 0).setDepth(12);
    this.txtPoints = mkText(this, W - 16, 86, '', 15, '#dfc989').setOrigin(1, 0).setDepth(12);
    this.txtMode = mkText(this, W - 16, 108, '', 12, '#9b8fa8').setOrigin(1, 0).setDepth(12);
    this.txtBoss = mkText(this, W / 2, 600, 'CAVALEIRO SOMBRIO', 20, '#ff6a6a').setOrigin(0.5).setDepth(12).setVisible(false);
    this.ann = mkText(this, W / 2, 150, '', 32, '#ffffff', { strokeThickness: 6, wordWrap:{width:W-80}, align:'center' }).setOrigin(0.5).setDepth(14).setAlpha(0);
    this.annT = 0;
    this.txtStage = mkText(this, W / 2, 105, '', 12, '#b5c4c0').setOrigin(0.5).setDepth(12);
    this.txtGate = mkText(this, W / 2, H - 165, '', 18, '#efd49b').setOrigin(0.5).setDepth(31).setVisible(false);
    this.gateButton = mkButton(this, W / 2, H - 115, 360, 48, 'INTERAGIR', () => this.G.interactNearby(), { size: 22, depth: 30 });
    this.gateButton.objs.forEach(o => o.setVisible(false));
    this.txtEvent = mkText(this, W / 2, 85, '', 12, '#a296b3').setOrigin(0.5).setDepth(12);
    this.txtDash = mkText(this, 20, H - 47, '', 14, '#c6dae8').setDepth(12);
    this.txtRelics = mkText(this, 18, 174, '', 12, '#ceb5ed', {wordWrap:{width:900}}).setDepth(12);
    this.txtExploration = mkText(this, 18, H - 85, '', 12, '#a8bfb3').setDepth(12);
    this.txtSecretBoss = mkText(this, W / 2, 520, '', 16, '#d5a8ff').setOrigin(0.5).setDepth(12).setVisible(false);
    this.miniTexts = [0, 1].map(i => mkText(this, W / 2, 566 + i * 44, '', 15, '#d7b6ed').setOrigin(0.5).setDepth(12).setVisible(false));
    if (this.sys.game.device.input.touch) {
      this.dashButton = this.add.circle(W - 76, H - 170, 42, 0x21172f, 0.85).setStrokeStyle(3, 0xafa0d0).setDepth(30).setInteractive();
      this.dashButton.on('pointerdown', (pointer, x, y, event) => { if (!this.G.cinematic && !this.paused && !this.lvlActive && !this.G.ended) this.G.requestDash = true; event.stopPropagation(); });
      mkText(this, W - 76, H - 170, 'DASH', 17, '#ddd2ef').setOrigin(0.5).setDepth(31);
    }
    this.txtDbg = this.G.debug ? mkText(this, W - 16, 130, '', 13, '#9aff9a').setOrigin(1, 0).setDepth(12) : null;

    // casas de poderes (linha 1) e melhorias de atributos (linha 2)
    this.slots = []; this.pslots = [];
    for (let i = 0; i < 24; i++) {
      this.slots.push({ img: this.add.image(0, 0, 'i_slash').setVisible(false).setDepth(12), txt: mkText(this, 0, 0, '', 13, '#ffe9a8', { strokeThickness: 3 }).setOrigin(1, 1).setVisible(false).setDepth(13) });
      this.pslots.push({ img: this.add.image(0, 0, 'i_heart').setVisible(false).setDepth(12), txt: mkText(this, 0, 0, '', 11, '#bff0c0', { strokeThickness: 3 }).setOrigin(1, 1).setVisible(false).setDepth(13) });
    }
    this.sig = ''; this.prevLv = {};
    this.bossLag = 1;
    this.lvlObjs = []; this.lvlActive = false; this.paused = false; this.pauseObjs = [];

    const K = this.input.keyboard;
    K.on('keydown-ESC', () => this.togglePause());
    K.on('keydown-P', () => this.togglePause());
    K.on('keydown-M', () => { const m = Sfx.toggle(); this.announce(m ? 'Som desligado' : 'Som ligado', 0xcfc8d8); });
    K.on('keydown-F', () => { if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen(); });
    K.on('keydown-ONE', () => this.choose(0));
    K.on('keydown-TWO', () => this.choose(1));
    K.on('keydown-THREE', () => this.choose(2));

    // pausa automática ao perder o foco da janela
    this.onBlur = () => { if (this.ready && !this.paused && !this.lvlActive && !this.G.ended) this.togglePause(); };
    this.game.events.on('blur', this.onBlur);
    this.events.once('shutdown', () => { this.ready = false; this.game.events.off('blur', this.onBlur); });
    this.ready = true;
  }

  announce(msg, color) {
    this.ann.setFontSize(msg.length>80?22:msg.length>55?26:32).setText(msg).setColor('#' + (color || 0xffffff).toString(16).padStart(6, '0')).setAlpha(1);
    this.annT = 3.0;
  }

  // ---------------------------------------------------------- HUD por frame
  bar(x, y, w, h, frac, col, bg) {
    const g = this.g;
    frac = clamp(frac, 0, 1);
    g.fillStyle(bg, 1); g.fillRect(x, y, w, h);
    g.fillStyle(col, 1); g.fillRect(x + 2, y + 2, (w - 4) * frac, h - 4);
    g.fillStyle(0xffffff, 0.2); g.fillRect(x + 2, y + 2, (w - 4) * frac, Math.max(1, (h - 4) / 3));
    g.lineStyle(2, 0x080f19, 1); g.strokeRect(x, y, w, h);
    g.lineStyle(1, 0x9a927b, 0.55); g.strokeRect(x - 1, y - 1, w + 2, h + 2);
    for (const edge of [x - 2, x + w - 2]) { g.fillStyle(0xc2ad7b, 1); g.fillRect(edge, y - 2, 4, 4); g.fillRect(edge, y + h - 2, 4, 4); }
  }

  update(time, delta) {
    const G = this.G, p = G.player;
    if (!p || !this.ready) return;
    const dt = delta / 1000, W = CONFIG.width, g = this.g;
    g.clear();

    // XP e vida
    this.bar(12, 6, W - 24, 18, p.level >= 100 ? 1 : p.xp / p.xpNext, 0x2a7ae8, 0x0e0b16);
    const low = p.hp / p.maxHp < 0.3;
    this.bar(48, 38, 250, 24, p.hp / p.maxHp, low && Math.floor(time / 180) % 2 ? 0xff5a5a : 0xd02a3a, 0x1a0a10);
    this.setText(this.txtLvl, 'NV ' + p.level + (p.level >= 100 ? ' MAX' : ''));
    this.setText(this.txtStage, 'FASE ' + G.stage.number + '/3 • ' + G.stage.shortName.toUpperCase());
    this.setText(this.txtHp, Math.ceil(p.hp) + ' / ' + p.maxHp);
    this.setText(this.txtTime, fmtTime(G.t) + ' / ' + fmtTime(G.bossTime));
    this.setText(this.txtKills, 'Abates: ' + G.totalKills);
    this.setText(this.txtDamage, 'Dano: ' + Math.floor(G.totalDamage).toLocaleString('pt-BR'));
    this.setText(this.txtPoints, 'Pontos: ' + G.points.toLocaleString('pt-BR'));
    this.setText(this.txtMode, G.difficulty.name.toUpperCase() + ' • ' + (G.isPractice ? 'TREINO' : GamePortal.user ? GamePortal.user.username : 'VISITANTE'));
    if (this.txtDbg) this.setText(this.txtDbg, 'FPS ' + Math.round(this.game.loop.actualFps) + '  inim. ' + G.enemies.alive + '  gemas ' + G.gems.items.filter((s) => s.live).length);

    const next = G.t < 300 ? 'Miniboss: 05:00' : G.t < 600 ? 'Miniboss: 10:00' : 'Chefe final: ' + fmtTime(G.bossTime);
    this.setText(this.txtEvent, G.stageCleared ? G.stageId === 'castle' ? 'O chão se rompe • queda para o Inferno' : 'Passagem aberta • siga os lampiões ao norte ↑' : G.bossStarted ? G.stage.bossName : next);
    const cooldown = Math.max(0, p.dashCd || 0);
    const dashName = p.dashSmoke || p.smokeDash ? 'FUMAÇA' : 'DASH';
    this.setText(this.txtDash, dashName + ' Nv' + p.dashLevel + ' • ' + (cooldown > 0 ? cooldown.toFixed(1) + 's' : 'PRONTO') + '  [SHIFT / ESPAÇO]');
    this.bar(20, CONFIG.height - 25, 138, 10, 1 - cooldown / p.dashCooldown, p.dashSmoke || p.smokeDash ? 0xc1a2e7 : 0x729cca, 0x100c18);
    const minis = G.encounters.active;
    this.miniTexts.forEach((text, i) => {
      const mini = minis[i]; text.setVisible(!!mini);
      if (!mini) return;
      this.setText(text, mini.def.name.toUpperCase());
      this.bar(W / 2 - 210, 579 + i * 44, 420, 15, mini.hp / mini.maxHp, i ? 0xc9904d : 0x9868d1, 0x130d20);
    });

    // flash vermelho ao levar dano / vida baixa
    const tgt = (p.flash > 0 ? 0.2 : 0) + (low && !p.dead ? 0.07 + 0.05 * Math.sin(time / 150) : 0);
    this.hurt.setAlpha(lerp(this.hurt.alpha, tgt, Math.min(1, dt * 14)));

    // poderes e atributos
    const sig = p.powers.map((w) => w.def.id + w.level).join(',') + '|' + Object.keys(p.passives).map((k) => k + p.passives[k]).join(',');
    if (sig !== this.sig) { this.sig = sig; this.refreshSlots(); }
    for (let i = 0; i < p.powers.length; i++) { const x = 16 + i * 54; g.fillStyle(0x0e0b14, 0.9); g.fillRect(x, 74, 48, 48); g.lineStyle(2, p.powers[i].maxed ? 0xffd070 : 0x4a3c5c, 1); g.strokeRect(x, 74, 48, 48); }
    const pk = Object.keys(p.passives);
    for (let i = 0; i < pk.length; i++) { const x = 16 + i * 40; g.fillStyle(0x0e0b14, 0.9); g.fillRect(x, 128, 36, 36); g.lineStyle(2, 0x3a5a44, 1); g.strokeRect(x, 128, 36, 36); }

    const relics=p.relics || [];
    this.setText(this.txtRelics, relics.length ? 'Relíquias '+relics.length+'/3 · '+relics.map(id=>RELICS[id]?.name || id).join(' · ') : 'Relíquias 0/3 · encontre altares amaldiçoados');
    const status=G.exploration?.getStatus();
    this.setText(this.txtExploration,status && !G.bossStarted ? 'Altares '+status.altarsUsed+'/'+status.altarCount+(G.stageId==='forest'?' · Símbolos '+status.symbolsFound+'/'+status.symbolCount:'') : '');
    const secret=status?.boss;
    this.txtSecretBoss.setVisible(!!secret);
    if(secret){this.setText(this.txtSecretBoss,secret.name.toUpperCase());this.bar(W/2-210,536,420,14,secret.hp/secret.maxHp,0x9d67cf,0x1b1226);}
    const prompt=G.exploration?.getPrompt();
    const nearGate = !!(G.nearStageExit ? G.nearStageExit() : G.nearCastleGate());
    const gateUi = (nearGate || !!prompt) && !G.cinematic && !G.explorationOpen && !this.lvlActive && !this.paused && !G.ended;
    this.txtGate.setVisible(gateUi);
    if (gateUi) this.setText(this.txtGate, prompt || (G.transitioning ? 'Atravessando…' : G.stageCleared ? 'Passagem liberada • E / ENTER ou toque' : 'Passagem selada • derrote o guardião da fase'));
    const canEnter = gateUi && (!!prompt || G.stageCleared) && !G.transitioning;
    this.gateButton.t.setText(prompt ? 'INTERAGIR · E / ENTER' : G.stageId==='castle' ? 'ENTRAR NO INFERNO' : 'ENTRAR NO CASTELO');
    this.gateButton.objs.forEach(o => o.setVisible(canEnter));

    // chefe
    const b = G.boss;
    if (b && !G.stageCleared && (b.alive || b.state === 'dead')) {
      const f = clamp(b.hp / b.maxHp, 0, 1);
      this.bossLag = Math.max(f, this.bossLag - dt * 0.35);
      const x = 340, y = 622, w = 600, h = 24;
      g.fillStyle(0x12060a, 1); g.fillRect(x, y, w, h);
      g.fillStyle(0xffd0a0, 0.55); g.fillRect(x + 2, y + 2, (w - 4) * this.bossLag, h - 4);
      g.fillStyle(b.fury ? 0xff2a2a : 0xb01828, 1); g.fillRect(x + 2, y + 2, (w - 4) * f, h - 4);
      g.fillStyle(0xffffff, 0.18); g.fillRect(x + 2, y + 2, (w - 4) * f, 6);
      g.fillStyle(0xffd070, 1); g.fillRect(x + 2 + (w - 4) * (b.data?.furyAt || BOSS.furyAt) - 1, y - 3, 2, h + 6);   // marca da fúria
      g.lineStyle(3, b.invuln ? 0x8a8aff : 0x000000, 1); g.strokeRect(x, y, w, h);
      this.txtBoss.setVisible(true).setText(G.stage.bossName.toUpperCase() + (b.fury ? ' — FÚRIA' : '')).setColor(b.fury ? '#ff3a3a' : '#ff8a8a');
    } else this.txtBoss.setVisible(false);

    // aviso central
    if (this.annT > 0) { this.annT -= dt; this.ann.setAlpha(clamp(this.annT / 0.6, 0, 1)); if (this.annT <= 0) this.ann.setAlpha(0); }
  }

  setText(t, s) { if (t.text !== s) t.setText(s); }

  refreshSlots() {
    const p = this.G.player;
    this.slots.forEach((s, i) => {
      const w = p.powers[i];
      if (!w) { s.img.setVisible(false); s.txt.setVisible(false); return; }
      const x = 16 + i * 54;
      s.img.setTexture('i_' + w.def.icon).setPosition(x + 24, 98).setScale(0.88).setVisible(true);
      s.txt.setText(w.maxed ? 'MAX' : 'Nv' + w.level).setPosition(x + 46, 121).setVisible(true).setColor(w.maxed ? '#ffd070' : '#ffe9a8');
      if (this.prevLv[w.def.id] !== undefined && this.prevLv[w.def.id] !== w.level || this.prevLv[w.def.id] === undefined && this.slotsInit) {
        this.tweens.add({ targets: s.img, scale: { from: 1.5, to: 0.88 }, duration: 380, ease: 'Back.easeOut' });
      }
      this.prevLv[w.def.id] = w.level;
    });
    const pk = Object.keys(p.passives);
    this.pslots.forEach((s, i) => {
      const id = pk[i];
      if (!id) { s.img.setVisible(false); s.txt.setVisible(false); return; }
      const def = PASSIVES.find((q) => q.id === id), x = 16 + i * 40;
      s.img.setTexture('i_' + def.icon).setPosition(x + 18, 146).setScale(0.55).setVisible(true);
      s.txt.setText(String(p.passives[id])).setPosition(x + 34, 162).setVisible(true);
      if (this.prevLv['p:' + id] !== p.passives[id]) this.tweens.add({ targets: s.img, scale: { from: 0.9, to: 0.55 }, duration: 380, ease: 'Back.easeOut' });
      this.prevLv['p:' + id] = p.passives[id];
    });
    this.slotsInit = true;
  }

  // ---------------------------------------------------------- escolha de melhoria
  describe(c) {
    const p = this.G.player;
    if (c.type === 'evolution') {
      const r = PROGRESSION_RECIPES.find(r => r.id === c.id);
      return { icon: r.icon, name: r.name, tag: r.kind === 'union' ? 'UNIÃO DE ARMAS' : r.kind === 'dash' ? 'DASH EVOLUÍDO' : 'ARMA EVOLUÍDA', desc: r.desc + (r.kind === 'union' ? ' Libera um espaço de arma.' : ''), col: 0xd2a6ff };
    }
    if (c.type === 'dash') return { icon: 'dash', name: 'Esquiva Ágil', tag: 'DASH  Nv ' + p.dashLevel + ' → ' + (p.dashLevel + 1), desc: 'Reduz a recarga e melhora o dash. No nível 3, pode evoluir com Passos Leves e um baú.', col: 0x8db6ee };
    if (c.type === 'new') { const d = POWERS[c.id]; return { icon: d.icon, name: d.name, tag: 'NOVO PODER', desc: d.desc, col: 0xe0b040 }; }
    if (c.type === 'upgrade') { const w = p.hasPower(c.id); return { icon: w.def.icon, name: w.def.name, tag: 'MELHORIA  Nv ' + w.level + ' → ' + (w.level + 1), desc: w.nextText(), col: 0x5ab0ff }; }
    if (c.type === 'passive') { const d = PASSIVES.find((q) => q.id === c.id), l = p.passives[c.id] || 0; return { icon: d.icon, name: d.name, tag: 'ATRIBUTO  Nv ' + l + ' → ' + (l + 1), desc: d.desc, col: 0x5adf7a }; }
    return { icon: 'heal', name: 'Banquete Sombrio', tag: 'RECUPERAÇÃO', desc: 'Restaura 40% da vida máxima.', col: 0xe05a7a };
  }

  showLevelUp(level, choices, cb, context = {}) {
    const W = CONFIG.width, H = CONFIG.height, O = this.lvlObjs;
    this.lvlActive = true; this.lvlChoices = choices; this.lvlCb = cb; this.lvlOpenAt = this.time.now;
    O.push(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.74).setDepth(100));
    const title = mkText(this, W / 2, 84, context.chest ? 'TESOURO DA MURALHA' : 'NÍVEL ' + level + '!', 58, '#ffe070', { strokeThickness: 8 }).setOrigin(0.5).setDepth(101);
    title.setShadow(0, 0, '#c8a640', 18, true, true);
    O.push(title);
    O.push(mkText(this, W / 2, 138, context.chest ? 'Escolha sua recompensa' : 'Escolha uma melhoria', 22, '#cfc8d8').setOrigin(0.5).setDepth(101));

    const n = choices.length, CW = 330, CH = 410, gap = 36;
    choices.forEach((c, i) => {
      const d = this.describe(c);
      const x = W / 2 + (i - (n - 1) / 2) * (CW + gap), y = 400;
      const card = [];
      const panel = this.add.rectangle(x, y, CW, CH, 0x15111d, 0.98).setStrokeStyle(4, d.col).setDepth(101).setInteractive({ useHandCursor: true });
      card.push(panel);
      card.push(mkText(this, x, y - 178, d.tag, 15, '#' + d.col.toString(16).padStart(6, '0')).setOrigin(0.5).setDepth(102));
      card.push(this.add.rectangle(x, y - 100, 120, 120, 0x0e0b14).setStrokeStyle(3, d.col).setDepth(102));
      card.push(this.add.image(x, y - 100, 'i_' + d.icon).setScale(2.2).setDepth(103));
      card.push(mkText(this, x, y - 14, d.name, 25, '#ffffff', { wordWrap: { width: CW - 30 }, align: 'center' }).setOrigin(0.5).setDepth(102));
      card.push(mkText(this, x, y + 22, d.desc, 18, '#cfc8dc', { wordWrap: { width: CW - 44 }, align: 'center', strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(102));
      card.push(mkText(this, x, y + 178, '[ ' + (i + 1) + ' ]', 22, '#8a7fa0').setOrigin(0.5).setDepth(102));
      panel.on('pointerover', () => { panel.setFillStyle(0x251c34); });
      panel.on('pointerout', () => { panel.setFillStyle(0x15111d); });
      panel.on('pointerdown', () => this.choose(i));
      // entrada animada
      card.forEach((o) => { o.setAlpha(0); this.tweens.add({ targets: o, alpha: 1, duration: 220, delay: 60 + i * 90 }); });
      this.tweens.add({ targets: panel, y: { from: y + 30, to: y }, duration: 260, delay: 60 + i * 90, ease: 'Back.easeOut' });
      O.push(...card);
    });
  }

  choose(i) {
    if (this.G.cinematic || GamePortal.dialogOpen || !this.lvlActive || this.time.now - this.lvlOpenAt < 350) return;   // evita clique acidental
    const c = this.lvlChoices[i];
    if (!c) return;
    this.lvlActive = false;
    Sfx.play('ui');
    for (const o of this.lvlObjs) o.destroy();
    this.lvlObjs.length = 0;
    const cb = this.lvlCb; this.lvlCb = null;
    if (cb) cb(c);
  }

  // ---------------------------------------------------------- pausa
  togglePause() {
    const G = this.G;
    if (G.cinematic || G.explorationOpen || GamePortal.dialogOpen || G.transitioning || G.ended || this.lvlActive || !G.player) return;
    const W = CONFIG.width, H = CONFIG.height, O = this.pauseObjs;
    if (!this.paused) {
      this.paused = true;
      G.scene.pause();
      O.push(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72).setDepth(100));
      O.push(mkText(this, W / 2, 230, 'PAUSADO', 64, '#e6d6a8', { strokeThickness: 8 }).setOrigin(0.5).setDepth(101));
      const b1 = mkButton(this, W / 2, 360, 320, 64, 'CONTINUAR', () => this.togglePause(), { size: 26, depth: 101 });
      const b2 = mkButton(this, W / 2, 440, 320, 64, 'MENU PRINCIPAL', () => { this.toMenu(); }, { size: 22, depth: 101 });
      O.push(...b1.objs, ...b2.objs);
      O.push(mkText(this, W / 2, 530, 'P / ESC: continuar   •   M: som   •   F: tela cheia', 16, '#9a8fb0').setOrigin(0.5).setDepth(101));
    } else {
      this.paused = false;
      for (const o of O) o.destroy();
      O.length = 0;
      G.scene.resume();
    }
  }

  toMenu() {
    this.paused = false;
    this.pauseObjs.length = 0;
    this.game.scene.stop('Game');
    this.game.scene.start('Menu');
    this.game.scene.stop('UI');
  }
}
