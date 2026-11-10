// Focused browser contracts: real Phaser scenes and portal, isolated HTTP profiles.
// The runner supplies a disposable server through MURALHA_TEST_URL.
const assert = require('node:assert/strict');

module.exports = async function selectorChecks(page) {
  const checks = [];
  const checked = (message) => { checks.push(message); console.log('OK: ' + message); };
  const base = process.env.MURALHA_TEST_URL || new URL(page.url()).origin;
  const settings = { healthDropChance: 0.05, bossTime: 900, spawnBaseRate: 1.1, spawnGrowth: 0.0115, maxEnemies: 240 };
  const blankProgress = { castle_unlocked: false, forest_clears: 0, castle_clears: 0, catacombs_unlocked: false, catacombs_clears: 0 };
  const forestProgress = { ...blankProgress, castle_unlocked: true, forest_clears: 1 };
  const castleProgress = { ...forestProgress, castle_clears: 1, catacombs_unlocked: true };
  const finalProgress = { ...castleProgress, catacombs_clears: 1 };
  const blankStats = { runs: 0, victories: 0, kills: 0, damage: 0, points: 0, best_points: 0 };
  const profiles = {
    SelectorA: { user: { id: 901, username: 'SelectorA', role: 'player' }, csrf: 'selector-csrf-a', settings,
      progress: { ...blankProgress }, stats: { ...blankStats } },
    SelectorB: { user: { id: 902, username: 'SelectorB', role: 'player' }, csrf: 'selector-csrf-b', settings,
      progress: { ...blankProgress }, stats: { ...blankStats } },
  };
  let current = { user: null, csrf: null, settings, progress: { ...blankProgress }, stats: { ...blankStats } };
  const respond = (route, data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
  await page.route('**/api/session', route => respond(route, current));
  await page.route('**/api/login', route => { current = profiles[route.request().postDataJSON().username]; return respond(route, current); });
  await page.route('**/api/logout', route => {
    current = { user: null, csrf: null, settings, progress: { ...blankProgress }, stats: { ...blankStats } };
    return respond(route, { ok: true });
  });
  await page.goto(base + '/?nointro');
  await page.waitForFunction(() => window.GamePortal && window.GAME?.scene.isActive('Menu'));
  await page.evaluate(() => GamePortal.ready);
  if (await page.getByRole('button', { name: 'Continuar como convidado', exact: true }).count()) {
    await page.getByRole('button', { name: 'Continuar como convidado', exact: true }).click();
  }

  // A guest's local unlock must never become an authenticated account's unlock.
  const apiAvailable = await page.evaluate(() => ['getProgress', 'canPlayStage', 'recordGuestAdvance', 'recordGuestVictory'].every(key => typeof GamePortal[key] === 'function'));
  assert.equal(apiAvailable, true, 'Portal deve expor as quatro APIs de progresso por jogador');
  assert.deepEqual(await page.evaluate(() => GamePortal.getProgress()), blankProgress);
  assert.deepEqual(await page.evaluate(() => ['forest', 'castle', 'catacombs', 'soon', 'unknown'].map(id => GamePortal.canPlayStage(id))), [true, false, false, false, false]);
  await page.evaluate(() => {
    window.__selectorEvents = 0;
    window.addEventListener('muralha-session', () => window.__selectorEvents++);
    GamePortal.recordGuestAdvance('castle');
    GamePortal.recordGuestAdvance('catacombs');
    GamePortal.recordGuestVictory('catacombs');
  });
  assert.deepEqual(await page.evaluate(() => GamePortal.getProgress()), finalProgress);
  assert.equal(await page.evaluate(() => window.__selectorEvents), 3, 'Cada conclusão guest deve avisar seletores ativos');
  await page.reload();
  await page.waitForFunction(() => window.GAME?.scene.isActive('Menu'));
  await page.evaluate(() => GamePortal.ready);
  if (await page.getByRole('button', { name: 'Continuar como convidado', exact: true }).count()) {
    await page.getByRole('button', { name: 'Continuar como convidado', exact: true }).click();
  }
  assert.deepEqual(await page.evaluate(() => GamePortal.getProgress()), finalProgress);
  checked('convidado salva desbloqueio próprio e recarrega sem depender da conta');

  async function login(name) {
    await page.evaluate(() => { GamePortal.openLogin(); });
    const dialog = page.getByRole('dialog').last();
    await dialog.getByLabel('Nome de usuário', { exact: true }).fill(name);
    await dialog.getByLabel('Senha', { exact: true }).fill('SenhaDoSeletor!2026');
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).last().click();
    await page.waitForFunction(expected => GamePortal.user?.username === expected, name);
    await dialog.waitFor({ state: 'detached' });
  }
  async function logout() {
    await page.evaluate(() => { GamePortal.openLogin(); });
    await page.getByRole('dialog').last().getByRole('button', { name: 'Sair da conta', exact: true }).click();
    await page.waitForFunction(() => !GamePortal.user && !GamePortal.dialogOpen);
  }
  await login('SelectorA');
  assert.deepEqual(await page.evaluate(() => GamePortal.getProgress()), blankProgress);
  assert.equal(await page.evaluate(() => GamePortal.canPlayStage('castle')), false);
  await page.evaluate(() => { GamePortal.recordGuestAdvance('castle'); GamePortal.recordGuestAdvance('catacombs'); GamePortal.recordGuestVictory('catacombs'); });
  assert.deepEqual(await page.evaluate(() => GamePortal.getProgress()), blankProgress, 'Client não pode inventar progresso autenticado');
  await page.route('**/api/runs/start', route => {
    const { difficulty, stage } = route.request().postDataJSON();
    if (stage !== 'forest') return respond(route, { error: 'Conclua a fase anterior antes de entrar nesta fase.' }, 403);
    return respond(route, { run_id: 'selector-run', ranked: true, settings, difficulty, stage });
  });
  assert.equal((await page.evaluate(() => GamePortal.beginRun('mage'))).stage, 'forest', 'Partida sem fase deve começar na floresta');
  await page.evaluate(() => GamePortal.beginRun('mage', false, 'medium', 'castle'));
  await page.evaluate(() => GamePortal.beginRun('mage', false, 'medium', 'catacombs'));
  assert.deepEqual(await page.evaluate(() => ({ name: GamePortal.user?.username, csrf: GamePortal.csrf })), { name: 'SelectorA', csrf: 'selector-csrf-a' }, '403 de castelo bloqueado não pode remover a sessão');
  const advanceTargets = [];
  await page.route('**/api/runs/advance', route => {
    const target = route.request().postDataJSON().stage;
    assert.ok(['castle', 'catacombs'].includes(target), 'Avanço deve enviar alvo explícito');
    advanceTargets.push(target);
    current.progress = target === 'castle' ? { ...forestProgress } : { ...castleProgress };
    return respond(route, { run_id: 'selector-run', stage: target, progress: current.progress, stats: current.stats });
  });
  await page.evaluate(() => GamePortal.advanceRun('selector-run'));
  assert.deepEqual(await page.evaluate(() => ({ progress: GamePortal.getProgress(), name: GamePortal.user?.username, csrf: GamePortal.csrf })), {
    progress: forestProgress, name: 'SelectorA', csrf: 'selector-csrf-a',
  }, 'Resposta parcial de avanço deve preservar identidade e CSRF');
  await page.evaluate(() => GamePortal.advanceRun('selector-run', 'catacombs'));
  assert.deepEqual(advanceTargets, ['castle', 'catacombs']);
  assert.deepEqual(await page.evaluate(() => ({ progress: GamePortal.getProgress(), name: GamePortal.user?.username, csrf: GamePortal.csrf })), {
    progress: castleProgress, name: 'SelectorA', csrf: 'selector-csrf-a',
  }, 'Segunda passagem libera Catacumbas e mantém a sessão');
  const finishedStats = { runs: 3, victories: 1, kills: 42, damage: 987, points: 1200, best_points: 800 };
  await page.route('**/api/runs/finish', route => {
    current.progress = { ...finalProgress }; current.stats = finishedStats;
    return respond(route, { saved: true, ranked: true, points: 800, progress: current.progress, stats: current.stats });
  });
  await page.evaluate(() => GamePortal.finishRun({ run_id: 'selector-run', victory: true }));
  assert.deepEqual(await page.evaluate(() => ({ stats: GamePortal.stats, csrf: GamePortal.csrf })), { stats: finishedStats, csrf: 'selector-csrf-a' });
  await page.evaluate(() => { GamePortal.openLogin(); });
  const account = page.getByRole('dialog').last();
  for (const label of ['Partidas', 'Vitórias', 'Abates', 'Dano', 'Pontos', 'Melhor partida', 'Floresta', 'Castelo', 'Inferno']) {
    await account.getByText(label, { exact: true }).waitFor();
  }
  assert.match(await account.innerText(), /42/);
  assert.match(await account.innerText(), /987/);
  await account.getByRole('button', { name: 'Fechar diálogo', exact: true }).click();
  checked('conta recebe perfil parcial sem perder sessão, estatísticas ou CSRF; 403 mantém login');

  // A delayed result from A cannot overwrite B, even if both are in the same tab.
  let releaseAdvance, advanceArrived;
  const arrived = new Promise(resolve => { advanceArrived = resolve; });
  const gate = new Promise(resolve => { releaseAdvance = resolve; });
  await page.route('**/api/runs/advance', async route => {
    advanceArrived(); await gate;
    await respond(route, { run_id: 'selector-run', stage: 'catacombs',
      progress: { ...finalProgress, forest_clears: 7, castle_clears: 2 }, stats: finishedStats });
  });
  await page.evaluate(() => { window.__selectorPendingAdvance = GamePortal.advanceRun('selector-run', 'catacombs'); });
  await arrived;
  // A cookie/account changed in another tab is observed by the real focus refresh.
  current = profiles.SelectorB;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(() => GamePortal.user?.username === 'SelectorB');
  releaseAdvance();
  await page.evaluate(() => window.__selectorPendingAdvance);
  assert.deepEqual(await page.evaluate(() => ({ progress: GamePortal.getProgress(), stats: GamePortal.stats, csrf: GamePortal.csrf })), {
    progress: blankProgress, stats: blankStats, csrf: 'selector-csrf-b',
  }, 'Resposta atrasada de outra conta deve ser descartada');
  await page.route('**/api/runs/advance', route => route.abort('internetdisconnected'));
  await page.evaluate(async () => { try { await GamePortal.advanceRun('offline'); } catch (_) {} GamePortal.recordGuestAdvance(); });
  assert.equal(await page.evaluate(() => GamePortal.user?.username), 'SelectorB');
  assert.deepEqual(await page.evaluate(() => GamePortal.getProgress()), blankProgress, 'Offline autenticado não pode herdar guest');
  checked('resposta atrasada e modo offline preservam o progresso da conta atual');

  // Register the scene here only when the integration owner has not registered it yet.
  const stageExists = await page.evaluate(() => typeof StageSelectScene === 'function');
  assert.equal(stageExists, true, 'Seleção de fases deve existir como cena Phaser real');
  await page.evaluate(() => {
    if (!GAME.scene.keys.StageSelect) GAME.scene.add('StageSelect', StageSelectScene, false);
    for (const key of ['Menu', 'Select', 'Difficulty', 'Game', 'UI', 'End']) if (GAME.scene.isActive(key) || GAME.scene.isPaused(key)) GAME.scene.stop(key);
    GAME.scene.start('StageSelect', { char: 'mage' });
  });
  await page.waitForFunction(() => GAME.scene.isActive('StageSelect'));
  await page.keyboard.press('2');
  await page.keyboard.press('3');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => GAME.scene.isActive('StageSelect')), true, 'Castelo e Catacumbas bloqueados não iniciam uma fase');
  await page.keyboard.press('1');
  await page.waitForFunction(() => GAME.scene.isActive('Difficulty'));
  assert.deepEqual(await page.evaluate(() => { const scene = GAME.scene.getScene('Difficulty'); return { char: scene.charId, stage: scene.stageId }; }), { char: 'mage', stage: 'forest' });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => GAME.scene.isActive('StageSelect'));
  assert.equal(await page.evaluate(() => GAME.scene.getScene('StageSelect').charId), 'mage');
  checked('Phaser bloqueia atalhos das duas fases fechadas, preserva herói e volta de dificuldade para fases');

  await logout();
  assert.equal(await page.evaluate(() => GamePortal.canPlayStage('castle')), true, 'Sair da conta devolve o progresso guest separado');
  assert.equal(await page.evaluate(() => GamePortal.canPlayStage('catacombs')), true, 'Sair da conta também devolve Catacumbas do guest');
  await page.keyboard.press('3');
  await page.waitForFunction(() => GAME.scene.isActive('Difficulty'));
  assert.equal(await page.evaluate(() => GAME.scene.getScene('Difficulty').stageId), 'catacombs', 'Terceiro atalho seleciona Catacumbas liberadas');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => GAME.scene.isActive('StageSelect'));
  await page.keyboard.press('2');
  await page.waitForFunction(() => GAME.scene.isActive('Difficulty'));
  assert.equal(await page.evaluate(() => GAME.scene.getScene('Difficulty').stageId), 'castle', 'Cena aberta deve reagir à conta/progresso atual');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => GAME.scene.isActive('StageSelect'));
  const point = await page.evaluate(() => {
    const scene = GAME.scene.getScene('StageSelect');
    const card = scene.cards[0].panel || scene.cards[0];
    const bounds = GAME.canvas.getBoundingClientRect();
    return { x: bounds.left + card.x * bounds.width / 1280, y: bounds.top + card.y * bounds.height / 720 };
  });
  await page.mouse.click(point.x, point.y);
  await page.waitForFunction(() => GAME.scene.isActive('Difficulty'));
  assert.equal(await page.evaluate(() => GAME.scene.getScene('Difficulty').stageId), 'forest');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => GAME.scene.isActive('StageSelect'));
  const touchPoint = await page.evaluate(() => {
    const scene = GAME.scene.getScene('StageSelect'), card = scene.cards[2].panel || scene.cards[2];
    const bounds = GAME.canvas.getBoundingClientRect();
    return { x: bounds.left + card.x * bounds.width / 1280, y: bounds.top + card.y * bounds.height / 720 };
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...touchPoint, id: 0 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await page.waitForFunction(() => GAME.scene.isActive('Difficulty'));
  assert.equal(await page.evaluate(() => GAME.scene.getScene('Difficulty').stageId), 'catacombs');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => GAME.scene.isActive('StageSelect'));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => GAME.scene.isActive('Select'));
  checked('troca de conta atualiza bloqueios ao vivo e cartões aceitam mouse e toque reais');

  // The first canvas is no longer used. Suspend its render loop before loading
  // a second context so software graphics cannot starve the new page's assets.
  await page.evaluate(() => GAME.loop.sleep());
  const memoryContext = await page.context().browser().newContext({ viewport: { width: 1280, height: 720 } });
  const memoryPage = await memoryContext.newPage();
  await memoryPage.route('**/api/session', route => respond(route, current));
  await memoryPage.addInitScript(() => {
    Storage.prototype.getItem = function () { throw new DOMException('Storage indisponível', 'SecurityError'); };
    Storage.prototype.setItem = function () { throw new DOMException('Storage indisponível', 'SecurityError'); };
  });
  await memoryPage.goto(base + '/?nointro');
  await memoryPage.waitForFunction(() => window.GAME?.scene.isActive('Menu'));
  await memoryPage.evaluate(() => GamePortal.ready);
  assert.deepEqual(await memoryPage.evaluate(() => GamePortal.getProgress()), blankProgress);
  await memoryPage.evaluate(() => { GamePortal.recordGuestAdvance('castle'); GamePortal.recordGuestAdvance('catacombs'); GamePortal.recordGuestVictory('catacombs'); });
  assert.deepEqual(await memoryPage.evaluate(() => GamePortal.getProgress()), finalProgress);
  await memoryContext.close();
  checked('storage indisponível mantém progresso de convidado em memória');
  return checks;
};

if (require.main === module) {
  (async () => {
    const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
    const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true,
      args: ['--no-sandbox', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, hasTouch: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      const checks = await module.exports(page);
      assert.deepEqual(errors, [], 'JavaScript não deve produzir erros');
      console.log(JSON.stringify({ ok: true, checks: checks.length }));
    } finally { await browser.close(); }
  })().catch(error => { console.error(error.stack); process.exitCode = 1; });
}
