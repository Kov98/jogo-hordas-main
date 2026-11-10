const assert = require('node:assert/strict');
if (process.argv.includes('--unit')) {
 const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
 const game = { cinematic: 'forest-defeat', gameReady: true, ended: false, player: {}, scene: { isActive: () => true, isPaused: () => false } };
 const context = { location: { hostname: '127.0.0.1', port: '8765', origin: 'http://127.0.0.1:8765' }, localStorage: { getItem: () => null },
  document: { body: null, addEventListener() {}, createElement() { throw Error('Blocked dialog reached the DOM'); } },
  GAME: { scene: { getScene: () => game, isActive: key => key === 'Game', isPaused: () => false } } };
 context.window = context;
 vm.createContext(context);
 for (const file of ['portal.js', 'guide.js', 'admin.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context, { filename: file });
 context.GamePortal.user = { id: 1, role: 'admin', username: 'isolated-fixture' };
 for (const state of ['forest-defeat', 'forest-roots', 'forest-gate', 'forest-return', 'castle-entry', 'castle-arrival']) {
  game.cinematic = state;
  assert.equal(context.GamePortal.openDialog('fixture'), null, state);
  assert.doesNotThrow(() => context.PowerGuide.open(), state);
  assert.doesNotThrow(() => context.GameAdmin.open(), state);
  assert.equal(context.GamePortal.dialogOpen, false, state);
 }
 game.cinematic = null; game.finale = {};
 assert.equal(context.GamePortal.openDialog('finale fixture'), null);
 console.log('OK: direct dialogs, guide and admin blocked in all cinema states and CastleFinale');

 // Phaser starts queued scenes as visible. The HUD must inspect the current
 // game state when its create() finally runs, after castle-arrival has begun.
 const object = () => {
  const item = {};
  for (const method of ['setDepth', 'setAlpha', 'setOrigin', 'setScale', 'setVisible']) item[method] = () => item;
  return item;
 };
 const hudContext = {
  Phaser: { Scene: class {} }, CONFIG: { width: 1280, height: 720 },
  mkText: () => object(), mkButton: () => ({ objs: [object()] })
 };
 vm.createContext(hudContext);
 vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/ui.js'), 'utf8') + '\nthis.TestUIScene = UIScene;', hudContext, { filename: 'ui.js' });
 for (const state of ['forest-defeat', 'forest-roots', 'forest-gate', 'forest-return', 'castle-entry', 'castle-arrival', null]) {
  const ui = new hudContext.TestUIScene();
  ui.init({ game: { cinematic: state } });
  let visible = true; // SceneManager's startup default, including a queued launch.
  ui.scene = { setVisible(value) { visible = value; } };
  ui.add = { image: object, rectangle: object, graphics: object };
  ui.sys = { game: { device: { input: { touch: false } } } };
  ui.input = { keyboard: { on() {} } };
  ui.game = { events: { on() {}, off() {} } };
  ui.events = { once() {} };
  ui.create();
  assert.equal(visible, !state, `HUD launched during ${state || 'gameplay'} must adopt the current cinematic visibility`);
  assert.equal(ui.ready, true);
 }
 console.log('OK: delayed HUD launch stays hidden in all cinema states and visible during normal gameplay');
 process.exit(0);
}
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.MURALHA_TEST_URL;
if (!base && !process.argv.includes('--clock')) throw Error('Execute browser_accounts.py --forest-cinema');
async function checkTweenClock(page) {
 const path = require('node:path');
 await page.addScriptTag({ path: path.join(__dirname, '../js/phaser.min.js') });
 await page.addScriptTag({ path: path.join(__dirname, '../js/game.js') });
 return page.evaluate(async () => {
  const check = (ok, message) => { if (!ok) throw Error(message); };
  const realNow = Date.now;
  let now = realNow();
  Date.now = () => now;
  window.GamePortal = { ready: new Promise(() => {}) };
  try {
   for (const [maxLag, lagSkip] of [[500, 33], [275, 11]]) {
    const g = new GameScene(), events = new Phaser.Events.EventEmitter();
    g.events = events;
    g.create(); // Register the real shutdown handler; portal readiness stays pending.
    g.scene = { isActive: () => true, get: () => ({ scene: { setVisible() {} }, caption: { setText() {} } }), stop() {} };
    g.input = { keyboard: { resetKeys() {} } };
    g.player = { sprite: { anims: { pause() {} }, setAlpha() { return this; }, clearTint() {} } };
    const manager = new Phaser.Tweens.TweenManager({ sys: { events } });
    g.tweens = manager;
    manager.start(); manager.setLagSmooth(maxLag, lagSkip);
    g.setCinematic('forest-defeat', 'fixture');
    let result;
    g.cinematicDelay(2700).then(value => { result = value; });
    now += 1; manager.tick();
    const before = manager.time;
    now += 1000; manager.tick();
    check(manager.time - before >= .999, 'Cinematic TweenManager discards a real 1000 ms frame');
    for (let i = 0; i < 3; i++) { now += 1000; manager.tick(); await Promise.resolve(); }
    check(result === true, '2700 ms cinematic wait did not finish within four 1 FPS frames');
    g.setCinematic('forest-gate', 'fixture');
    g.setCinematic(null);
    check(manager.maxLag === maxLag && manager.lagSkip === lagSkip, 'Normal completion did not restore the original lag policy');
    g.setCinematic('castle-entry', 'fixture');
    const interrupted = g.cinematicDelay(10000);
    events.emit('shutdown');
    check(await interrupted === false, 'Shutdown did not settle the cinematic wait');
    check(manager.maxLag === maxLag && manager.lagSkip === lagSkip, 'Shutdown did not restore the original lag policy');
   }
   return 'OK: real Phaser TweenManager advances at 1 FPS and restores default/custom lag policies on completion and shutdown';
  } finally { Date.now = realNow; }
 });
}
(async () => {
 const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',args:['--no-sandbox','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page = await browser.newPage({viewport:{width:1280,height:720}}), errors=[];
 page.on('pageerror', e=>{errors.push(e.message);console.error('PAGE ERROR:',e.message);});
 const ready = stage => page.waitForFunction(s=>window.GAME?.scene.getScene('Game')?.gameReady && GAME.scene.getScene('Game').stageId===s,stage,{timeout:60000});
 const restart = async () => {await page.evaluate(()=>{const g=GAME.scene.getScene('Game');window.previousCinemaInitialization=g.initialization;g.scene.restart({char:'mage',stage:'forest'});});await page.waitForFunction(()=>GAME.scene.getScene('Game').initialization!==window.previousCinemaInitialization);await ready('forest');};
 const kill = () => page.evaluate(()=>{const g=GAME.scene.getScene('Game');g.startBossFight();g.boss.invuln=false;g.damageEnemy(g.boss,g.boss.maxHp);return {cinematic:g.cinematic,cleared:g.stageCleared,t:g.t,points:g.points};});
 try {
  console.log(await checkTweenClock(page));
  if (process.argv.includes('--clock')) return;
  await page.goto(base+'/?char=mage&god&nointro');await ready('forest');
  const fatal=await kill(); assert.ok(fatal.cinematic,'fatal hit must synchronously lock cinema');assert.equal(fatal.cleared,false);
  assert.ok(await page.evaluate(()=>{const g=GAME.scene.getScene('Game'),p=g.player,hp=p.hp,xp=p.xp,t=g.t,visual=g.visualTime;g.godMode=false;p.invuln=0;p.takeDamage(10000);p.gainXp(100000);g.update(0,1000);g.openLevelUp();return p.hp===hp&&p.xp===xp&&!p.dead&&!g.levelUpOpen&&g.t===t&&g.visualTime>=visual+1;}),'cinema blocks direct damage/XP and animates environment with uncapped frame delta');
  assert.equal(await page.evaluate(()=>{const d=GamePortal.openDialog('cinema fixture');const opened=GamePortal.dialogOpen;d?.close();return opened;}),false,'dialog API must reject cinema');
  await page.keyboard.press('Escape');await page.keyboard.press('g');await page.keyboard.press('F2');await page.keyboard.press('Space');
  await page.waitForTimeout(600);
  assert.deepEqual(await page.evaluate(()=>{const g=GAME.scene.getScene('Game');return {t:g.t,points:g.points,paused:GAME.scene.isPaused('Game'),dialog:GamePortal.dialogOpen,dash:g.requestDash};}),{t:fatal.t,points:fatal.points,paused:false,dialog:false,dash:false});
  await page.waitForFunction(()=>GAME.scene.getScene('Game').stageCleared,null,{timeout:12000});
  assert.ok(await page.evaluate(()=>{const g=GAME.scene.getScene('Game');return !g.cinematic && g.world.gateOpen && !g.ended && GAME.scene.isVisible('UI');}));
  console.log('OK: fatal freeze, shortcut blocking, gate cinema and restored controls');
  await page.evaluate(()=>{const g=GAME.scene.getScene('Game');g.player.x=2000;g.player.y=580;g.runStart=Promise.resolve({run_id:'cinema-fixture',ranked:false});window.advances=0;GamePortal.advanceRun=async()=>{window.advances++;throw Error('offline fixture');};window.crossing=g.enterCastle();g.enterCastle();});
  await page.waitForTimeout(300);
  assert.ok(await page.evaluate(()=>{const g=GAME.scene.getScene('Game');return g.stageId==='forest' && g.cinematic && g.player.y<580 && g.player.y>400;}),'entry must walk in the forest before restart');
  await page.waitForFunction(()=>{const g=GAME.scene.getScene('Game');return g.stageId==='castle' && g.cinematic==='castle-arrival' && GAME.scene.getScene('UI').ready;});
  assert.equal(await page.evaluate(()=>GAME.scene.isVisible('UI')),false,'HUD must stay hidden after its queued launch during castle arrival');
  await ready('castle');
  assert.deepEqual(await page.evaluate(()=>{const g=GAME.scene.getScene('Game');return {advance:window.advances,cinematic:g.cinematic,practice:g.isPractice,run:g.carry.run.run_id,error:!!g.saveError,t:g.t<.2};}),{advance:1,cinematic:null,practice:true,run:'cinema-fixture',error:true,t:true});
  console.log('OK: physical entry, once-only advance, offline carry and smooth arrival');
  await restart();await kill();await page.waitForTimeout(400);await restart();await page.waitForTimeout(8000);
  assert.ok(await page.evaluate(()=>{const g=GAME.scene.getScene('Game');return g.stageId==='forest' && !g.cinematic && !g.stageCleared && !g.world.gateOpen && !GAME.scene.isActive('FinaleOverlay');}),'old victory cannot mutate restarted scene');
  console.log('OK: shutdown cancels victory and overlay');
  await page.evaluate(()=>{const g=GAME.scene.getScene('Game');g.stageCleared=true;g.world.openCastleGate();g.player.x=2000;g.player.y=580;g.runStart=Promise.resolve({run_id:'late-fixture',ranked:false});window.advancePending=false;GamePortal.advanceRun=()=>new Promise(resolve=>{window.advancePending=true;window.releaseAdvance=resolve;});window.lateCrossing=g.enterCastle();});
  await page.waitForFunction(()=>window.advancePending);
  await restart();
  await page.evaluate(()=>{window.releaseAdvance({});});
  assert.equal(await page.evaluate(()=>window.lateCrossing),false,'late advance must settle without restarting current run');
  assert.ok(await page.evaluate(()=>{const g=GAME.scene.getScene('Game');return g.gameReady&&g.stageId==='forest'&&!g.cinematic&&!g.stageCleared;}));
  console.log('OK: delayed server response cannot restart a newer run');
  assert.deepEqual(errors,[]);console.log('Forest cinema checks passed');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

