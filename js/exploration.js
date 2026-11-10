// Altares e o segredo da floresta. Nenhum encontro cria outro pool de inimigos.
const EXPLORATION_RELIC_IDS = ['twin_seal', 'blood_oath', 'glass_heart', 'restless_clock', 'pilgrim_chain', 'ashen_cup'];

function drawOathkeeperSprite(P, f) {
  const b = f % 2, green = '#87c6a5';
  P.shadow(14, 26, 21);
  P.r(7, 10 + b, 14, 14, '#263b35'); P.r(5, 11 + b, 18, 10, '#172a28');
  P.r(9, 20, 4, 6, '#3e5147'); P.r(16, 20, 4, 6, '#3e5147');
  P.r(8, 9 + b, 12, 11, '#536b5b'); P.r(10, 11 + b, 8, 7, '#2e403b');
  P.line(10, 12 + b, 17, 17 + b, green); P.line(17, 12 + b, 10, 17 + b, green);
  P.r(10, 4 + b, 8, 7, '#d4c7a2'); P.r(9, 6 + b, 10, 3, '#596d59');
  P.r(11, 7 + b, 2, 1, '#baffdd'); P.r(15, 7 + b, 2, 1, '#baffdd');
  for (const side of [-1, 1]) {
    const x = side < 0 ? 10 : 17;
    P.line(x, 5 + b, x + side * 3, b, '#8e9b79', 2);
    P.line(x + side * 2, 2 + b, x + side * 5, b, '#b7bea0');
  }
  P.r(4, 12 + b, 4, 8, '#627a62'); P.r(20, 12 + b, 4, 8, '#627a62');
  P.r(24, 8 + b, 1, 16, '#725736'); P.r(22, 5 + b, 4, 10, '#b8c8b1');
  P.r(23, 6 + b, 2, 8, '#e1edcf'); P.r(21, 16 + b, 6, 2, '#9c8c56');
}

Object.assign(ENEMIES, {
  forest_oathkeeper: {
    stage: 'forest', name: 'Guardião do Juramento', kind: 'melee', explorationOnly: true,
    hp: 2300, speed: 61, dmg: 24, radius: 29, xp: 180, from: Infinity, weight: 0, kb: 0,
    charge: { range: 570, min: 140, windup: 1.15, dur: .65, mul: 4.4, cd: 5.6, recover: 1.1, col: 0x9be5ba },
  },
});
Object.assign(ENEMY_ART, {
  forest_oathkeeper: { w: 28, h: 28, k: 3, frames: 4, custom: true, fn: drawOathkeeperSprite, visualScale: 1.1 },
});

class ExplorationSystem {
  constructor(scene, saved = {}) {
    this.scene = scene; this.dead = false; this.menuOpen = false; this.offers = [];
    scene.explorationOpen = false;
    this.dialog = null; this.encounter = null; this.rewardMenu = false;
    this.recorded = new Set(Array.isArray(saved?.recorded) ? saved.recorded : []);
    const stage = scene.stageId || scene.stage?.id || 'forest';
    this.stageId = stage;
    const sites = stage === 'forest' ? [[1040, 3260], [2820, 1020]] : stage === 'catacombs' ? [[1100, 1160], [2900, 2860]] : [[850, 3150], [3150, 850]];
    const placed = [];
    const place = (id, coords, tex, radius = 26) => {
      const p = this.walkable(coords[0], coords[1], placed, radius);
      placed.push(p);
      const sprite = scene.add.image(p.x, p.y, tex).setDepth(p.y + 3);
      return { id, x: p.x, y: p.y, sprite };
    };
    this.altars = sites.map((coords, i) => ({ ...place('altar_' + (i + 1), coords, 'exploration_altar'), used: !!saved?.altars?.[i]?.used }));
    const symbolSites = [[650, 1680], [3470, 2310], [1540, 1110]];
    this.symbols = stage === 'forest' ? symbolSites.map((coords, i) => ({
      ...place('symbol_' + (i + 1), coords, 'exploration_symbol_' + i, 18),
      found: saved?.symbols?.[i] === true || saved?.symbols?.[i]?.found === true,
    })) : [];
    this.shrine = stage === 'forest' ? place('oath_shrine', [1160, 1190], 'exploration_shrine', 30) : null;
    const unlocked = this.symbols.length === 3 && this.symbols.every(s => s.found);
    this.secretState = unlocked ? (saved?.secretState === 'defeated' ? 'defeated' : 'ready') : 'sealed';
    this.rewardClaimed = this.secretState === 'defeated' && !!saved?.rewardClaimed;
    this.chestDelivered = this.secretState === 'defeated' && !!saved?.chestDelivered;
    this.chestPending = this.secretState === 'defeated' && !this.chestDelivered;
    this.rewardPosition = saved?.rewardPosition && Number.isFinite(saved.rewardPosition.x) && Number.isFinite(saved.rewardPosition.y) ? { ...saved.rewardPosition } : null;
    this.onShutdown = () => this.destroy();
    scene.events?.once('shutdown', this.onShutdown);
    this.refreshArt();
  }

