const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');

const context = vm.createContext({ console });
context.window = context;
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/admin.js'), 'utf8'), context);
const scene = () => ({ initialization: Symbol('run'), player: { hp: 10, maxHp: 100,
  heal(amount) { this.hp = Math.min(this.maxHp, this.hp + amount); } } });

async function commandDuring(change) {
  let complete;
  const original = scene();
  let current = original;
  context.GamePortal = { isAdmin: true, user: { id: 1 }, csrf: 'session-one',
    request: () => new Promise(resolve => { complete = resolve; }) };
  context.GAME = { scene: { getScene: () => current, isActive: () => true } };
  const pending = context.GameAdmin.execute('heal');
  const error = pending.then(() => null, reason => reason);
  current = change(original, context.GamePortal) || original;
  complete({ command: 'heal', args: {} });
  return { error: await error, original, current };
}

(async () => {
  const restarted = await commandDuring(game => {
    game.initialization = Symbol('replacement');
    game.player = scene().player;
  });
  assert(restarted.error, 'command authorized for an old initialization must reject after scene restart');
  assert.equal(restarted.current.player.hp, 10, 'late heal must not mutate the replacement player');
  const replaced = await commandDuring(() => scene());
  assert(replaced.error, 'late command must reject if the Game scene object changed');
  assert.equal(replaced.current.player.hp, 10);
  console.log('OK: late administrator response cannot mutate a restarted/replaced game');

  const sessionChanged = await commandDuring((game, portal) => { portal.csrf = 'session-two'; });
  assert(sessionChanged.error, 're-authentication must invalidate a command authorized in the prior session');
  assert.equal(sessionChanged.current.player.hp, 10);
  const current = await commandDuring(() => {});
  assert.equal(current.error, null);
  assert.equal(current.current.player.hp, 100, 'current-session command still heals its originating player');
  console.log('OK: administrator commands remain bound to the originating session and player');
})().catch(error => { console.error(error); process.exitCode = 1; });
