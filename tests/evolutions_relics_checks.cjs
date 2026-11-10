// Real combat/progression/player behavior; only Phaser's renderer is doubled.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ console, Math, Set, Map, Sfx: { play() {} }, Phaser: { BlendModes: { ADD: 1, NORMAL: 0 } } });
for (const file of ['config.js', 'data.js', 'powers.js', 'progression.js', 'player.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context, { filename: file });
const api = vm.runInContext('({POWERS, CHARACTERS, POWER_IMPL, PowerInstance, PlayerShots, Player, ProgressionSystem, PROGRESSION_RECIPES, drawProgressionAssets, relics: typeof RELICS === "undefined" ? null : RELICS})', context);
const recipes = [['cyclone', 'area', 'fire_hurricane'], ['radiant_beam', 'range', 'celestial_judgment'], ['plasma', 'rate', 'plasma_storm'], ['meteor', 'damage', 'meteor_cataclysm']];
function sprite(x, y, texture) {
  const s = { x, y, texture, visible: true, destroyed: false, anims: { pause() {}, resume() {}, isPlaying: false }, play() { return this; } };
  for (const method of ['setDepth', 'setAlpha', 'setScale', 'setRotation', 'setBlendMode', 'setFrame', 'setOrigin', 'setDisplaySize', 'setTint', 'setTintFill', 'clearTint', 'setFlipX']) s[method] = function (...args) { this[method.slice(3)] = args; return this; };
  s.setPosition = function (x, y) { this.x = x; this.y = y; return this; };
  s.setTexture = function (t) { this.texture = t; return this; };
  s.setVisible = function (v) { this.visible = v; return this; };
  s.setActive = function (v) { this.active = v; return this; };
  s.destroy = function () { this.destroyed = true; this.visible = false; };
  return s;
}
function fixture(id, level = 1, mods = {}) {
  const enemies = [], sprites = [], hits = [], fx = [];
  const query = (x, y, r, out = []) => { out.length = 0; for (const e of enemies) if (e.alive && Math.hypot(e.x - x, e.y - y) <= r + e.radius) out.push(e); return out; };
  const sc = { t: 0, tmpA: [], tmpB: [], tmpC: [], queryEnemies: query, grid: { query }, world: { outside: () => false },
    fx: Object.fromEntries(['ring', 'burst', 'bolt', 'embers', 'teleCircle', 'number'].map(k => [k, (...args) => fx.push({ kind: k, args })])), cameras: { main: { shake() {} } },
    add: { image(x, y, texture) { const s = sprite(x, y, texture); sprites.push(s); return s; }, sprite(x, y, tex) { return this.image(x, y, tex); } },
    damageEnemy(e, damage, source) { if (!e.alive) return; e.hp -= damage; hits.push({ uid: e.uid, damage, source }); if (e.hp <= 0) e.alive = false; },
    rollChoices: () => [], onPlayerDeath() { this.deaths = (this.deaths || 0) + 1; },
  };
  sc.explodeAt = (x, y, radius, damage, kind, knock) => { for (const e of query(x, y, radius)) sc.damageEnemy(e, damage, { x, y, kind, knock }); };
  const player = sc.player = new api.Player(sc, api.CHARACTERS.channeler, 0, 0);
  Object.assign(player.mods, mods); sc.pShots = new api.PlayerShots(sc); sc.progression = new api.ProgressionSystem(sc);
  const power = id && player.addPower(id); if (power) while (power.level < level) power.levelUp();
  function enemy(x, y, options = {}) { const e = { x, y, uid: enemies.length + 1, hp: 1e7, radius: 10, alive: true, hitT: {}, def: { kb: 1 }, ...options }; enemies.push(e); return e; }
  function step(duration, dt = .01) { for (let t = 0; t < duration - 1e-8; t += dt) { sc.t += dt; for (const w of player.powers) w.update(dt); sc.pShots.update(dt); } }
  return { sc, player, power, enemies, sprites, hits, fx, enemy, step };
}
let checks = 0;
function check(name, fn) { try { fn(); checks++; console.log('PASS', name); } catch (err) { console.error('FAIL', name); throw err; } }
function close(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`); }

check('four chest recipes require weapon 8, passive 1 and minute five, then cancel and replace base once', () => {
  for (const [base, passive, evolved] of recipes) {
    const f = fixture(base, 7), recipe = api.PROGRESSION_RECIPES.find(r => r.id === evolved);
    assert.ok(recipe, 'missing recipe ' + evolved);
    assert.equal(f.sc.progression.canOfferPower(evolved), false);
    f.sc.t = 300; f.player.passives[passive] = 1;
    assert.equal(f.sc.progression.eligible(recipe), false);
    f.power.levelUp(); delete f.player.passives[passive]; assert.equal(f.sc.progression.eligible(recipe), false);
    f.player.passives[passive] = 1; f.sc.t = 299.99; assert.equal(f.sc.progression.eligible(recipe), false);
    f.sc.t = 300; f.enemy(100, 0); f.power.update(.41);
    assert.equal(f.sc.progression.applyRecipe(evolved), true);
    assert.equal(f.power.destroyed, true); assert.equal(f.power.pending.length, 0);
    assert.equal(f.player.hasPower(base), undefined); assert.ok(f.player.hasPower(evolved));
    assert.equal(f.sc.progression.applyRecipe(evolved), false); assert.equal(f.sc.progression.canOfferPower(base), false);
    assert.equal(f.sc.progression.getOffers(false).some(o => o.id === evolved), false);
    f.player.destroy();
  }
});
check('six optional relics validate IDs, remain unique and cap at three without changing passives', () => {
  assert.equal(Object.keys(api.relics || {}).length, 6);
  const f = fixture(), p = f.player, before = JSON.stringify(p.mods);
  assert.equal(p.addRelic('missing'), false);
  assert.equal(p.addRelic('twin_seal'), true); assert.equal(p.addRelic('twin_seal'), false);
  assert.equal(p.addRelic('glass_heart'), true); assert.equal(p.addRelic('restless_clock'), true);
  assert.equal(p.addRelic('ashen_cup'), false); assert.equal(p.relics.length, 3);
  assert.equal(JSON.stringify(p.mods), before); assert.equal(Object.keys(p.passives).length, 0);
  assert.equal(p.removeRelic('missing'), false); assert.equal(p.removeRelic('twin_seal'), true);
  assert.equal(p.addRelic('ashen_cup'), true); assert.equal(JSON.stringify(p.mods), before);
});
check('derived relic damage, rate, movement and conditional blood oath undo without drift', () => {
  const f = fixture('plasma'), p = f.player, w = f.power;
  p.addRelic('glass_heart'); p.addRelic('restless_clock'); p.addRelic('blood_oath');
  close(w.dmg(), 16 * 1.3 * .85); close(w.cd(), 1.1 / 1.25);
  p.hp = p.maxHp * .35; close(w.dmg(), 16 * 1.3 * .85);
  p.hp -= .001; close(w.dmg(), 16 * 1.3 * .85 * 1.45);
  close(p.relicMultiplier('incoming'), 1.25 * 1.15);
  for (let i = 0; i < 30; i++) { p.removeRelic('glass_heart'); p.addRelic('glass_heart'); }
  close(w.dmg(), 16 * 1.3 * .85 * 1.45);
  for (const id of [...p.relics]) p.removeRelic(id);
  p.addRelic('pilgrim_chain'); p.addRelic('twin_seal'); close(p.speed, 165 * 1.2 * .82); close(w.cd(), 1.1 / .88);
  p.removeRelic('pilgrim_chain'); p.removeRelic('twin_seal'); close(p.speed, 165); close(w.dmg(), 16); close(w.cd(), 1.1);
});
check('incoming penalties and all player/passive heals respect relic multipliers', () => {
  const f = fixture(), p = f.player;
  p.addRelic('glass_heart'); p.addRelic('blood_oath'); p.addRelic('ashen_cup');
  assert.equal(p.takeDamage(10), true); close(p.hp, 110 - 14.375);
  p.hp = 20; p.heal(20); close(p.hp, 32);
  p.addPassive('maxHp'); close(p.maxHp, 130); close(p.hp, 44);
  close(p.relicMultiplier('damage'), 1.3 * 1.2 * 1.45);
  p.removeRelic('ashen_cup'); p.heal(20); close(p.hp, 64);
});
check('twin seal doubles arrows, spears, fire and plasma within the global pool', () => {
  for (const id of ['arrows', 'pierce', 'fireball', 'plasma']) {
    const f = fixture(id); f.enemy(250, 0); f.player.addRelic('twin_seal'); f.power.update(.41);
    assert.equal(f.sc.pShots.items.filter(s => s.live).length, 2, id);
    assert.equal(f.player.projectileCount(3), 6);
  }
});
for (const [base, passive, id] of recipes) check(id + ' damages with existing modifiers, has bounded reusable effects and destroys cleanly', () => {
  const f = fixture(id, 1, { damage: 1.6, area: 1.4, range: 1.2, rate: 1000 });
  f.enemy(90, 0); f.enemy(140, 35); const allocated = f.sprites.length;
  f.step(8, .02); assert.ok(f.hits.length, id + ' never damages');
  assert.ok(f.hits.some(h => Math.abs(h.damage - f.power.s.damage * 1.6) < 1e-6), 'base damage must use existing modifiers');
  assert.equal(f.sprites.length, allocated, 'allocates visuals during combat');
  assert.ok(allocated <= 178, 'effect budget exceeds eighteen reusable sprites');
  const budgets = { fire_hurricane: { fx_fire_hurricane: 6, fx_fire_hurricane_embers: 6 }, celestial_judgment: { fx_celestial_judgment: 3 }, plasma_storm: { p_plasma_storm: 3 }, meteor_cataclysm: { p_meteor_cataclysm: 4, fx_cataclysm_wave: 4 } };
  for (const [texture, max] of Object.entries(budgets[id])) assert.ok(f.sprites.filter(s => s.texture === texture && !s.destroyed).length <= max, texture + ' exceeds its instance budget');
  assert.equal(f.sc.pShots.items.length, 160); assert.ok(f.power.pending.length <= 8);
  f.power.destroy(); const oldHits = f.hits.length; f.step(4); assert.equal(f.hits.length, oldHits);
  assert.ok(f.sprites.slice(162).every(s => s.destroyed), 'weapon visuals survive destruction');
});
check('fire hurricane has ember damage and pulls commons without moving bosses', () => {
  const f = fixture('fire_hurricane'); const common = f.enemy(110, 20), boss = f.enemy(110, 20, { uid: 999, isBoss: true });
  f.step(1.5); assert.notEqual(common.y, 20); assert.equal(boss.x, 110); assert.equal(boss.y, 20);
  assert.ok(f.hits.some(h => h.source.kind === 'fire_hurricane'));
  assert.ok(f.hits.some(h => h.source.kind === 'fire_hurricane_embers'));
});
check('celestial judgment snapshots announced positions and cancels before the light detonates', () => {
  const f = fixture('celestial_judgment'); const old = f.enemy(100, 0); f.step(.42); assert.equal(f.hits.length, 0);
  old.uid = 900; old.x = 900; const replacement = f.enemy(100, 0, { uid: 777 }); f.step(1);
  assert.ok(replacement.hp < 1e7); assert.equal(old.hp, 1e7);
  const g = fixture('celestial_judgment'); g.enemy(100, 0); g.step(.42); g.power.destroy(); g.step(3); assert.equal(g.hits.length, 0);
});
check('plasma storm arcs reach a recycled UID without retaining an old enemy object', () => {
  const f = fixture('plasma_storm'); const e = f.enemy(190, 0); f.step(.8); assert.ok(f.hits.length);
  e.uid = 800; e.hp = 1e7; f.step(1); assert.ok(f.hits.some(h => h.uid === 800));
  assert.ok(f.fx.some(v => v.kind === 'bolt'));
});
check('meteor cataclysm follows its announced spot with two damaging waves, each once per UID', () => {
  const f = fixture('meteor_cataclysm'); const e = f.enemy(100, 0); f.step(.42);
  e.x = 900; e.uid = 888; const replacement = f.enemy(100, 0, { uid: 777 }); f.step(1.8);
  assert.equal(e.hp, 1e7); assert.ok(replacement.hp < 1e7);
  assert.ok(f.hits.some(h => h.source.kind === 'meteor_cataclysm_wave_1'));
  assert.ok(f.hits.some(h => h.source.kind === 'meteor_cataclysm_wave_2'));
  for (const kind of ['meteor_cataclysm', 'meteor_cataclysm_wave_1', 'meteor_cataclysm_wave_2']) assert.equal(f.hits.filter(h => h.uid === 777 && h.source.kind === kind).length, 4, kind + ' must hit once per meteor, never every frame');
  const g = fixture('meteor_cataclysm'); g.enemy(100, 0); g.step(.42); g.power.destroy(); g.step(3); assert.equal(g.hits.length, 0);
});
check('cataclysm shows two separate wave fronts and damages a distant enemy only when the visible front reaches it', () => {
  const f = fixture('meteor_cataclysm'); f.power.s.count = 1;
  f.enemy(100,0); const distant = f.enemy(270,0); f.step(.42);
  const wave = f.sprites.find(s => s.texture === 'fx_cataclysm_wave');
  let bursts = 0, wasVisible = false, lastRadius = 0, seenHits = f.hits.length;
  for (let n=0;n<180;n++) {
    f.step(.01);
    const radius = wave.DisplaySize ? wave.DisplaySize[0] * 30 / 64 : 0;
    if (wave.visible && (!wasVisible || radius < lastRadius * .5)) bursts++;
    for (const hit of f.hits.slice(seenHits).filter(h => h.uid === distant.uid && h.source.kind.includes('_wave_'))) {
      assert.equal(wave.visible,true,'wave damage has no visible front');
      assert.ok(radius + distant.radius >= 170 - .01, 'distant enemy hit before visible wave reaches it: ' + radius);
    }
    seenHits = f.hits.length; wasVisible = wave.visible; lastRadius = radius;
  }
  assert.equal(bursts,2,'each meteor must show two distinct expansions');
  assert.equal(f.hits.filter(h => h.uid === distant.uid && h.source.kind === 'meteor_cataclysm_wave_1').length,0);
  assert.equal(f.hits.filter(h => h.uid === distant.uid && h.source.kind === 'meteor_cataclysm_wave_2').length,1);
});
check('evolutions use area modifiers and are independent of a saturated projectile pool', () => {
  for (const [, , id] of recipes) {
    const f = fixture(id, 1, { area: 2 }); f.enemy(100, 0);
    for (let n = 0; n < 160; n++) f.sc.pShots.fire({ tex: 'p_arrow', x: 0, y: 1000, ang: 0, speed: 1, range: 100, dmg: 1, pierce: 1, radius: 1 });
    f.step(2); assert.ok(f.hits.length); assert.equal(f.sc.pShots.items.filter(s => s.live).length, 160);
    assert.ok(f.sprites.slice(162).some(s => s.DisplaySize?.[0] >= 100), 'area does not scale visuals');
  }
});
check('each evolution and relic has a generated icon, and effects have distinct procedural textures', () => {
  const assets = new Set(); context.SPR = { make(sc, key, w, h, frames, scale, draw) { assets.add(key); const pen = Object.fromEntries(['r','p','m','mp','line','disc','shadow'].map(k => [k, () => {}])); for (let f = 0; f < frames; f++) draw(pen, f); } };
  api.drawProgressionAssets({});
  for (const id of [...recipes.map(r => r[2]), 'twin_seal', 'blood_oath', 'glass_heart', 'restless_clock', 'pilgrim_chain', 'ashen_cup']) assert.ok(assets.has('i_' + id), id);
  for (const tex of ['fx_fire_hurricane', 'fx_fire_hurricane_embers', 'fx_celestial_judgment', 'p_plasma_storm', 'p_meteor_cataclysm', 'fx_cataclysm_wave']) assert.ok(assets.has(tex), tex);
});
check('appearance tint returns after taking damage and clearing the flash', () => {
  const f = fixture(), p = f.player;
  assert.equal(p.appearanceTint, null);
  p.appearanceTint = 0x55aacc; p.update(.01, {}, { constrain() {} }); assert.equal(p.sprite.Tint[0], 0x55aacc);
  p.takeDamage(1); p.update(.01, {}, { constrain() {} }); assert.equal(p.sprite.TintFill[0], 0xff4040);
  p.update(.2, {}, { constrain() {} }); assert.equal(p.sprite.Tint[0], 0x55aacc);
});
check('singularity never pulls official, mini or exploration bosses', () => {
  const f = fixture('singularity');
  const common = f.enemy(110,20), bosses = [{ isBoss:true }, { isMiniBoss:true }, { isExplorationBoss:true }].map((flags,n) => f.enemy(110,20,{ uid:100+n, ...flags }));
  f.step(.42); common.x=130; for (const e of bosses) e.x=130; f.step(.2);
  assert.notEqual(common.x,130); for (const e of bosses) { assert.equal(e.x,130); assert.equal(e.y,20); }
});
check('frequency relics also change orbiting weapon contact frequency', () => {
  for (const [id, normalHits, clockHits] of [['blades',3,4], ['orbs',4,5], ['celestial_ring',5,6]]) {
    const base = fixture(id), fast = fixture(id); base.enemy(0,0,{radius:1000}); fast.enemy(0,0,{radius:1000});
    fast.player.addRelic('restless_clock'); base.step(1.01,.001); fast.step(1.01,.001);
    assert.equal(base.hits.length, normalHits, id + ' base'); assert.equal(fast.hits.length, clockHits, id + ' clock');
  }
  const slow = fixture('orbs'); slow.enemy(0,0,{radius:1000}); slow.player.addRelic('pilgrim_chain'); slow.step(1.01,.001); assert.equal(slow.hits.length,3);
});
console.log(`evolutions_relics_checks: ${checks} checks passed`);