  walkable(x, y, placed = [], radius = 26) {
    const world = this.scene.world, clearance = Math.max(radius, this.scene.player?.radius || 12);
    for (let ring = 0; ring < 18; ring++) {
      const count = ring ? 12 : 1;
      for (let i = 0; i < count; i++) {
        const angle = i * Math.PI * 2 / count;
        const p = { x: x + Math.cos(angle) * ring * 30, y: y + Math.sin(angle) * ring * 30, radius: clearance };
        for (let attempt = 0; attempt < 20; attempt++) world.constrain(p);
        if (placed.some(other => Math.hypot(p.x - other.x, p.y - other.y) < 145)) continue;
        const solids = world.solids?.query(p.x, p.y, clearance, []) || [];
        if (solids.some(o => Math.hypot(p.x - o.x, p.y - o.y) < clearance + o.radius - .01)) continue;
        return { x: p.x, y: p.y };
      }
    }
    // These fixed sites are reserved path/chamber centers in the campaign maps.
    // Keep the final constraint even when a custom map supplies no collision grid.
    const p = { x, y, radius: clearance }; world.constrain(p); return { x: p.x, y: p.y };
  }

  ui() { try { return this.scene.scene?.get('UI'); } catch (_) { return null; } }
  blocked(allowOwnMenu = false) {
    const sc = this.scene, ui = this.ui();
    return this.dead || !sc.player || sc.player.dead || sc.ended || sc.cinematic || sc.transitioning || sc.bossStarted || sc.stageCleared ||
      sc.levelUpOpen || sc.chestOpen || ui?.paused || ui?.lvlActive || (allowOwnMenu && this.dialog?.panel.inert) || (!allowOwnMenu && (this.menuOpen || sc.explorationOpen ||
      (typeof GamePortal !== 'undefined' && GamePortal.dialogOpen) || sc.scene?.isPaused?.()));
  }

  nearest() {
    const p = this.scene.player;
    if (!p) return null;
    const candidates = [...this.altars.filter(a => !a.used), ...this.symbols.filter(s => !s.found)];
    if (this.shrine && ['ready', 'pending', 'defeated'].includes(this.secretState) && !(this.secretState === 'defeated' && this.rewardClaimed)) candidates.push(this.shrine);
    let nearest = null, distance = 94;
    for (const item of candidates) {
      const d = Math.hypot(item.x - p.x, item.y - p.y);
      if (d < distance) { distance = d; nearest = item; }
    }
    return nearest;
  }

  getPrompt() {
    if (this.blocked()) return '';
    const item = this.nearest();
    if (!item) return '';
    if (item.id.startsWith('altar_')) return 'Oferecer 25% da vida máxima no altar';
    if (item.id.startsWith('symbol_')) return 'Decifrar símbolo do Juramento';
    return this.secretState === 'defeated' ? 'Recolher relíquia do Juramento' : this.secretState === 'pending' ? 'O Guardião aguarda espaço para surgir' : 'Invocar o Guardião do Juramento';
  }

