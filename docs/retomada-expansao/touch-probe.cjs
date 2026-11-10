// Integração Phaser real, com API e banco descartáveis pelo runner Python.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const base = process.env.MURALHA_TEST_URL;
if (!base) throw new Error('Execute browser_accounts.py --expansion.');
const artifacts = process.env.MURALHA_TEST_ARTIFACTS || '/tmp/muralha-expansao';
fs.mkdirSync(artifacts, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true,
    args: ['--no-sandbox', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.setDefaultTimeout(20000);
  const errors = [], checks = [];
  page.on('pageerror', e => errors.push(e.message));
  const check = name => { checks.push(name); console.log('OK: ' + name); };
  async function ready() {
    await page.waitForFunction(() => window.GAME?.scene.getScene('Game')?.gameReady && GAME.scene.isActive('Game'));
  }
  async function fresh(difficulty = 'medium') {
    await page.evaluate(d => {
      GAME.scene.stop('UI'); GAME.scene.stop('Game');
      GAME.scene.start('Game', { char: 'mage', difficulty: d });
    }, difficulty);
    await ready();
    await page.evaluate(() => { const g = GAME.scene.getScene('Game'); g.godMode = true; g.spawningEnabled = false; Sfx.muted = true; });
  }
  try {
    const touchContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true });
    const touchPage = await touchContext.newPage(); touchPage.setDefaultTimeout(5000); touchPage.on('pageerror', e => errors.push(e.message));
    await touchPage.goto(base + '/?char=ranger&god&nointro');
    await touchPage.waitForFunction(() => window.GAME?.scene.getScene('Game')?.gameReady && GAME.scene.isActive('Game'));
    await touchPage.evaluate(() => { GAME.scene.getScene('Game').spawningEnabled = false; });
    const cdp = await touchContext.newCDPSession(touchPage);
    const finger = { id: 1, x: 200, y: 550 };
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[finger] });
    await touchPage.waitForFunction(() => GAME.scene.getScene('Game').joy.active);
    finger.x=250;
    await cdp.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[finger] });
    await touchPage.waitForFunction(() => GAME.scene.getScene('Game').joy.active && GAME.scene.getScene('Game').joy.x > .5).catch(async e=>{ console.log('TOUCH STATE',await touchPage.evaluate(()=>({joy:GAME.scene.getScene('Game').joy,pointers:GAME.input.pointers.map(p=>({id:p.id,x:p.x,y:p.y,down:p.isDown})),dialogs:document.querySelectorAll('[role=dialog]').length}))); throw e; });
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[finger,{id:2,x:1204,y:550}] });
    await touchPage.waitForFunction(() => GAME.scene.getScene('Game').player.dashCd > .1).catch(async e=>{ console.log('DASH STATE',await touchPage.evaluate(()=>({joy:GAME.scene.getScene('Game').joy,pointers:GAME.input.pointers.map(p=>({id:p.id,x:p.x,y:p.y,down:p.isDown})),button:!!GAME.scene.getScene('UI').dashButton,touch:GAME.device.input.touch}))); await touchPage.screenshot({path:artifacts+'/touch-failure.png'}); throw e; });
    assert(await touchPage.evaluate(() => GAME.scene.getScene('Game').joy.active), 'Dash cancelled held joystick');
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[finger] });
    assert(await touchPage.evaluate(() => GAME.scene.getScene('Game').joy.active && GAME.scene.getScene('Game').joy.x > .5), 'Dash release cancelled joystick');
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    await touchPage.waitForFunction(() => !GAME.scene.getScene('Game').joy.active);
    await touchContext.close();
    check('dois dedos simultâneos: joystick move, DASH dispara e soltar DASH preserva joystick');

} finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});