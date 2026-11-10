// Execute the real GameScene controls with rendering and scene boundaries stubbed.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { EventEmitter } = require('node:events');
const failures = [];
function test(name, fn) {
  try { fn(); console.log('OK: ' + name); }
  catch (error) { failures.push(name); console.error('FAIL: ' + name + ': ' + error.message); }
}
function visual() {
  const data = { anims: { pause() {}, resume() {} } };
  const object = new Proxy(data, { get(target, key) { return key in target ? target[key] : () => object; } });
  return object;
}
function fixture() {
  const window = new EventEmitter();
  window.addEventListener = window.on.bind(window); window.removeEventListener = window.off.bind(window);
  const ctx = vm.createContext({ console, URLSearchParams, window, location: { search: '' },
    Phaser: { Scene: class {}, Input: { Keyboard: { JustDown(key) { const down = !!key._justDown; key._justDown = false; return down; } } } },
    CONFIG: { player: { start: { x: 2000, y: 3000 } }, spawn: {}, world: { w: 4000, h: 4000 } },
    CHARACTERS: { hero: { startPower: 'axe' } }, GamePortal: { dialogOpen: false }, capturePlayerState: () => ({}),
  });
  for (const name of ['ForestWorld', 'Grid', 'FX', 'PlayerShots', 'EnemyShots', 'Gems', 'EnemyManager', 'ProgressionSystem', 'EncounterDirector', 'Soundscape']) ctx[name] = class {};
  ctx.Player = class { constructor() { this.sprite = visual(); this.shadow = visual(); } addPower() {} };
  ctx.ExplorationSystem = class { capture() { return {}; } };
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8') + '\nthis.GameClass=GameScene;', ctx);
  const game = new ctx.GameClass(), keyboard = new EventEmitter(), events = new EventEmitter(), gameEvents = new EventEmitter();
  const keys = Object.fromEntries('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,SPACE,E,ENTER'.split(',').map(name => [name, {
    isDown: false, _justDown: false, reset() { this.isDown = false; this._justDown = false; },
  }]));
  keyboard.addKeys = () => keys; keyboard.resetKeys = () => Object.values(keys).forEach(key => key.reset());
  const ui = { paused: false, lvlActive: false, scene: { setVisible() {} } };
  let active = true;
  Object.assign(game, { charId: 'hero', stageId: 'forest', stage: { number: 1 }, events,
    input: { keyboard, on() {} }, game: { events: gameEvents, scene: { stop() {} } },
    scene: { get: () => ui, launch() {}, isActive: () => active,
      pause() { active = false; events.emit('pause'); }, resume() { active = true; events.emit('resume'); } },
    add: { particles: visual, graphics: visual }, time: { delayedCall() {} }, cameras: { main: visual() },
  });
  const build = () => { game.buildScene({}); game.gameReady = true; };
  build();
  return { game, keyboard, events, gameEvents, keys, ui, ctx, window, build };
}