  getStatus() {
    const e = this.encounter?.enemy;
    const active = !!e && this.secretState === 'active' && e.alive && e.uid === this.encounter.uid && e.isExplorationBoss;
    return {
      altarsUsed: this.altars.filter(a => a.used).length, altarCount: this.altars.length,
      symbolsFound: this.symbols.filter(s => s.found).length, symbolCount: this.symbols.length,
      secretState: this.secretState,
      boss: active ? { name: e.def.name, hp: e.hp, maxHp: e.maxHp } : null,
    };
  }

  availableRelics() {
    const p = this.scene.player;
    if ((p.relics || []).length >= 3) return [];
    return EXPLORATION_RELIC_IDS.filter(id => typeof RELICS !== 'undefined' && RELICS[id] && !(p.relics || []).includes(id));
  }

  interact() {
    if (this.blocked()) return false;
    const item = this.nearest();
    if (!item) return false;
    if (item.id.startsWith('altar_')) { this.openRelics(item, false); return true; }
    if (item.id.startsWith('symbol_')) {
      item.found = true;
      if (this.symbols.every(s => s.found)) {
        this.secretState = 'ready';
        this.scene.announce('Três símbolos reunidos. O santuário desperta na trilha oeste.', 0xa6e7be);
      } else this.scene.announce('Símbolo decifrado: ' + this.symbols.filter(s => s.found).length + '/3', 0xa6e7be);
      this.scene.fx?.ring(item.x, item.y, 8, 76, .6, 0x9ce3ba, 3, .3);
      this.refreshArt(); return true;
    }
    if (this.secretState === 'defeated') this.openRelics(item, true);
    else { this.secretState = 'pending'; this.summonGuardian(); }
    return true;
  }

  openRelics(item, reward) {
    const sc = this.scene, p = sc.player, cost = p.maxHp * .25;
    const available = this.availableRelics();
    if (!available.length) {
      sc.announce((p.relics || []).length >= 3 ? 'Você já carrega três relíquias.' : 'Nenhuma relíquia disponível.', 0xc9beb0);
      if (reward) this.rewardClaimed = true;
      return false;
    }
    if (!reward && p.hp <= cost) { sc.announce('O altar exige 25% da vida máxima. A oferenda não pode matar você.', 0xf0a790); return false; }
    if (typeof GamePortal === 'undefined' || !GamePortal.openDialog) return false;
    this.menuOpen = true; sc.explorationOpen = true; this.rewardMenu = reward; this.menuItem = item;
    // Set the synchronous latch before pause/openDialog: the current update still runs.
    sc.scene.pause(); sc.soundscape?.syncBlock?.();
    const offset = reward ? 1 : item.id === 'altar_2' ? 3 : 0;
    this.offers = available.slice(offset % available.length).concat(available.slice(0, offset % available.length)).slice(0, 3);
    let dialog;
    try { dialog = GamePortal.openDialog(reward ? 'Tesouro do Juramento' : 'Altar de oferendas'); }
    catch (_) { this.finishMenu(true); return false; }
    if (!dialog) { this.finishMenu(true); return false; }
    this.dialog = dialog;
    const originalClose = dialog.close.bind(dialog);
    dialog.close = () => { originalClose(); this.finishMenu(true); };
    const paragraph = text => { const node = document.createElement('p'); node.textContent = text; dialog.body.append(node); return node; };
    paragraph(reward ? 'Uma relíquia opcional do Guardião. Escolha com cuidado: cada poder tem um preço.' : 'Custo: 25% da vida máxima (' + cost + ' HP). Chance de emboscada: 35%. Cancelar não custa vida.');
    paragraph('Máximo de três relíquias por partida. Escolha uma opção:');
    this.offers.forEach((id, index) => {
      const relic = RELICS[id], button = document.createElement('button');
      button.type = 'button'; button.className = 'portal-button';
      const name = document.createElement('strong'); name.textContent = (index + 1) + '. ' + relic.name;
      const desc = document.createElement('span'); desc.textContent = ' — ' + (relic.desc || relic.description || relic.effect || '');
      const drawback = document.createElement('span'); drawback.textContent = ' Contrapartida: ' + (relic.drawback || relic.penalty || relic.downside || 'consulte os efeitos da relíquia.');
      button.append(name, desc, drawback); button.style.display = 'block'; button.style.width = '100%'; button.style.margin = '12px 0'; button.style.whiteSpace = 'normal';
      button.addEventListener('click', () => this.confirmRelic(id)); dialog.body.append(button);
    });
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'portal-button'; cancel.textContent = reward ? 'Recusar relíquia' : 'Cancelar';
    cancel.addEventListener('click', () => { if (reward) this.rewardClaimed = true; this.cancelMenu(); }); dialog.footer.append(cancel);
    dialog.panel.addEventListener('keydown', event => {
      if (/^[123]$/.test(event.key)) { event.preventDefault(); event.stopPropagation(); this.confirmRelic(this.offers[Number(event.key) - 1]); }
    });
    // openDialog's X button closes over its original function; observe that close too.
    dialog.panel.querySelector('.portal-close')?.addEventListener('click', () => this.finishMenu(true));
    if (typeof MutationObserver !== 'undefined' && document.body) {
      this.menuObserver = new MutationObserver(() => { if (!dialog.panel.isConnected) this.finishMenu(true); });
      this.menuObserver.observe(document.body, { childList: true, subtree: true });
    }
    return true;
  }

