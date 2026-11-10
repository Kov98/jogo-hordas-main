// Pure combat checks: run the real catalogs, weapon logic and shot pool in a VM.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ids = ['cyclone', 'radiant_beam', 'plasma', 'meteor'];
const context = vm.createContext({ console, Math, Set, Map, CONFIG: { maxPlayerShots: 160 }, Phaser: { BlendModes: { ADD: 1, NORMAL: 0 } } });
for (const file of ['data.js', 'powers.js', 'progression.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context, { filename: file });
const api = vm.runInContext('({POWERS, CHARACTERS, POWER_IMPL, PowerInstance, PlayerShots, drawProgressionAssets})', context);
function sprite(x, y, texture) {
  const s = { x, y, texture, visible: true, destroyed: false };
  for (const method of ['setDepth', 'setAlpha', 'setScale', 'setRotation', 'setBlendMode', 'setFrame', 'setOrigin', 'setDisplaySize', 'setTint']) s[method] = function (...args) { this[method.slice(3)] = args; return this; };
  s.setPosition = function (x, y) { this.x = x; this.y = y; return this; };
  s.setTexture = function (t) { this.texture = t; return this; };
  s.setVisible = function (v) { this.visible = v; return this; };
  s.setActive = function (v) { this.active = v; return this; };
  s.destroy = function () { this.destroyed = true; this.visible = false; };
  return s;
}
function fixture(id, level = 1, mods = {}) {
  const enemies = [], sprites = [], hits = [];
  const query = (x, y, r, out = []) => { out.length = 0; for (const e of enemies) if (e.alive && Math.hypot(e.x - x, e.y - y) <= r + e.radius) out.push(e); return out; };
  const sc = { t: 0, tmpA: [], tmpB: [], tmpC: [], queryEnemies: query, grid: { query }, world: { outside: () => false },
    fx: Object.fromEntries(['ring', 'burst', 'bolt', 'embers', 'teleCircle'].map(k => [k, () => {}])), cameras: { main: { worldView: { x: -320, y: -240, width: 640, height: 480 }, shake() {} } },
    add: { image(x, y, texture) { const s = sprite(x, y, texture); sprites.push(s); return s; } },
    damageEnemy(e, damage, source) { if (!e.alive) return; e.hp -= damage; hits.push({ uid: e.uid, damage, source, time: this.t }); if (e.hp <= 0) e.alive = false; },
  };
  const player = { x: 0, y: 0, aim: { x: 1, y: 0 }, mods: { damage: 1, rate: 1, range: 1, area: 1, ...mods } };
  sc.pShots = new api.PlayerShots(sc);
  const power = new api.PowerInstance(sc, player, api.POWERS[id]);
  while (power.level < level) power.levelUp();
  function enemy(x, y, options = {}) { const e = { x, y, uid: enemies.length + 1, hp: 1e7, radius: 10, alive: true, hitT: {}, def: { kb: 1 }, ...options }; enemies.push(e); return e; }
  function step(duration, dt = .01) { for (let t = 0; t < duration - 1e-8; t += dt) { sc.t += dt; power.update(dt); sc.pShots.update(dt); } }
  return { sc, player, power, enemies, sprites, hits, enemy, step };
}
let checks = 0;
function check(name, fn) { try { fn(); checks++; console.log('PASS', name); } catch (err) { console.error('FAIL', name); throw err; } }

check('four common catalog entries, seven distinct upgrades and channeler starting values', () => {
  for (const id of ids) {
    assert.ok(api.POWERS[id], 'missing common weapon ' + id);
    assert.ok(api.POWER_IMPL[id]);
    assert.notEqual(api.POWERS[id].obtainable, false);
    assert.equal(api.POWERS[id].upgrades.length, 7);
    assert.equal(new Set(api.POWERS[id].upgrades.map(u => u.text)).size, 7);
    const f = fixture(id); const start = { ...f.power.s };
    for (let n = 0; n < 7; n++) { const before = JSON.stringify(f.power.s); f.power.levelUp(); assert.notEqual(JSON.stringify(f.power.s), before); }
    assert.equal(f.power.maxed, true); f.power.levelUp(); assert.equal(f.power.level, 8);
    assert.ok(f.power.s.damage > start.damage); f.power.destroy();
  }
  assert.equal(api.CHARACTERS.channeler.hp, 110);
  assert.equal(api.CHARACTERS.channeler.speed, 165);
  assert.equal(api.CHARACTERS.channeler.startPower, 'plasma');
});

for (const id of ids) for (const level of [1, 8]) check(id + ' level ' + level + ' deals real modified damage and stops after destroy', () => {
  const f = fixture(id, level, { damage: 1.6, area: 1.2, range: 1.2, rate: 1.3 });
  f.enemy(90, -6); f.step(2);
  assert.ok(f.hits.length > 0, id + ' never damaged its target');
  assert.ok(f.hits.some(h => Math.abs(h.damage - f.power.dmg()) < .001), 'damage modifier must reach damageEnemy');
  assert.equal(f.power.cd(), f.power.s.cooldown / 1.3);
  assert.equal(f.power.range(), f.power.s.range * 1.2);
  f.power.destroy(); const before = f.hits.length;
  f.step(5); assert.equal(f.hits.length, before, 'destroyed weapon continues to damage');
  assert.equal(f.sc.pShots.items.filter(s => s.live).length, 0);
  assert.ok(f.sprites.filter(s => !f.sc.pShots.items.includes(s)).every(s => s.destroyed));
});

check('beam announces its circular footprint before damaging it in repeated pulses', () => {
  const f = fixture('radiant_beam');
  const target = f.enemy(180, 0, { radius: 0 }), nearby = f.enemy(180, 24, { radius: 0 });
  const diagonalOutside = f.enemy(200, 20, { radius: 0 }), oldStrip = f.enemy(320, 0, { radius: 0 });
  f.step(.41);
  assert.equal(f.hits.length, 0, 'beam damages during the ground warning');
  const seal = f.sprites.find(s => s.texture === 'fx_radiant_seal');
  assert.ok(seal?.visible, 'selected impact has no visible ground seal');
  assert.deepEqual([seal.x, seal.y, ...seal.DisplaySize], [180, 0, 52, 52]);
  f.step(.18); assert.equal(f.hits.length, 0, 'warning shorter than 0.2 seconds');
  f.step(.13); assert.ok(f.hits.some(h => h.uid === target.uid), 'column never lands after its short warning');
  assert.ok(f.hits.some(h => h.uid === nearby.uid), 'circular footprint misses an enemy above/below the old strip');
  assert.equal(diagonalOutside.hp, 1e7, 'damage uses a square instead of the visible circle');
  assert.equal(oldStrip.hp, 1e7, 'obsolete player-to-target strip still deals damage');
  const firstPulse = f.hits.find(h => h.uid === target.uid).time;
  f.step(.1); assert.equal(f.hits.filter(h => h.uid === target.uid).length, 1, 'pulses ignore hit interval');
  f.step(.11);
  const pulses = f.hits.filter(h => h.uid === target.uid);
  assert.equal(pulses.length, 2); assert.ok(pulses[1].time - firstPulse >= .19);
});
check('beam snapshots the target point across player movement and enemy UID recycling', () => {
  const f = fixture('radiant_beam'); const target = f.enemy(120, 40);
  f.step(.41); f.player.x = -500; f.player.y = 350;
  target.x = 900; target.y = 800; target.uid = 999;
  const replacement = f.enemy(120, 40, { uid: 777 });
  f.step(.4);
  assert.equal(target.hp, 1e7, 'beam followed the recycled target object');
  assert.ok(replacement.hp < 1e7, 'beam abandoned its original marked location');
  assert.ok(f.hits.every(h => h.source.x === 120 && h.source.y === 40), 'damage origin moved with the player');
  const seal = f.sprites.find(s => s.texture === 'fx_radiant_seal');
  assert.deepEqual([seal.x, seal.y], [120, 40]);
});
check('beam cannot select a target beyond its modified reach', () => {
  const f = fixture('radiant_beam', 1, { range: 1.5 });
  const outside = f.enemy(665, 0); f.step(1);
  assert.equal(f.hits.length, 0); assert.ok(f.sprites.slice(160).every(s => !s.visible));
  outside.x = 650; f.step(.6); assert.ok(f.hits.some(h => h.uid === outside.uid));
});
check('beam warning cancels before impact on destroy even after a long update', () => {
  const f = fixture('radiant_beam'); f.enemy(120, 40);
  f.power.update(.41); assert.equal(f.hits.length, 0, 'the casting frame skipped the warning');
  f.power.destroy(); f.power.update(3);
  assert.equal(f.hits.length, 0); assert.equal(f.power.pending.length, 0);
  assert.ok(f.sprites.slice(160).every(s => s.destroyed && !s.visible));
});
check('cyclone advances and gently pulls common enemies, never bosses', () => {
  const f = fixture('cyclone'); const common = f.enemy(110, 20), boss = f.enemy(110, 20, { uid: 99, isBoss: true });
  f.step(1);
  assert.ok(f.hits.some(h => h.uid === common.uid));
  assert.notEqual(common.y, 20); assert.equal(boss.x, 110); assert.equal(boss.y, 20);
});
check('recycled enemy object with a new UID can be hit by existing plasma shot', () => {
  const f = fixture('plasma', 8); const e = f.enemy(50, -6);
  f.step(.49); assert.ok(f.hits.length);
  e.uid = 999; e.x += 10; e.hp = 1e7; e.alive = true;
  f.step(.06); assert.ok(f.hits.some(h => h.uid === 999), 'projectile retains object reference instead of UID');
});
check('meteor stores impact coordinates when target object is recycled', () => {
  const f = fixture('meteor'); const old = f.enemy(100, 0); f.step(.41);
  old.x = 700; old.uid = 888;
  const replacement = f.enemy(100, 0, { uid: 777 }); f.step(1.1);
  assert.ok(replacement.hp < 1e7); assert.equal(old.hp, 1e7);
});
check('meteor warning cancels before impact on destroy', () => {
  const f = fixture('meteor'); f.enemy(100, 0); f.step(.45); assert.equal(f.hits.length, 0);
  f.power.destroy(); f.step(3); assert.equal(f.hits.length, 0);
});
check('plasma cleanup removes only its own pooled shots', () => {
  const f = fixture('plasma'); f.enemy(180, -6); f.step(.42);
  const other = f.sc.pShots.fire({ tex: 'p_arrow', x: 0, y: 1000, ang: 0, speed: 1, range: 100, dmg: 1, pierce: 1, radius: 1 });
  f.power.destroy(); assert.equal(other.live, true); assert.equal(f.sc.pShots.items.filter(s => s.live).length, 1);
});
check('fixed visual budgets and global 160 shot pool hold under extreme rate modifiers', () => {
  for (const id of ids) {
    const f = fixture(id, 8, { rate: 1000, area: 3, range: 2 }); f.enemy(100, 0); const initial = f.sprites.length;
    f.step(12, .02);
    assert.equal(f.sc.pShots.items.length, 160);
    assert.ok(f.sc.pShots.items.filter(s => s.live).length <= 160);
    assert.equal(f.sprites.length, initial, id + ' allocates sprites during combat instead of reusing its budget');
    assert.ok(initial <= 184, 'persistent visual budget exceeds 24 sprites');
    f.power.destroy();
  }
});
check('cyclone ground footprint follows the damage center and all layers expire together', () => {
  const f = fixture('cyclone', 8, { area: 2.4, range: 1.7, rate: 1000 });
  f.enemy(100, 0); f.step(.43);
  const footprints = f.sprites.filter(s => s.texture === 'fx_cyclone_ground');
  assert.ok(footprints.some(s => s.visible), 'active tornado has no visible ground footprint');
  for (const v of f.power.state.vortices.filter(v => v.life > 0)) {
    const ground = footprints.find(s => s.visible && s.x === v.x && s.y === v.y);
    assert.ok(ground, 'footprint is detached from the damage center');
    assert.equal(ground.DisplaySize[0], 240);
    assert.equal(ground.DisplaySize[1], 240);
  }
  const allocated = f.sprites.length;
  f.step(12, .02); assert.equal(f.sprites.length, allocated, 'wind/debris allocate during spam');
  f.power.timer = 100; f.step(5);
  assert.ok(f.sprites.slice(160).every(s => !s.visible), 'expired vortex leaves a visible layer');
  f.power.destroy(); assert.ok(f.sprites.slice(160).every(s => s.destroyed));
});
check('beam falls from above the camera onto the fixed circle and all visuals expire together', () => {
  const f = fixture('radiant_beam', 1, { area: 2, range: 1.5 });
  const target = f.enemy(180, 80), outside = f.enemy(310, 80);
  f.step(.71);
  const owned = f.sprites.slice(160), emitter = owned.find(s => s.texture === 'fx_radiant_source');
  assert.ok(emitter?.visible, 'active beam has no overhead light source');
  assert.equal(emitter.x, 180); assert.ok(emitter.y < f.sc.cameras.main.worldView.y, 'beam source is not above the viewport');
  assert.ok(owned.some(s => s.texture === 'fx_radiant_halo' && s.visible), 'beam has no reusable halo');
  assert.ok(owned.some(s => s.texture === 'fx_radiant_impact' && s.visible && s.x === target.x && s.y === target.y), 'damaged target has no impact flare');
  assert.ok(!owned.some(s => s.texture === 'fx_radiant_impact' && s.visible && s.x === outside.x), 'impact appears outside damaged circle');
  const column = f.power.state.sprite;
  assert.equal(column.x, 180); assert.equal(column.y, emitter.y);
  assert.ok(Math.abs(column.Rotation[0] - Math.PI / 2) < 1e-8, 'column is not vertical');
  assert.equal(column.y + column.DisplaySize[0], 80, 'column misses the ground impact');
  const seal = owned.find(s => s.texture === 'fx_radiant_seal');
  assert.deepEqual([seal.x, seal.y, ...seal.DisplaySize], [180, 80, 104, 104]);
  f.player.x = 12; f.player.y = 14; f.sc.cameras.main.worldView.y = -900; f.step(.01);
  assert.equal(emitter.x, 180); assert.ok(emitter.y < -900, 'camera movement reveals a beam beginning in midair');
  assert.equal(column.y + column.DisplaySize[0], 80); assert.equal(seal.x, 180); assert.equal(seal.y, 80);
  f.power.timer = 100; f.step(2);
  assert.ok(owned.every(s => !s.visible), 'beam leaves a halo, mote or flare after its damage ends');
  const before = f.hits.length; f.step(1); assert.equal(f.hits.length, before, 'expired beam keeps damaging');
  f.power.destroy(); assert.ok(owned.every(s => s.destroyed));
});
check('procedural icons and all four weapon textures can be generated', () => {
  const assets = new Set();
  context.SPR = { make(sc, key, w, h, frames, scale, draw) { assets.add(key); const pen = Object.fromEntries(['r','p','m','mp','line','disc','shadow'].map(k => [k, () => {}])); for (let f = 0; f < frames; f++) draw(pen, f); } };
  api.drawProgressionAssets({});
  for (const id of ids) assert.ok(assets.has('i_' + id), 'missing icon ' + id);
  for (const tex of ['fx_cyclone', 'fx_radiant_beam', 'fx_radiant_seal', 'p_plasma', 'p_meteor', 'fx_meteor_mark']) assert.ok(assets.has(tex), 'missing combat texture ' + tex);
});
console.log(`new_powers_checks: ${checks} checks passed`);
