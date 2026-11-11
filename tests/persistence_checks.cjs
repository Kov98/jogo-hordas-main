const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');

const context = vm.createContext({ console, URLSearchParams, location: { search: '' },
  Phaser: { Scene: class {} }, CHARACTERS: { vanguard: {} },
  resolveStage: id => ({ id: id || 'forest' }), resolveDifficulty: id => ({ id: id || 'medium' }) });
context.GamePortal = { user: { id: 2 }, ready: Promise.resolve(), canPlayStage: () => true };
context.MetaProgress = { profileKey: () => context.GamePortal.user ? 'user.' + context.GamePortal.user.id : 'guest' };
for (const file of ['scenes', 'game']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/' + file + '.js'), 'utf8'), context);
}
const checkpoint = profile => ({ metaProfileKey: profile,
  player: { level: 12, powers: [{ id: 'fire_hurricane', level: 1 }], relics: ['glass_heart'],
    loadout: { skin: 'oathbound', startPower: 'axes' } } });

function replay(origin, current) {
  context.GamePortal.user = current === 'guest' ? null : { id: Number(current.slice(5)) };
  const end = vm.runInContext('new EndScene()', context), saved = checkpoint(origin);
  let restarted;
  Object.assign(end, { d: { win: false, stage: 'forest', char: 'vanguard', checkpoint: saved },
    game: { scene: { stop() {} } }, scene: { start(key, data) { restarted = data; } } });
  end.again();
  return { forwarded: restarted.checkpoint, saved };
}

async function creation(origin, startingProfile, actualProfile) {
  const saved = checkpoint(origin);
  context.GamePortal.user = startingProfile === 'guest' ? null : { id: Number(startingProfile.slice(5)) };
  context.GamePortal.beginRun = async () => {
    context.GamePortal.user = actualProfile === 'guest' ? null : { id: Number(actualProfile.slice(5)) };
    return { run_id: actualProfile === 'guest' ? null : 'fixture', ranked: true, profile_key: actualProfile };
  };
  const game = vm.runInContext('new GameScene()', context);
  Object.assign(game, { charId: 'vanguard', stageId: 'forest', difficultyId: 'medium', checkpoint: saved,
    events: { once() {} }, buildScene() { this.restored = this.checkpoint; } });
  await game.create();
  return { restored: game.restored, saved, profile: game.metaProfileKey };
}

(async () => {
  for (const [origin, current] of [['guest', 'user.2'], ['user.2', 'guest'], ['user.1', 'user.2']]) {
    assert.equal(replay(origin, current).forwarded, null, `${origin} checkpoint must not enter ${current}'s replay`);
  }
  const same = replay('user.2', 'user.2');
  assert.equal(same.forwarded, same.saved, 'same-account retry keeps its phase loadout');
  console.log('OK: replay isolates guest/account checkpoints and preserves same-profile retries');

  for (const [origin, starting, actual] of [['guest', 'guest', 'user.2'], ['user.1', 'user.1', 'user.2'],
    ['user.2', 'user.2', 'guest'], [undefined, 'user.2', 'user.2']]) {
    const result = await creation(origin, starting, actual);
    assert.equal(result.profile, actual);
    assert.equal(result.restored, null, 'run identity after session refresh must own its checkpoint');
  }
  for (const profile of ['guest', 'user.2']) {
    const result = await creation(profile, profile, profile);
    assert.equal(result.restored, result.saved, 'same-profile checkpoint must still restore');
  }
  console.log('OK: creation rechecks checkpoint ownership after asynchronous session refresh');
})().catch(error => { console.error(error); process.exitCode = 1; });