  confirmRelic(id) {
    if (!this.menuOpen || this.blocked(true) || !this.offers.includes(id)) return false;
    const sc = this.scene, p = sc.player, item = this.menuItem, reward = this.rewardMenu;
    if (!item || (!reward && item.used) || (reward && (this.rewardClaimed || this.secretState !== 'defeated'))) return false;
    const cost = reward ? 0 : p.maxHp * .25;
    if (p.hp <= cost || !this.availableRelics().includes(id)) return false;
    if (!p.addRelic(id)) return false;
    p.hp -= cost;
    if (reward) this.rewardClaimed = true;
    else {
      item.used = true; this.record('altar', this.stageId + ':' + item.id);
    }
    this.cancelMenu(); this.refreshArt();
    sc.announce('Relíquia recebida: ' + RELICS[id].name, 0xe7d397);
    if (!reward && Math.random() < .35) this.ambush(item);
    return true;
  }

  finishMenu(resume) {
    if (!this.menuOpen) return;
    this.menuOpen = false; this.scene.explorationOpen = false; this.offers = []; this.menuItem = null; this.dialog = null;
    this.menuObserver?.disconnect(); this.menuObserver = null;
    const sc = this.scene, ui = this.ui();
    if (resume && !this.dead && !sc.ended && !sc.cinematic && !sc.transitioning && !sc.levelUpOpen && !sc.chestOpen && !ui?.paused && !ui?.lvlActive && !(typeof GamePortal !== 'undefined' && GamePortal.dialogOpen)) sc.scene.resume();
  }
  cancelMenu() { if (this.dialog) this.dialog.close(); else this.finishMenu(true); }

