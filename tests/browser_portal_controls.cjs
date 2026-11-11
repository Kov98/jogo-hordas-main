// Regressão: abrir as janelas por clique real não pode deixar o teclado preso na barra.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const base = process.env.MURALHA_TEST_URL;
if (!base) throw new Error('Execute browser_accounts.py --controls.');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true,
    args: ['--no-sandbox', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, hasTouch: true });
  page.setDefaultTimeout(10000);
  const errors = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  const check = name => { checks.push(name); console.log('OK: ' + name); };
  async function open(label) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.getByRole('dialog').waitFor();
  }
  async function closeX() {
    await page.getByRole('dialog').last().getByRole('button', { name: 'Fechar diálogo', exact: true }).click();
  }
  async function moves(key = 'd', code = 'D') {
    await page.waitForFunction(() => GAME.scene.isActive('Game'));
    const before = await page.evaluate(() => { const p = GAME.scene.getScene('Game').player; return { x: p.x, y: p.y }; });
    await page.keyboard.down(key);
    try {
      await page.waitForFunction(name => GAME.scene.getScene('Game').keys[name].isDown, code, { timeout: 2500 });
      await page.waitForFunction(pos => { const p = GAME.scene.getScene('Game').player; return Math.hypot(p.x - pos.x, p.y - pos.y) > 1; }, before, { timeout: 2500 });
    } finally { await page.keyboard.up(key); }
    await page.waitForFunction(name => !GAME.scene.getScene('Game').keys[name].isDown, code);
  }
  try {
    await page.goto(base + '/?char=mage&god&nointro');
    await page.waitForFunction(() => window.GAME?.scene.getScene('Game')?.gameReady && GAME.scene.isActive('Game'));
    await page.evaluate(() => { GAME.scene.getScene('Game').spawningEnabled = false; });
    await moves();
    await open('Ranking'); await closeX(); await moves();
    check('ranking por clique → fechar no X → WASD volta a mover');
    await open('Entrar / Criar conta');
    const position = await page.evaluate(() => { const p = GAME.scene.getScene('Game').player; return { x: p.x, y: p.y }; });
    await page.getByLabel('Nome de usuário', { exact: true }).fill('wasdTeste');
    assert(await page.evaluate(pos => { const p = GAME.scene.getScene('Game').player; return p.x === pos.x && p.y === pos.y && GAME.scene.isPaused('Game'); }, position), 'Digitar na conta moveu o personagem');
    await closeX(); await moves('ArrowUp', 'UP');
    check('conta bloqueia movimento enquanto digita e devolve as setas ao fechar');
    await open('Ranking');
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).click();
    await moves('w', 'W');
    await open('Ranking'); await page.keyboard.press('Escape'); await moves('ArrowRight', 'RIGHT');
    await open('Ranking'); await page.locator('.portal-overlay').click({ position: { x: 5, y: 5 } }); await moves();
    check('fechar por botão, Escape e fundo libera os controles');
    await page.keyboard.down('d');
    await page.waitForFunction(() => GAME.scene.getScene('Game').keys.D.isDown);
    await open('Ranking'); await page.keyboard.up('d'); await closeX();
    assert(await page.evaluate(() => !GAME.scene.getScene('Game').keys.D.isDown), 'Tecla ficou pressionada depois do diálogo');
    await moves();
    check('tecla segurada ao abrir a janela não fica presa');
    await page.keyboard.press('p');
    await page.waitForFunction(() => GAME.scene.getScene('UI').paused && GAME.scene.isPaused('Game'));
    await open('Ranking'); await closeX();
    assert(await page.evaluate(() => GAME.scene.getScene('UI').paused && GAME.scene.isPaused('Game')), 'Ranking retirou uma pausa manual');
    await page.keyboard.press('p'); await moves();
    check('pausa manual é preservada e P continua funcionando');
    await page.evaluate(() => { const g = GAME.scene.getScene('Game'); g.pendingLevels = 1; g.openLevelUp(); });
    await page.waitForFunction(() => GAME.scene.getScene('UI').lvlActive);
    await open('Ranking'); await closeX();
    assert(await page.evaluate(() => GAME.scene.getScene('UI').lvlActive && GAME.scene.isPaused('Game')), 'Ranking interrompeu a escolha de melhoria');
    await page.waitForFunction(() => { const ui = GAME.scene.getScene('UI'); return ui.time.now - ui.lvlOpenAt >= 350; });
    await page.keyboard.press('1'); await moves();
    check('escolha de melhoria continua pausada e aceita o teclado após fechar ranking');
    await open('Entrar / Criar conta');
    await page.evaluate(() => { GamePortal.openLeaderboard(); });
    await closeX();
    assert(await page.evaluate(() => GAME.scene.isPaused('Game')), 'Diálogo interno liberou a partida com outra janela aberta');
    await closeX(); await moves();
    check('janelas sobrepostas só liberam o jogo ao fechar a última');
    for (let i = 0; i < 4; i++) { await open(i % 2 ? 'Ranking' : 'Entrar / Criar conta'); await closeX(); await moves(); }
    check('aberturas repetidas não deixam o teclado bloqueado');
    const cdp = await page.context().newCDPSession(page);
    const finger = { id: 1, x: 200, y: 550 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger] });
    finger.x = 260;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [finger] });
    await page.waitForFunction(() => GAME.scene.getScene('Game').joy.x > .5);
    // Keep the physical touch held across a real dialog pause. A missed touchEnd
    // must not turn the previous direction into movement after the dialog closes.
    await page.evaluate(() => GamePortal.openLeaderboard());
    await page.getByRole('dialog').waitFor();
    assert(await page.evaluate(() => { const g = GAME.scene.getScene('Game'); return GAME.scene.isPaused('Game') && !g.joy.active && g.joy.x === 0 && g.joy.y === 0; }), 'Pausa não soltou o joystick móvel');
    await closeX();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [finger] });
    assert(await page.evaluate(() => { const g = GAME.scene.getScene('Game'); return !g.joy.active && g.readInput().x === 0 && g.readInput().y === 0; }), 'Toque antigo voltou a mover após fechar a janela');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    await moves();
    check('toque real mantido durante pausa não prende o joystick ao retomar');
    assert(!errors.length, errors.join('; '));
    console.log(JSON.stringify({ ok: true, checks: checks.length, pageErrors: errors.length }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