const actions = [
  { name: 'interaction', keys: ['E', 'ENTER'], pending: 'requestInteract', result: 'interact' },
  { name: 'dash', keys: ['SHIFT', 'SPACE'], pending: 'requestDash', result: 'dash' },
];
for (const action of actions) {
test('a quick released ' + action.name + ' tap survives until update and consumes both keys exactly once', () => {
  for (const name of action.keys) {
    const f = fixture(); f.keyboard.emit('keydown-' + name, { repeat: false });
    f.keys[name].reset(); // Phaser keyup removes its own JustDown flag.
    assert.equal(f.game.readInput()[action.result], true);
    assert.equal(f.game.readInput()[action.result], false);
    f.game[action.pending] = true;
    for (const key of action.keys) f.keys[key]._justDown = true;
    assert.equal(f.game.readInput()[action.result], true);
    assert.equal(f.game.readInput()[action.result], false);
    f.game[action.pending] = true; // The touch button uses the same pending dash flag.
    assert.equal(f.game.readInput()[action.result], true);
    assert.equal(f.game.readInput()[action.result], false);
  }
});

test('queued ' + action.name + ' is discarded across pause, sleep and both blur boundaries', () => {
  for (const boundary of ['pause', 'sleep', 'gameBlur', 'windowBlur']) {
    const f = fixture(); f.keyboard.emit('keydown-' + action.keys[0], { repeat: false });
    for (const key of action.keys) f.keys[key]._justDown = true;
    if (boundary === 'gameBlur') f.gameEvents.emit('blur');
    else if (boundary === 'windowBlur') f.window.emit('blur');
    else { f.events.emit(boundary); f.events.emit(boundary === 'pause' ? 'resume' : 'wake'); }
    assert.equal(f.game.readInput()[action.result], false, boundary + ' must not replay ' + action.name + ' after its menu closes');
  }
});

test('autorepeat after a paused Key reset cannot become a new ' + action.name, () => {
  const [first, second] = action.keys, f = fixture();
  f.keyboard.emit('keydown-' + first, { repeat: false }); f.game.scene.pause(); f.game.scene.resume();
  // On the first repeated DOM keydown after Key.reset, Phaser marks JustDown
  // before emitting keydown because the Key no longer considers itself held.
  f.keys[first]._justDown = true; f.keyboard.emit('keydown-' + first, { repeat: true });
  assert.equal(f.game.readInput()[action.result], false, 'holding ' + first + ' through pause must wait for a fresh press');
  f.keyboard.emit('keydown-' + second, { repeat: false }); f.keys[second]._justDown = true;
  f.keys[first]._justDown = true; f.keyboard.emit('keydown-' + first, { repeat: true });
  assert.equal(f.game.readInput()[action.result], true, 'an unrelated repeat must preserve an already queued genuine tap');
  assert.equal(f.game.readInput()[action.result], false);
});

test('blocked controls, cinematic resets and a new stage cannot queue ' + action.name, () => {
  const f = fixture();
  const blocks = [
    [f.game, 'cinematic', 'arrival'], [f.game, 'explorationOpen', true], [f.game, 'ended', true],
    [f.game, 'transitioning', true], [f.game, 'levelUpOpen', true], [f.game, 'chestOpen', true],
    [f.ui, 'paused', true], [f.ui, 'lvlActive', true], [f.ctx.GamePortal, 'dialogOpen', true], [f.game, 'gameReady', false],
  ];
  for (const [object, key, value] of blocks) {
    const previous = object[key]; object[key] = value; f.keyboard.emit('keydown-' + action.keys[0], { repeat: false }); object[key] = previous;
    assert.equal(f.game.readInput()[action.result], false, key + ' blocks queueing');
  }
  f.keyboard.emit('keydown-' + action.keys[0], { repeat: true }); assert.equal(f.game.readInput()[action.result], false);
  f.game.scene.pause(); f.keyboard.emit('keydown-' + action.keys[0], { repeat: false }); f.game.scene.resume();
  assert.equal(f.game.readInput()[action.result], false, 'inactive scene blocks queueing');
  f.keyboard.emit('keydown-' + action.keys[0], { repeat: false }); f.keys[action.keys[0]]._justDown = true; f.game.clearCinematicInput();
  assert.equal(f.game.readInput()[action.result], false, 'cinematic reset discards pending keys and latch');
  f.keyboard.emit('keydown-' + action.keys[0], { repeat: false }); f.events.emit('shutdown'); f.build();
  assert.equal(f.game.readInput()[action.result], false, 'new stage starts without pending input');
});

test('shutdown detaches ' + action.name + ' listeners before the next scene build', () => {
  const f = fixture(); f.events.emit('shutdown');
  f.keyboard.emit('keydown-' + action.keys[0], { repeat: false }); assert.equal(f.game[action.pending], false);
  f.game[action.pending] = true;
  f.events.emit('pause'); f.events.emit('sleep'); f.gameEvents.emit('blur'); f.window.emit('blur');
  assert.equal(f.game[action.pending], true, 'dead scene no longer receives lifecycle callbacks');
  f.build();
  for (const name of action.keys) assert.equal(f.keyboard.listenerCount('keydown-' + name), 1);
  assert.equal(f.gameEvents.listenerCount('blur'), 1); assert.equal(f.window.listenerCount('blur'), 1);
  f.keyboard.emit('keydown-' + action.keys[0], { repeat: false }); assert.equal(f.game.readInput()[action.result], true);
  assert.equal(f.game.readInput()[action.result], false);
});
}

if (failures.length) process.exitCode = 1;