  ambush(item) {
    const sc = this.scene;
    const ids = (sc.stage?.enemyIds || []).filter(id => ENEMIES[id] && !ENEMIES[id].explorationOnly && ENEMIES[id].weight > 0 && Number.isFinite(ENEMIES[id].from));
    if (!ids.length) return;
    sc.announce('A oferenda despertou uma emboscada!', 0xe1a382);
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const p = this.walkable(item.x + Math.cos(angle) * 210, item.y + Math.sin(angle) * 210, [], 16);
      if (!sc.enemies.spawn(ids[i % ids.length], p.x, p.y, sc.enemies.hpMul(sc.t), true)) break;
    }
  }

  summonGuardian() {
    if (this.secretState !== 'pending' || this.blocked()) return false;
    const sc = this.scene;
    const pos = this.walkable(this.shrine.x + 150, this.shrine.y - 80, [], 32);
    const e = sc.enemies.spawn('forest_oathkeeper', pos.x, pos.y, 1, false, true);
    if (!e) { sc.announce('O Guardião aguarda espaço. O santuário permanece ativo.', 0xa5c9b4); return false; }
    e.isBoss = true; e.isExplorationBoss = true;
    this.encounter = { enemy: e, uid: e.uid, attackCd: 2.2 };
    this.secretState = 'active'; this.refreshArt();
    sc.announce('GUARDIÃO DO JURAMENTO — encontro opcional', 0xb9e7b6);
    sc.fx?.ring(e.x, e.y, 12, 150, 1, 0x91d8ae, 4, .35);
    return true;
  }

  update(dt) {
    if (this.dead) return;
    // A won reward remains deliverable after the official encounter starts.
    if (!this.scene.ended && !this.scene.cinematic && !this.menuOpen) this.deliverChest();
    if (this.blocked()) return;
    if (this.secretState === 'pending') this.summonGuardian();
    if (this.secretState !== 'active' || !this.encounter) return;
    const sc = this.scene, e = this.encounter.enemy;
    if (!e.alive || e.uid !== this.encounter.uid || !e.isExplorationBoss) {
      this.clearThreats(); this.encounter = null; this.secretState = 'ready'; this.refreshArt(); return;
    }
    const p = sc.player, scale = (sc.dmgScale?.() || 1) * (sc.difficulty?.dmgMul || 1);
    if (e.contactCd <= 0 && Math.hypot(p.x - e.x, p.y - e.y) < e.radius + p.radius) {
      if (p.takeDamage(e.def.dmg * scale * (e.state === 'charge' ? 1.35 : 1))) e.contactCd = .7;
    }
    this.encounter.attackCd -= Math.min(.25, Math.max(0, dt));
    if (this.encounter.attackCd <= 0) {
      this.encounter.attackCd = e.hp < e.maxHp * .5 ? 2.7 : 3.8;
      const mark = (x, y, delay) => sc.addHazard({ shape: 'circle', x, y, r: 64, delay, dmg: 25 * scale, col: 0xa4e8b9, kind: 'dark', explorationUid: this.encounter.uid });
      mark(p.x, p.y, 1.25);
      if (e.hp < e.maxHp * .5) { mark(p.x - 125, p.y, 1.5); mark(p.x + 125, p.y, 1.5); }
    }
  }

  deliverChest() {
    if (this.chestPending && !this.chestDelivered) {
      const pos = this.rewardPosition || this.shrine;
      if (pos && this.scene.progression?.dropChest(pos.x, pos.y, true)) { this.chestDelivered = true; this.chestPending = false; }
    }
  }

  onKill(e) {
    if (this.dead || this.secretState !== 'active' || !this.encounter || e !== this.encounter.enemy || e.uid !== this.encounter.uid || !e.isExplorationBoss || e.id !== 'forest_oathkeeper' || e.alive) return;
    this.secretState = 'defeated'; this.rewardPosition = { x: e.x, y: e.y };
    this.chestPending = true; this.deliverChest(); this.clearThreats(); this.encounter = null;
    this.record('secret', 'forest-oathkeeper'); this.refreshArt();
    this.scene.announce('Juramento cumprido! Visual Juramentado liberado. Tesouro no santuário.', 0xffdf99);
  }

  clearThreats() {
    const uid = this.encounter?.uid;
    if (uid && this.scene.hazards) this.scene.hazards = this.scene.hazards.filter(h => h.explorationUid !== uid);
  }

  beforeBossFight() {
    this.cancelMenu(); this.clearThreats();
    const e = this.encounter?.enemy;
    if (e?.alive && e.uid === this.encounter.uid && e.isExplorationBoss) this.scene.enemies.kill(e, true);
    this.encounter = null;
    if (this.secretState === 'active' || this.secretState === 'pending') this.secretState = 'ready';
    this.refreshArt();
  }

  record(type, id) {
    const key = type + ':' + id;
    if (this.recorded.has(key)) return;
    this.recorded.add(key);
    try { if (typeof MetaProgress !== 'undefined') MetaProgress.record({ type, id }, this.scene.metaProfileKey); } catch (_) { /* local cosmetic storage is optional */ }
  }

  refreshArt() {
    for (const altar of this.altars) altar.sprite.setAlpha(altar.used ? .4 : 1).setTint(altar.used ? 0x777777 : 0xffffff);
    for (const symbol of this.symbols) symbol.sprite.setAlpha(symbol.found ? .5 : 1).setTint(symbol.found ? 0xa8efc8 : 0xffffff);
    if (this.shrine) this.shrine.sprite.setTint(this.secretState === 'sealed' ? 0x67766b : this.secretState === 'defeated' ? 0xffe1a1 : 0xb4f7cd);
  }

  capture() {
    return { altars: this.altars.map(a => ({ used: a.used })), symbols: this.symbols.map(s => s.found),
      secretState: this.secretState, rewardClaimed: this.rewardClaimed, chestDelivered: this.chestDelivered,
      rewardPosition: this.rewardPosition ? { ...this.rewardPosition } : null, recorded: [...this.recorded] };
  }

  destroy() {
    if (this.dead) return;
    this.dead = true; this.beforeBossFight(); this.scene.explorationOpen = false;
    this.scene.events?.off('shutdown', this.onShutdown);
    for (const item of [...this.altars, ...this.symbols, ...(this.shrine ? [this.shrine] : [])]) item.sprite.destroy();
  }
}

