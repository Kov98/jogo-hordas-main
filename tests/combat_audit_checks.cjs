// Small VM regressions for combat audit findings; the renderer alone is doubled.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ctx = vm.createContext({ console, Math, Set, Map, Sfx: { play() {} }, Phaser: { Scene: class {}, BlendModes: { ADD: 1, NORMAL: 0 } } });
for (const file of ['config', 'util', 'data', 'sprites', 'difficulty', 'powers', 'player', 'enemies', 'boss', 'game']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file + '.js'), 'utf8'), ctx, { filename: file + '.js' });
}
const api = vm.runInContext('({ CONFIG, Grid, Player, PlayerShots, EnemyShots, EnemyManager, Gems, Boss, GameScene, CHARACTERS, resolveDifficulty })', ctx);
// Keep pool sizes representative of reuse while limiting audit memory use.
api.CONFIG.maxEnemies = 6; api.CONFIG.maxGems = 4; api.CONFIG.maxPlayerShots = 4; api.CONFIG.maxEnemyShots = 8;
function display(x, y, texture) {
  const s = { x, y, texture, scaleY: 1, anims: { isPlaying: false, pause() {}, resume() {}, stop() {} }, play() { return this; } };
  for (const method of ['setDepth', 'setAlpha', 'setScale', 'setRotation', 'setBlendMode', 'setFrame', 'setOrigin', 'setDisplaySize', 'setTint', 'setTintFill', 'clearTint', 'setFlipX']) {
    s[method] = function (...args) { this[method.slice(3)] = args; return this; };
  }
  s.setPosition = function (x, y) { this.x = x; this.y = y; return this; };
  s.setTexture = function (t) { this.texture = t; return this; };
  s.setVisible = function (v) { this.visible = v; return this; };
  s.setActive = function (v) { this.active = v; return this; };
  s.destroy = function () { this.destroyed = true; this.visible = false; };
  return s;
}
function fixture(difficulty = 'medium') {
  const sc = { t: 0, totalKills: 0, totalDamage: 0, pendingLevels: 0, tmpA: [], tmpB: [], tmpC: [], tmpE: [],
    difficulty: api.resolveDifficulty(difficulty), spawningEnabled: false, grid: new api.Grid(100),
    world: { constrain() {}, outside: () => false },
    add: { image: display, sprite: display }, cameras: { main: { shake() {}, worldView: { y: -240 } } },
    fx: Object.fromEntries(['number', 'burst', 'corpse', 'ring', 'sweep', 'bolt'].map(k => [k, () => {}])),
    dmgScale: () => 1, queueLevelUp() { this.pendingLevels++; }, onPlayerDeath() { this.ended = true; },
  };
  sc.player = new api.Player(sc, api.CHARACTERS.channeler, 0, 0);
  sc.enemies = new api.EnemyManager(sc); sc.gems = new api.Gems(sc); sc.pShots = new api.PlayerShots(sc); sc.enemyShots = new api.EnemyShots(sc);
  sc.queryEnemies = api.GameScene.prototype.queryEnemies;
  sc.damageEnemy = api.GameScene.prototype.damageEnemy;
  return sc;
}
const failures = [];
function check(name, fn) { try { fn(); console.log('PASS', name); } catch (err) { failures.push(name); console.error('FAIL', name, err.message); } }

check('an enemy killed by a player power cannot deal contact damage from the stale frame grid', () => {
  const sc = fixture(), e = sc.enemies.spawn('skel_warrior', 0, 0, 1);
  sc.grid.insert(e);
  const power = sc.player.addPower('slash');
  power.impl.hit(power);
  assert.equal(e.alive, false, 'the real slash must kill the skeleton before contact resolution');
  sc.enemies.update(.05);
  assert.equal(sc.player.hp, 110, 'a killed enemy still damages the player');
});

check('a distant magnetized gem reaches the player and grants XP at the maximum game frame step', () => {
  const sc = fixture();
  sc.gems.drop(1015, 0, 1);
  const gem = sc.gems.items.find(g => g.live);
  gem.setPosition(1015, 0); // Remove only random drop jitter from this geometry fixture.
  sc.gems.magnetAll();
  for (let frame = 0; frame < 100; frame++) sc.gems.update(.05);
  assert.equal(sc.player.xp, 1, 'the gem oscillates across the pickup radius without granting XP');
  assert.equal(gem.live, false);
});

check('castle boss waves apply the projectile difficulty multiplier exactly once', () => {
  for (const [difficulty, speed, damage] of [['medium', 330, 22], ['hardcore', 412.5, 39.6]]) {
    const sc = fixture(difficulty), boss = new api.Boss(sc, 2000, 2000);
    boss.fireWave();
    const shots = sc.enemyShots.items.filter(s => s.live);
    assert.equal(shots.length, 3);
    for (const shot of shots) {
      assert.ok(Math.abs(Math.hypot(shot.vx, shot.vy) - speed) < 1e-8, difficulty + ' wave speed ignores projectile difficulty');
      assert.ok(Math.abs(shot.dmg - damage) < 1e-8, difficulty + ' boss damage is multiplied incorrectly');
    }
  }
});

if (failures.length) process.exitCode = 1;
