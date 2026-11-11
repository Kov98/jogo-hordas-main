// ============================================================
//  GAMESCENE — a partida: mapa, jogador, inimigos, chefe, níveis.
//  A cena é recriada por inteiro a cada partida (create), então
//  reiniciar nunca duplica árvores, pedras, inimigos ou eventos.
// ============================================================
class GameScene extends Phaser.Scene {
  // Only a validated door crossing or the completed castle fall owns this token.
  #stageAdvance = null;

  constructor() { super('Game'); }

  init(data = {}) {
    this.charId = CHARACTERS[data.char] ? data.char : 'vanguard';
    this.carry = data.carry || null;
    this.checkpoint = data.checkpoint || null;
    this.stageId = resolveStage(data.stage).id;
    this.stage = resolveStage(this.stageId);
    this.startStageId = this.carry?.startStageId || this.stageId;
    this.difficultyId = resolveDifficulty(data.difficulty || this.registry.get('difficulty') || 'medium').id;
    this.difficulty = resolveDifficulty(this.difficultyId);
  }

  async create() {
    this.#stageAdvance = null;
    this.gameReady = false;
    this.player = null;
    const initialization = Symbol('partida');
    this.initialization = initialization;
    this.cinematic = null;
    this.cinematicLagPolicy = null;
    this.cinematicWaits = new Set();
    this.events.once('shutdown', () => {
      if (this.initialization !== initialization) return;
      this.initialization = null;
      this.#stageAdvance = null;
      for (const cancel of [...this.cinematicWaits]) cancel();
      this.cinematicWaits.clear();
      this.restoreCinematicClock();
      this.cinematic = null;
      this.scene.stop('FinaleOverlay');
    });
    const q = new URLSearchParams(location.search);
    await GamePortal.ready;
    if (this.initialization !== initialization) return;
    this.metaProfileKey = this.carry?.metaProfileKey || (typeof MetaProgress !== 'undefined' ? MetaProgress.profileKey() : null);
    this.metaRunId = this.carry?.metaRunId || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,12);
    if (!this.carry && this.stageId !== 'forest' && !GamePortal.canPlayStage(this.stageId) && (GamePortal.user || !q.has('stage'))) {
      GamePortal.notice(this.stageId === 'catacombs' ? 'Conclua o Castelo para liberar o Inferno.' : 'Conclua a floresta e atravesse o portão para liberar o castelo.');
      this.scene.start('StageSelect', { char: this.charId });
      return;
    }
    const practice = GamePortal.isAdmin || !!this.carry?.practice || ['god', 't', 'boss', 'stage'].some(key => q.has(key));
    const run = this.carry ? this.carry.run : await GamePortal.beginRun(this.charId, practice, this.difficultyId, this.stageId).catch(error => ({ error: error.message, status: error.status }));
    if (this.initialization !== initialization) return;
    if (!this.carry && run?.profile_key) this.metaProfileKey = run.profile_key;
    // A phase retry belongs to the profile that captured it. Session refresh
    // may choose a different profile while beginRun is pending.
    if (this.checkpoint && this.checkpoint.metaProfileKey !== this.metaProfileKey) this.checkpoint = null;
    if (this.stageId !== 'forest' && run?.status === 403) {
      GamePortal.notice(run.error || 'Esta fase ainda está bloqueada.');
      this.scene.start('StageSelect', { char: this.charId });
      return;
    }
    this.runStart = Promise.resolve(run);
    this.isPractice = practice || !!run?.run_id && !run.ranked;
    if (!this.carry && run?.stage) { this.stageId = resolveStage(run.stage).id; this.stage = resolveStage(this.stageId); this.startStageId = this.stageId; }
    this.difficultyId = resolveDifficulty(run?.difficulty || this.difficultyId).id;
    this.difficulty = resolveDifficulty(this.difficultyId);
    this.buildScene(run?.settings || GamePortal.settings || {});
    if (this.stageId !== 'forest') await this.playStageArrival();
    if (this.initialization !== initialization) return;
    this.gameReady = true;
  }

  buildScene(settings) {
    // Parâmetros de URL (para testes): ?boss=30 &god &debug &t=200 &char=mage
    const q = new URLSearchParams(location.search);
    this.godMode = q.has('god') || !!this.carry?.godMode;
    this.debug = q.has('debug');
    this.bossTime = q.has('boss') ? parseFloat(q.get('boss')) : CONFIG.bossTime;

    // Regras públicas vêm do servidor e só são aplicadas ao iniciar uma partida.
    if (Number.isFinite(settings.healthDropChance)) CONFIG.healthDropChance = settings.healthDropChance;
    if (Number.isFinite(settings.bossTime)) CONFIG.bossTime = settings.bossTime;
    if (Number.isFinite(settings.spawnBaseRate)) CONFIG.spawn.baseRate = settings.spawnBaseRate;
    if (Number.isFinite(settings.spawnGrowth)) CONFIG.spawn.growth = settings.spawnGrowth;
    if (Number.isFinite(settings.maxEnemies)) CONFIG.maxEnemies = settings.maxEnemies;
    if (!q.has('boss')) this.bossTime = CONFIG.bossTime;

    // Estado da partida (tudo reiniciado aqui)
    this.t = !this.carry && q.has('t') ? parseFloat(q.get('t')) : 0;
    this.visualTime = this.t;
    this.elapsedBefore = this.carry?.elapsed || 0;
    this.totalKills = this.carry?.kills || 0;
    this.totalDamage = this.carry?.damage || 0;
    const stageScale = this.stage.number - 1;
    this.stageHpMul = this.carry ? 1 + .8 * stageScale : this.checkpoint?.stageHpMul || 1;
    this.stageSpawnMul = this.carry ? 1 + .15 * stageScale : this.checkpoint?.stageSpawnMul || 1;
    this.stageDamageMul = this.carry ? 1 + .2 * stageScale : this.checkpoint?.stageDamageMul || 1;
    this.saveError = this.carry?.saveError || null;
    this.stageCleared = false;
    this.transitioning = false;
    this.cinematic = null;
    this.forestVictory = null;
    this.castleVictory = null;
    this.finalVictoryStarted = false;
    this.runSubmission = null;
    this.ended = false;
    this.levelUpOpen = false;
    this.chestOpen = false;
    this.pendingLevels = this.carry?.pendingLevels || this.checkpoint?.pendingLevels || 0;
    this.lastOffer = [];
    this.spawningEnabled = true;
    this.bossStarted = false;
    this.boss = null;
    this.finale = null;
    this.hazards = [];
    this.botInput = null;
    this.requestDash = false;
    this.requestInteract = false;
    this.tmpA = []; this.tmpB = []; this.tmpC = []; this.tmpE = [];

    this.cameras.main.setBackgroundColor('#07060a');
    this.world = this.stageId === 'forest' ? new ForestWorld(this) : this.stageId === 'catacombs' ? new CatacombWorld(this) : new World(this);
    this.grid = new Grid(64);
    this.fx = new FX(this);

    const def = CHARACTERS[this.charId];
    this.player = new Player(this, def, CONFIG.player.start.x, CONFIG.player.start.y);
    if (this.carry) restorePlayerState(this.player, this.carry.player);
    else if (this.checkpoint) restorePlayerState(this.player, this.checkpoint.player);
    if (typeof MetaProgress !== 'undefined') MetaProgress.apply(this.player, this.player.loadout, this.metaProfileKey);
    if (!this.carry && !this.checkpoint) this.player.addPower(this.player.loadout?.startPower || def.startPower);

    this.pShots = new PlayerShots(this);
    this.enemyShots = new EnemyShots(this);
    this.gems = new Gems(this);
    this.enemies = new EnemyManager(this);
    this.progression = new ProgressionSystem(this);
    this.progression.consumed = new Set(this.carry?.consumed || this.checkpoint?.consumed || []);
    this.progression.completed = new Set(this.carry?.completed || this.checkpoint?.completed || []);
    this.encounters = new EncounterDirector(this);
    this.exploration = new ExplorationSystem(this, this.checkpoint?.exploration || {});
    this.soundscape = new Soundscape(this);
    this.phaseCheckpoint = {
      metaProfileKey: this.metaProfileKey,
      player: capturePlayerState(this.player),
      exploration: this.exploration.capture(),
      consumed: [...this.progression.consumed], completed: [...this.progression.completed],
      pendingLevels: this.pendingLevels,
      stageHpMul: this.stageHpMul, stageSpawnMul: this.stageSpawnMul, stageDamageMul: this.stageDamageMul,
    };
    this.phaseCheckpoint.player.kills = 0;

    // Câmera
    const cam = this.cameras.main;
    cam.setBounds(0, 0, CONFIG.world.w, CONFIG.world.h);
    cam.startFollow(this.player.sprite, true, 0.12, 0.12);
    cam.setZoom(1);
    cam.fadeIn(300);

    // Brasas flutuando na tela (ambiente)
    this.add.particles(0, 0, 'px', {
      x: { min: 0, max: CONFIG.width }, y: { min: 0, max: CONFIG.height }, speedY: { min: -26, max: -8 }, speedX: { min: -10, max: 10 },
      lifespan: 4500, scale: { start: 0.85, end: 0 }, alpha: { start: 0.5, end: 0 },
      tint: this.stageId === 'catacombs' ? [0xff4b21,0xffa936,0xffdc79] : this.stageId === 'forest' ? [0xd76927, 0xffa947] : [0xff8a20, 0xffd070], frequency: this.stageId === 'forest' ? 360 : 220, blendMode: 'ADD',
    }).setScrollFactor(0).setDepth(9400);

    // Controles
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,SPACE,E,ENTER');
    const queueAction = (pending, keys) => event => {
      if (event?.repeat) {
        // Key.reset during pause makes a held key's first repeat look newly down.
        for (const key of keys) Phaser.Input.Keyboard.JustDown(this.keys[key]);
        return;
      }
      const ui=this.scene.get('UI');
      if(!this.gameReady || !this.scene.isActive() || this.cinematic || this.explorationOpen || this.ended || this.transitioning || this.levelUpOpen || this.chestOpen || ui?.paused || ui?.lvlActive || GamePortal.dialogOpen)return;
      // Key.onUp clears Phaser's JustDown flag. Keep a quick press until update.
      this[pending]=true;
    };
    const queueInteraction = queueAction('requestInteract', ['E', 'ENTER']);
    const queueDash = queueAction('requestDash', ['SHIFT', 'SPACE']);
    this.input.keyboard.on('keydown-E',queueInteraction);
    this.input.keyboard.on('keydown-ENTER',queueInteraction);
    this.input.keyboard.on('keydown-SHIFT',queueDash);
    this.input.keyboard.on('keydown-SPACE',queueDash);
    const discardActions = () => {
      this.requestInteract = false; this.requestDash = false;
      if (this.joy) { this.joy.active = false; this.joy.x = 0; this.joy.y = 0; }
      this.joyG?.clear();
      this.keys.E.reset(); this.keys.ENTER.reset();
      this.keys.SHIFT.reset(); this.keys.SPACE.reset();
    };
    // A tap queued just before pause/blur must not replay when control returns.
    const gameEvents = this.game.events, browserWindow = typeof window !== 'undefined' ? window : null;
    this.events.on('pause', discardActions);
    this.events.on('sleep', discardActions);
    gameEvents?.on('blur', discardActions);
    browserWindow?.addEventListener('blur', discardActions);
    this.events.once('shutdown', () => {
      this.requestInteract = false; this.requestDash = false;
      this.input.keyboard.off('keydown-E', queueInteraction);
      this.input.keyboard.off('keydown-ENTER', queueInteraction);
      this.input.keyboard.off('keydown-SHIFT', queueDash);
      this.input.keyboard.off('keydown-SPACE', queueDash);
      this.events.off('pause', discardActions);
      this.events.off('sleep', discardActions);
      gameEvents?.off('blur', discardActions);
      browserWindow?.removeEventListener('blur', discardActions);
    });
    this.joy = { active: false, ox: 0, oy: 0, x: 0, y: 0 };
    this.joyG = this.add.graphics().setScrollFactor(0).setDepth(99999);
    this.input.on('pointerdown', (p) => {
      if (this.cinematic) return;
      if (!p.wasTouch || p.x > CONFIG.width - 145 && p.y > CONFIG.height - 240) return;
      this.joy.active = true; this.joy.id = p.id; this.joy.ox = p.x; this.joy.oy = p.y; this.joy.x = 0; this.joy.y = 0;
    });
    this.input.on('pointermove', (p) => {
      if (!this.joy.active || this.joy.id !== p.id || !p.isDown) return;
      const dx = p.x - this.joy.ox, dy = p.y - this.joy.oy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 60);
      this.joy.x = dx / d * k; this.joy.y = dy / d * k;
    });
    this.input.on('pointerup', p => { if (this.joy.id !== p.id) return; this.joy.active = false; this.joy.x = 0; this.joy.y = 0; });

    this.scene.launch('UI', { game: this });
    this.scene.get('UI').scene.setVisible(true);
    this.events.once('shutdown', () => { this.game.scene.stop('UI'); });

    this.time.delayedCall(900, () => this.announce('Fase ' + this.stage.number + ' — ' + this.stage.shortName, this.stage.color));
  }

  playCastleArrival() {
    return this.playStageArrival();
  }

  playStageArrival() {
    const entry = this.world.entry;
    if (!entry) return Promise.resolve(true);
    const initialization = this.initialization;
    this.setCinematic(this.stageId === 'catacombs' ? 'catacombs-arrival' : 'castle-arrival', this.stageId === 'catacombs' ? 'ALÉM DAS CORRENTES, O INFERNO.' : 'ALÉM DA MURALHA.');
    const p = this.player;
    // A fall changes presentation only. Every arrival starts with the normal pose.
    p.sprite.setVisible(true).setAlpha(1).setScale(1).setRotation(0);
    p.shadow.setVisible(true).setAlpha(.8).setScale(1).setRotation(0);
    p.x = entry.x; p.y = entry.startY;
    p.sprite.setPosition(p.x, p.y).setDepth(p.y + 20);
    p.shadow.setPosition(p.x, p.y + 20);
    p.sprite.anims.resume();
    this.cameras.main.setZoom(1);
    this.cameras.main.startFollow(p.sprite, true, .12, .12);
    this.cameras.main.centerOn(p.x, p.y);
    this.cameras.main.fadeIn(650, 0, 0, 0);
    return this.cinematicTween({ targets: p, y: entry.endY, duration: 1250, ease: 'Sine.easeOut',
      onUpdate: () => this.syncCinematicPlayer(),
    }).then(ok => {
      if (!ok || !this.cinematicValid(initialization)) return false;
      p.sprite.anims.pause(); p.invuln = 2;
      this.setCinematic(null);
      return true;
    });
  }

  cinematicValid(initialization) {
    return !!initialization && this.initialization === initialization && this.scene.isActive() && !this.ended;
  }

  clearCinematicInput() {
    this.requestDash = false; this.requestInteract = false; this.botInput = null;
    if (this.joy) { this.joy.active = false; this.joy.x = 0; this.joy.y = 0; }
    this.joyG?.clear();
    this.input.keyboard.resetKeys();
    if (this.player) { this.player.dashT = 0; this.player.moving = false; }
  }

  setCinematic(state, caption) {
    if (state && !this.cinematicLagPolicy) {
      this.cinematicLagPolicy = { maxLag: this.tweens.maxLag, lagSkip: this.tweens.lagSkip };
      // The default smoothing discards most of a frame longer than 500 ms.
      // Films must use elapsed wall time, including very low frame rates.
      this.tweens.setLagSmooth();
    } else if (!state) this.restoreCinematicClock();
    this.cinematic = state;
    this.soundscape?.syncBlock();
    this.clearCinematicInput();
    this.scene.get('UI')?.scene.setVisible(!state);
    if (!state) { this.scene.stop('FinaleOverlay'); return; }
    if (!this.scene.isActive('FinaleOverlay')) this.scene.launch('FinaleOverlay', { caption });
    else this.scene.get('FinaleOverlay').caption?.setText(caption || '');
    this.player.sprite.anims.pause();
    this.player.sprite.setAlpha(1);
    if (this.player.appearanceTint == null) this.player.sprite.clearTint();
    else this.player.sprite.setTint(this.player.appearanceTint);
  }

  restoreCinematicClock() {
    if (!this.cinematicLagPolicy) return;
    const { maxLag, lagSkip } = this.cinematicLagPolicy;
    this.tweens.setLagSmooth(maxLag, lagSkip);
    this.cinematicLagPolicy = null;
  }

  // Every animation settles on shutdown, so old async sequences cannot resume a new run.
  cinematicTween(config) {
    const initialization = this.initialization;
    return new Promise(resolve => {
      let tween, settled = false;
      const finish = ok => {
        if (settled) return;
        settled = true;
        this.cinematicWaits.delete(cancel);
        if (!ok) { tween?.stop(); tween?.remove(); }
        resolve(ok && this.cinematicValid(initialization));
      };
      const cancel = () => finish(false);
      this.cinematicWaits.add(cancel);
      tween = this.tweens.add({ ...config, onComplete: () => finish(true) });
    });
  }

  cinematicDelay(duration) {
    return this.cinematicTween({ targets: { progress: 0 }, progress: 1, duration });
  }

  // Network requests may outlive a scene. Settle the film immediately on shutdown,
  // while still consuming a late rejection from the original request.
  cinematicAwait(promise) {
    const initialization=this.initialization;
    return new Promise((resolve,reject)=>{
      let settled=false;
      const finish=(ok,value,error)=>{
        if(settled)return;settled=true;this.cinematicWaits.delete(cancel);
        if(error&&this.cinematicValid(initialization))reject(error);
        else resolve({ok:ok&&this.cinematicValid(initialization),value});
      };
      const cancel=()=>finish(false);this.cinematicWaits.add(cancel);
      Promise.resolve(promise).then(value=>finish(true,value),error=>finish(false,null,error));
    });
  }

  syncCinematicPlayer() {
    const p = this.player;
    p.sprite.setPosition(p.x, p.y).setDepth(p.y + 20);
    p.shadow.setPosition(p.x, p.y + 20).setDepth(p.y - 1);
  }

  beginForestVictory() {
    if (this.forestVictory || this.stageId !== 'forest' || this.ended || this.stageCleared) return this.forestVictory;
    this.setCinematic('forest-defeat', 'O CORAÇÃO SILENCIA.');
    this.spawningEnabled = false;
    this.enemyShots.clear(); this.hazards.length = 0; this.fx.ground.length = 0;
    const initialization = this.initialization;
    this.forestVictory = this.playForestVictory(initialization);
    return this.forestVictory;
  }

  beginBossDefeat() {
    if(this.ended)return;
    if(this.stageId==='forest')this.beginForestVictory();
    else if(this.stageId==='castle')this.beginCastleVictory();
    else if(!this.cinematic){
      this.setCinematic('necromancer-defeat','O ÚLTIMO SELO SE DESFAZ.');
      this.spawningEnabled=false;this.enemyShots.clear();this.hazards.length=0;this.fx.ground.length=0;
    }
  }

  beginCastleVictory() {
    if(this.castleVictory||this.stageId!=='castle'||this.ended||this.stageCleared)return this.castleVictory;
    this.setCinematic('castle-defeat','A ESPADA SILENCIA.');
    this.spawningEnabled=false;this.enemyShots.clear();this.hazards.length=0;this.fx.ground.length=0;
    this.castleVictory=this.playCastleVictory(this.initialization);return this.castleVictory;
  }

  async playCastleVictory(initialization) {
    const cam=this.cameras.main,p=this.player;
    cam.stopFollow();cam.pan(this.boss?.x||p.x,this.boss?.y||p.y,700,'Sine.easeInOut');
    if(!await this.cinematicDelay(2700)||!this.cinematicValid(initialization))return false;
    this.world.hideBarrier();
    this.transitioning=true;
    const advance={initialization,targetStage:'catacombs',promise:null};
    this.#stageAdvance=advance;
    this.setCinematic('castle-fall','O SELO SOB O CASTELO SE ROMPEU.');
    const fallen=await this.cinematicAwait(new Promise(resolve=>{
      this.finale=new CastleFinale(this,()=>resolve(true));
    }));
    if(!fallen.ok||!this.cinematicValid(initialization))return false;
    return this.commitStageAdvance(advance);
  }

  async playForestVictory(initialization) {
    const cam = this.cameras.main, p = this.player, gate = this.world.gate;
    cam.stopFollow();
    cam.pan(this.boss?.x || p.x, this.boss?.y || p.y, 700, 'Sine.easeInOut');
    if (!await this.cinematicDelay(2700) || !this.cinematicValid(initialization)) return false;
    this.setCinematic('forest-roots', 'AS RAÍZES CEDERAM.');
    for (const tween of this.world.barrierTweens) { tween.stop(); tween.remove(); }
    if (this.world.barrierProps.length) {
      if (!await this.cinematicTween({ targets: this.world.barrierProps, scaleY: 0.12, alpha: 0, duration: 650, ease: 'Sine.easeIn' }) || !this.cinematicValid(initialization)) return false;
    }
    this.world.hideBarrier();
    this.setCinematic('forest-gate', 'O CAMINHO ESTÁ ABERTO.');
    cam.pan(gate.x, gate.y - 95, 1150, 'Sine.easeInOut'); cam.zoomTo(1, 1150);
    if (!await this.cinematicDelay(1200) || !this.cinematicValid(initialization)) return false;
    if (!await this.world.animateCastleGate() || !this.cinematicValid(initialization)) return false;
    this.setCinematic('forest-return', 'SIGA OS LAMPIÕES ATÉ O CASTELO.');
    cam.pan(p.x, p.y, 1100, 'Sine.easeInOut');
    if (!await this.cinematicDelay(1150) || !this.cinematicValid(initialization)) return false;
    cam.startFollow(p.sprite, true, 0.12, 0.12);
    this.stageCleared = true;
    this.setCinematic(null);
    this.announce('O portão foi aberto! Siga os lampiões ao norte.', 0xffdc9c);
    Sfx.play('levelup');
    return true;
  }

  // ---------------------------------------------------------- utilidades usadas por poderes/inimigos
  announce(msg, color) {
    const ui = this.scene.get('UI');
    if (ui && ui.ready) ui.announce(msg, color);
  }
  dmgScale() { return (1 + (this.t / 60) * CONFIG.spawn.dmgPerMinute) * this.stageDamageMul; }
  get totalTime() { return this.elapsedBefore + this.t; }

  // Inimigos vivos dentro de um círculo (usa a grade espacial)
  queryEnemies(x, y, r, out) {
    this.grid.query(x, y, r, out);
    let n = 0;
    for (let i = 0; i < out.length; i++) if (out[i].alive) out[n++] = out[i];
    out.length = n;
    return out;
  }

  damageEnemy(e, dmg, src) {
    if (this.cinematic || this.ended || !e.alive || dmg <= 0) return;
    if (e.isBoss && !e.isExplorationBoss) {
      const before = e.hp;
      if (e.hurt(dmg)) {
        this.totalDamage += Math.max(0, before - e.hp);
        this.fx.number(e.x + rand(-30, 30), e.y - 64, Math.round(dmg), '#ffe9a0', false);
      }
      return;
    }
    const d = e.def;
    let dealt = dmg;
    // escudo: bloqueia 80% do dano que vem pela frente
    if (d.shield && src) {
      const a = Math.atan2(src.y - e.y, src.x - e.x);
      if (Math.abs(angleDiff(a, e.face)) < 1.0) {
        dealt *= 0.2;
        this.fx.burst('spark', e.x + Math.cos(e.face) * e.radius, e.y + Math.sin(e.face) * e.radius, 3);
      }
    }
    this.totalDamage += Math.max(0, Math.min(e.hp, dealt));
    e.hp -= dealt; e.flash = 0.07;
    if (src && src.knock) {
      const dx = e.x - src.x, dy = e.y - src.y, dd = Math.hypot(dx, dy) || 1;
      const kb = d.kb === undefined ? 1 : d.kb;
      e.kx += dx / dd * src.knock * kb; e.ky += dy / dd * src.knock * kb;
    }
    this.fx.number(e.x, e.y - e.radius - 6, Math.round(dealt), dealt < dmg ? '#9aa4c0' : '#ffffff', false);
    if (e.hp <= 0) this.enemies.kill(e);
  }

  explodeAt(x, y, radius, dmg, kind, knock, color) {
    this.fx.boom(x, y, radius, color || 0xff9a3a, kind || 'fire');
    const list = this.queryEnemies(x, y, radius, this.tmpE);
    for (let i = 0; i < list.length; i++) this.damageEnemy(list[i], dmg, { x, y, knock: knock || 100, kind: 'explosion' });
    if (radius > 70) this.cameras.main.shake(70, 0.0025);
    Sfx.play('boom');
  }

  // Zona de perigo telegrafada: aparece no chão, explode depois de `delay`.
  addHazard(h) {
    if (this.hazards.length > 40) return;
    h.t = 0;
    if (h.shape === 'cone') this.fx.teleCone(h.x, h.y, h.ang, h.r, h.half, h.delay, h.col);
    else this.fx.teleCircle(h.x, h.y, h.r, h.delay, h.col);
    this.hazards.push(h);
  }
  updateHazards(dt) {
    const p = this.player;
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.t += dt;
      if (h.t < h.delay) continue;
      this.hazards[i] = this.hazards[this.hazards.length - 1]; this.hazards.pop();
      const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy);
      if (h.shape === 'cone') {
        if (!p.dead && d <= h.r + p.radius && Math.abs(angleDiff(Math.atan2(dy, dx), h.ang)) <= h.half) p.takeDamage(h.dmg);
        this.fx.ring(h.x + Math.cos(h.ang) * h.r * 0.5, h.y + Math.sin(h.ang) * h.r * 0.5, 10, h.r * 0.5, 0.25, h.col, 4, 0.2);
        this.fx.burst('dark', h.x + Math.cos(h.ang) * h.r * 0.6, h.y + Math.sin(h.ang) * h.r * 0.6, 8);
      } else {
        if (!p.dead && d <= h.r + p.radius) p.takeDamage(h.dmg);
        this.fx.boom(h.x, h.y, h.r, h.col, h.kind || 'fire');
        this.cameras.main.shake(80, 0.003);
        Sfx.play('boom');
      }
    }
  }

  // ---------------------------------------------------------- níveis
  queueLevelUp() { if (!this.cinematic) this.pendingLevels++; }

  rollChoices() {
    const p = this.player, pool = [];
    for (const pw of p.powers) if (!pw.maxed) pool.push({ key: 'u:' + pw.def.id, type: 'upgrade', id: pw.def.id, w: 2.2 });
    if (p.powers.length < CONFIG.maxPowers) {
      for (const id in POWERS) if (POWERS[id].obtainable !== false && !p.hasPower(id) && this.progression.canOfferPower(id)) pool.push({ key: 'n:' + id, type: 'new', id, w: p.powers.length < 4 ? 3 : 1.6 });
    }
    if (p.dashLevel < 3) pool.push({ key: 'dash', type: 'dash', w: 1.8 });
    for (const ps of PASSIVES) if ((p.passives[ps.id] || 0) < CONFIG.maxPassiveLevel) pool.push({ key: 'p:' + ps.id, type: 'passive', id: ps.id, w: 1.4 });
    // o que foi oferecido e ignorado no nível anterior aparece menos
    for (const c of pool) if (this.lastOffer.indexOf(c.key) >= 0) c.w *= 0.45;

    const out = [];
    const take = (list) => {
      let total = 0; for (const c of list) total += c.w;
      let r = Math.random() * total, chosen = list[list.length - 1];
      for (const c of list) { r -= c.w; if (r <= 0) { chosen = c; break; } }
      out.push(chosen);
      pool.splice(pool.indexOf(chosen), 1);
    };
    // garante ao menos uma opção de poder (novo ou melhoria), se existir
    const powerOpts = pool.filter((c) => c.type !== 'passive');
    if (powerOpts.length) take(powerOpts);
    while (out.length < CONFIG.levelUpChoices && pool.length) take(pool);
    if (out.length < CONFIG.levelUpChoices) out.push({ key: 'heal', type: 'heal' });  // tudo no máximo: oferece cura
    this.lastOffer = out.map((c) => c.key);
    return out;
  }

  openLevelUp() {
    if (this.cinematic || this.explorationOpen || GamePortal.dialogOpen || this.levelUpOpen || this.chestOpen || this.ended) return;
    const ui = this.scene.get('UI');
    if (!ui || !ui.ready) return;
    this.pendingLevels--;
    this.levelUpOpen = true;
    const choices = this.rollChoices();
    Sfx.play('levelup');
    this.scene.pause();
    ui.showLevelUp(this.player.level - this.pendingLevels, choices, (c) => {
      this.applyChoice(c);
      this.levelUpOpen = false;
      if (!GamePortal.dialogOpen) this.scene.resume();
    });
  }

  openEvolutionChest(chest) {
    const ui = this.scene.get('UI');
    if (this.cinematic || this.explorationOpen || GamePortal.dialogOpen || this.ended || this.levelUpOpen || this.chestOpen || !ui?.ready) return false;
    const offers = this.progression.getOffers(chest.canEvolve !== false);
    if (!offers.length) return false;
    this.chestOpen = true;
    this.scene.pause();
    Sfx.play('levelup');
    ui.showLevelUp(this.player.level, offers, choice => {
      this.applyChoice(choice);
      this.chestOpen = false;
      if (!GamePortal.dialogOpen) this.scene.resume();
    }, { chest: true });
    return true;
  }

  applyChoice(c) {
    if (this.cinematic) return;
    const p = this.player;
    if (c.type === 'upgrade' || c.type === 'new') p.addPower(c.id);
    else if (c.type === 'passive') p.addPassive(c.id);
    else if (c.type === 'dash') p.upgradeDash();
    else if (c.type === 'evolution') this.progression.applyRecipe(c.id);
    else if (c.type === 'heal') p.heal(p.maxHp * 0.4);
    this.fx.ring(p.x, p.y, 10, 130, 0.5, 0xffe070, 4, 0.15);
    this.fx.burst('gold', p.x, p.y, 16);
  }

  // ---------------------------------------------------------- chefe
  startBossFight() {
    if (this.bossStarted || this.ended) return;
    this.exploration?.beforeBossFight();
    this.bossStarted = true;
    this.spawningEnabled = false;
    const A = CONFIG.arena;
    for (const e of this.enemies.pool) if (e.alive) this.fx.burst('dark', e.x, e.y, 5);
    this.enemies.killAllSilently();
    this.enemyShots.clear();
    this.hazards.length = 0; this.fx.ground.length = 0;
    this.gems.magnetAll();
    this.cameras.main.flash(500, 120, 0, 20);
    this.world.arenaLock = true;
    this.world.showBarrier();
    const p = this.player;
    p.x = A.x; p.y = A.y + 360;
    p.heal(p.maxHp * 0.5);
    this.boss = this.stageId === 'forest' ? new ForestBoss(this, A.x, A.y - 170) : this.stageId === 'catacombs' ? new NecromancerBoss(this,A.x,A.y-170) : new Boss(this, A.x, A.y - 170);
    if(this.stageId==='catacombs'){
      // The hero starts 530 px south of the boss; following the hero hides it.
      this.cameras.main.stopFollow();
      this.cameras.main.pan(A.x,A.y,1400,'Sine.easeInOut');
      this.cameras.main.zoomTo(.65,1400);
    }else this.cameras.main.zoomTo(0.85, 1400);
    this.announce(this.stage.bossName + ' desperta!', this.stage.color);
  }

  onBossDefeated() {
    if (this.ended || this.finalVictoryStarted) return;
    if (this.stage.next) {
      if(this.stageId==='forest')this.beginForestVictory();else this.beginCastleVictory();
      return;
    }
    if(this.stageId!=='catacombs')return;
    this.finalVictoryStarted=true;
    this.setCinematic('soul-finale','AS CORRENTES DO ARQUIDEMÔNIO CEDEM.');
    this.ended = true;
    this.spawningEnabled = false;
    this.enemyShots.clear(); this.hazards.length = 0; this.fx.ground.length = 0;
    for (const shot of this.pShots.items) if (shot.live) this.pShots.kill(shot);
    for (const gem of this.gems.items) { gem.live = false; gem.setVisible(false); }
    for (const power of this.player.powers) power.destroy();
    if (!this.isPractice && this.metaProfileKey === 'guest') GamePortal.recordGuestVictory(this.stageId, this.metaProfileKey);
    this.submitResult(true);
    Sfx.play('win');
    this.scene.get('UI').scene.setVisible(false);
    this.finale = new SoulFinale(this, () => this.showEnd(true));
  }

  nearCastleGate() {
    const gate = this.world?.gate;
    return this.stageId === 'forest' && gate && (this.world.isAtCastleDoor ? this.world.isAtCastleDoor(this.player) : Math.hypot(this.player.x - gate.x, this.player.y - gate.y) <= 150);
  }

  nearStageExit() {
    if(this.stageId==='forest')return this.nearCastleGate();
    return !!this.stage.next&&!!this.world?.gate&&!!this.player&&this.world.isAtStageExit(this.player);
  }

  enterCastle() {return this.stageId==='forest'?this.enterNextStage():Promise.resolve(false);}

  async enterNextStage() {
    const ui = this.scene.get('UI');
    const targetStage=this.stage.next;
    if (!targetStage || this.cinematic || !this.gameReady || !this.scene.isActive() || this.ended || this.transitioning || !this.stageCleared || !this.world.gateOpen || !this.nearStageExit() || this.levelUpOpen || this.chestOpen || this.explorationOpen || ui?.paused || GamePortal.dialogOpen) return false;
    this.transitioning = true;
    const initialization = this.initialization;
    const advance={initialization,targetStage,promise:null};
    this.#stageAdvance=advance;
    this.setCinematic(targetStage==='catacombs'?'catacombs-entry':'castle-entry', targetStage==='catacombs'?'A DESCIDA PARA O INFERNO.':'ALÉM DA MURALHA.');
    const p = this.player, gate = this.world.gate;
    p.sprite.anims.resume();
    if (!await this.cinematicTween({ targets: p, x: gate.x, y: Math.min(p.y, gate.y + 25), duration: 300, ease: 'Sine.easeInOut', onUpdate: () => this.syncCinematicPlayer() }) || !this.cinematicValid(initialization)) return false;
    if (!await this.cinematicTween({ targets: p, y: gate.y - 75, duration: 600, ease: 'Linear', onUpdate: () => this.syncCinematicPlayer() }) || !this.cinematicValid(initialization)) return false;
    p.sprite.anims.pause();
    this.scene.get('FinaleOverlay').caption?.setAlpha(0);
    this.cameras.main.fadeOut(350, 0, 0, 0);
    if (!await this.cinematicDelay(380) || !this.cinematicValid(initialization)) return false;
    return this.commitStageAdvance(advance);
  }

  // Shared network/carry commit. The opaque token is never accepted from an
  // external force/automatic flag, and the same transition commits at most once.
  commitStageAdvance(advance) {
    if(!advance||this.#stageAdvance!==advance||!this.transitioning||!this.cinematic||!this.cinematicValid(advance.initialization))return Promise.resolve(false);
    if(advance.promise)return advance.promise;
    advance.promise=(async()=>{
      const {initialization,targetStage}=advance;
      const runWait = await this.cinematicAwait(this.runStart);
      if (!runWait.ok || !this.cinematicValid(initialization)) return false;
      const run=runWait.value;
      const carry = {
        player: capturePlayerState(this.player), elapsed: this.totalTime,
        kills: this.totalKills, damage: this.totalDamage, pendingLevels: this.pendingLevels,
        consumed: [...this.progression.consumed], completed: [...this.progression.completed],
        startStageId: this.startStageId, practice: this.isPractice, godMode: this.godMode,
        saveError: this.saveError, run,
        metaProfileKey: this.metaProfileKey, metaRunId: this.metaRunId,
      };
      try {
        if (carry.run?.run_id && !carry.saveError) {
          const advanceWait=await this.cinematicAwait(GamePortal.advanceRun(carry.run.run_id,targetStage));
          if (!advanceWait.ok || !this.cinematicValid(initialization)) return false;
          const advanced=advanceWait.value;
          if(advanced?.stage)carry.run={...carry.run,...advanced};
        }
      } catch (error) {
        if (!this.cinematicValid(initialization)) return false;
        carry.practice = true;
        carry.saveError = 'A passagem não foi registrada no servidor. Esta campanha segue fora do ranking.';
        GamePortal.notice(carry.saveError);
      }
      if (!this.cinematicValid(initialization)) return false;
      if (!carry.run?.run_id && !carry.practice && !carry.saveError && this.metaProfileKey === 'guest') GamePortal.recordGuestAdvance(targetStage, this.metaProfileKey);
      this.scene.restart({ char: this.charId, difficulty: this.difficultyId, stage: targetStage, carry });
      return true;
    })();
    return advance.promise;
  }

  onPlayerDeath() {
    if (this.cinematic || this.ended) return;
    this.ended = true;
    const p = this.player;
    p.sprite.anims.stop(); p.sprite.clearTint();
    this.fx.burst('blood', p.x, p.y, 18);
    this.tweens.add({ targets: p.sprite, angle: 90, alpha: 0.35, y: p.y + 8, duration: 700, ease: 'Quad.easeOut' });
    this.cameras.main.shake(300, 0.01);
    Sfx.play('lose');
    this.time.delayedCall(1300, () => this.showEnd(false));
  }

  get points() {
    const base = this.totalKills * 100 + Math.floor(this.totalDamage) * 2 + Math.floor(this.totalTime) * 10 + (this.stageId === 'catacombs' && this.boss && !this.boss.alive ? 5000 : 0);
    return Math.floor(base * this.difficulty.scoreMul);
  }

  submitResult(win) {
    if (this.runSubmission) return this.runSubmission;
    if (!this.isPractice && this.metaProfileKey === 'guest' && typeof MetaProgress !== 'undefined') {
      MetaProgress.record({type:'run',id:this.metaRunId,kills:this.totalKills},this.metaProfileKey);
    }
    if (this.saveError) return this.runSubmission = Promise.resolve({ error: this.saveError });
    const stats = { kills: this.totalKills, damage: this.totalDamage, duration: this.totalTime, hero: this.charId, level: this.player.level, victory: win };
    this.runSubmission = Promise.resolve(this.runStart).then(run => {
      if (run?.error) return { error: run.error };
      if (!run?.run_id) return { saved: false, ranked: false };
      return GamePortal.finishRun({ run_id: run.run_id, ...stats });
    }).catch(error => ({ error: 'Não foi possível salvar o resultado: ' + error.message }));
    return this.runSubmission;
  }

  showEnd(win) {
    const submission = this.submitResult(win);
    this.scene.launch('End', {
      win, time: this.totalTime, stage: this.stageId, startStage: this.startStageId, checkpoint: this.phaseCheckpoint, level: this.player.level, kills: this.totalKills, damage: this.totalDamage, points: this.points, practice: this.isPractice, submission, char: this.charId, difficulty: this.difficultyId,
      powers: this.player.powers.map((w) => ({ icon: w.def.icon, name: w.def.name, level: w.level })),
    });
    this.scene.pause();
  }

  // ---------------------------------------------------------- entrada
  readInput() {
    if (this.cinematic || this.explorationOpen) return { x: 0, y: 0, dash: false, interact: false };
    if (this.botInput) return this.botInput;
    const K = this.keys;
    let x = 0, y = 0;
    if (K.A.isDown || K.LEFT.isDown) x -= 1;
    if (K.D.isDown || K.RIGHT.isDown) x += 1;
    if (K.W.isDown || K.UP.isDown) y -= 1;
    if (K.S.isDown || K.DOWN.isDown) y += 1;
    if (this.joy.active) { x += this.joy.x; y += this.joy.y; }
    const pressedShift=Phaser.Input.Keyboard.JustDown(K.SHIFT),pressedSpace=Phaser.Input.Keyboard.JustDown(K.SPACE);
    const dash = this.requestDash || pressedShift || pressedSpace;
    this.requestDash = false;
    // Consume both flags even when the event latch is already set, so a tap
    // cannot interact again on the next frame or after a reward menu closes.
    const pressedE=Phaser.Input.Keyboard.JustDown(K.E),pressedEnter=Phaser.Input.Keyboard.JustDown(K.ENTER);
    const interact=this.requestInteract || pressedE || pressedEnter;
    this.requestInteract=false;
    return { x, y, dash, interact };
  }

  interactNearby() {
    const ui=this.scene.get('UI');
    if (!this.gameReady || this.cinematic || this.explorationOpen || this.ended || this.transitioning || this.levelUpOpen || this.chestOpen || ui?.paused || GamePortal.dialogOpen) return false;
    if (this.exploration?.interact()) return true;
    if (this.stageCleared && this.nearStageExit()) { this.enterNextStage(); return true; }
    return false;
  }

  // ---------------------------------------------------------- loop principal
  update(time, delta) {
    this.soundscape?.update(Math.max(0,delta/1000));
    if (this.cinematic && this.world && this.fx) {
      const dt = Math.max(0, delta / 1000);
      this.visualTime += dt;
      this.fx.update(dt); this.world.update(dt, this.visualTime);
      this.finale?.update(dt);
      return;
    }
    if (!this.gameReady || this.transitioning) return;
    const dt = Math.min(delta / 1000, 0.05);
    this.visualTime += dt;
    this.drawJoystick();
    if (this.ended) { this.fx.update(dt); this.world.update(dt, this.visualTime); this.finale?.update(Math.max(0, delta / 1000)); return; }
    const input = this.readInput();
    if (input.interact && this.interactNearby()) return;
    // A travessia segura após o chefe não gera pontuação de sobrevivência.
    if (!this.stageCleared) this.t += dt;

    // Grade espacial com todos os alvos (inimigos + chefe)
    this.grid.clear();
    for (const e of this.enemies.pool) if (e.alive) this.grid.insert(e);
    if (this.boss && this.boss.alive) this.grid.insert(this.boss);

    this.player.update(dt, input, this.world);
    if (this.cinematic || this.ended) return;
    this.enemies.update(dt);
    if (this.cinematic || this.ended) return;
    this.encounters.update(dt);
    if (this.boss) this.boss.update(dt);
    if (this.cinematic || this.ended) return;
    this.pShots.update(dt);
    if (this.cinematic || this.ended) return;
    this.enemyShots.update(dt);
    if (this.cinematic || this.ended) return;
    this.gems.update(dt);
    this.updateHazards(dt);
    if (this.cinematic || this.ended) return;
    this.fx.update(dt);
    this.world.update(dt, this.visualTime);
    this.exploration?.update(dt);

    if (!this.bossStarted && this.t >= this.bossTime) this.startBossFight();
    this.progression.update(dt);
    if (this.pendingLevels > 0 && !this.player.dead && !this.ended) this.openLevelUp();
  }

  drawJoystick() {
    const g = this.joyG;
    g.clear();
    if (!this.joy.active) return;
    g.lineStyle(3, 0xffffff, 0.35); g.strokeCircle(this.joy.ox, this.joy.oy, 60);
    g.fillStyle(0xffffff, 0.3); g.fillCircle(this.joy.ox + this.joy.x * 60, this.joy.oy + this.joy.y * 60, 24);
  }
}