function drawExplorationAssets(scene) {
  SPR.make(scene, 'exploration_altar', 26, 24, 1, 3, P => {
    P.shadow(13, 22, 24); P.r(2, 19, 22, 3, '#252d30'); P.r(4, 17, 18, 3, '#56605b');
    P.r(7, 8, 12, 11, '#394941'); P.r(5, 6, 16, 4, '#758575'); P.r(7, 7, 12, 1, '#b5b498');
    P.r(10, 11, 6, 6, '#192b24'); P.line(13, 11, 10, 14, '#a7e0b4'); P.line(10, 14, 13, 17, '#a7e0b4'); P.line(13, 17, 16, 14, '#a7e0b4'); P.line(16, 14, 13, 11, '#a7e0b4');
    P.disc(13, 4, 2, '#c6eec2'); P.p(13, 1, '#e8e6c3');
  });
  for (let i = 0; i < 3; i++) SPR.make(scene, 'exploration_symbol_' + i, 16, 20, 1, 3, P => {
    P.shadow(8, 18, 13); P.r(3, 3, 10, 14, '#394b43'); P.r(4, 1, 8, 3, '#607063'); P.r(4, 4, 1, 11, '#8c9580'); P.r(2, 17, 12, 2, '#202f2a');
    const c = '#b9ecc5';
    if (i === 0) { P.line(8, 6, 5, 12, c); P.line(5, 12, 11, 12, c); P.line(11, 12, 8, 6, c); }
    if (i === 1) { P.r(7, 5, 2, 10, c); P.r(5, 8, 6, 2, c); }
    if (i === 2) { P.line(8, 5, 5, 9, c); P.line(5, 9, 8, 14, c); P.line(8, 14, 11, 9, c); P.line(11, 9, 8, 5, c); }
  });
  SPR.make(scene, 'exploration_shrine', 42, 30, 1, 3, P => {
    P.shadow(21, 28, 39); P.r(2, 24, 38, 4, '#263931'); P.r(6, 21, 30, 4, '#64775f'); P.r(14, 17, 14, 5, '#3d5545');
    for (const x of [7, 30]) { P.r(x, 8, 5, 15, '#4e6251'); P.r(x - 1, 5, 7, 4, '#89977a'); P.r(x + 1, 2, 3, 4, '#b4c495'); }
    P.line(12, 8, 18, 3, '#90b595', 2); P.line(18, 3, 24, 3, '#90b595', 2); P.line(24, 3, 30, 8, '#90b595', 2);
    P.disc(21, 12, 5, '#263e32'); P.line(21, 7, 17, 12, '#b6e5ad'); P.line(17, 12, 21, 17, '#b6e5ad'); P.line(21, 17, 25, 12, '#b6e5ad'); P.line(25, 12, 21, 7, '#b6e5ad');
  });
}
