// Teste integrado opcional. O runner Python usa banco temporário fora da pasta pública.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const base = process.env.MURALHA_TEST_URL;
if (!base || !process.env.MURALHA_TEST_CREDENTIALS) throw new Error('Execute pelo runner browser_accounts.py.');
const credentials = JSON.parse(fs.readFileSync(process.env.MURALHA_TEST_CREDENTIALS, 'utf8'));
const playerName = 'Jogador_123456789012';
const playerPassword = 'TesteDeIntegracao!2026';
const readyGame = page => page.waitForFunction(() => window.GAME?.scene.isActive('Game') && GAME.scene.getScene('Game')?.gameReady);
async function closeDialog(page) { await page.getByRole('button', { name: 'Fechar diálogo', exact: true }).click(); }
async function activatePage(page, background) {
  // Only the foreground canvas needs to render. Keeping both unthrottled on
  // software graphics can starve password hashing past the real API timeout.
  await background.evaluate(() => { window.GAME?.loop.sleep(); });
  await page.bringToFront();
  await page.evaluate(() => { window.GAME?.loop.wake(); });
}
async function playFromMenu(page) {
  await page.evaluate(() => GAME.scene.getScene('Menu').go());
  await page.waitForFunction(() => GAME.scene.isActive('Select'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => GAME.scene.isActive('StageSelect'));
  await page.keyboard.press('1');
  await page.waitForFunction(() => GAME.scene.isActive('Difficulty'));
  await page.keyboard.press('Enter');
  await readyGame(page);
}
async function auth(page, username, password, register = false) {
  await page.evaluate(() => { GamePortal.openLogin(); });
  const dialog = page.getByRole('dialog');
  if (register) await dialog.locator('.portal-switches button').nth(1).click();
  await dialog.getByLabel('Nome de usuário', { exact: true }).fill(username);
  await dialog.getByLabel('Senha', { exact: true }).fill(password);
  await dialog.locator('form button[type=submit]').click();
  await page.waitForFunction(name => GamePortal.user?.username === name, username);
  await dialog.waitFor({ state: 'detached' });
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  const playerContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const adminContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const player = await playerContext.newPage(), admin = await adminContext.newPage();
  const errors = [], results = [];
  const checked = message => { results.push(message); console.log('OK: ' + message); };
  await player.bringToFront();
  player.setDefaultTimeout(15000); admin.setDefaultTimeout(15000);
  for (const page of [player, admin]) page.on('pageerror', e => errors.push(e.message));
  try {
    await player.goto(base + '/?nointro');
    const firstDialog = player.getByRole('dialog');
    await firstDialog.waitFor();
    assert(await firstDialog.getByLabel('Nome de usuário', { exact: true }).getAttribute('maxlength') === '20', 'Limite de nome ausente');
    await firstDialog.getByRole('button', { name: 'Continuar como convidado' }).click();
    await playFromMenu(player);
    assert(await player.evaluate(() => !GamePortal.user && GAME.scene.getScene('Game').gameReady), 'Visitante não pôde jogar');
    await player.evaluate(() => { GamePortal.openLeaderboard(); });
    await player.getByRole('dialog').waitFor();
    await player.waitForFunction(() => GAME.scene.isPaused('Game'));
    await closeDialog(player);
    await player.waitForFunction(() => GAME.scene.isActive('Game'));
    await player.evaluate(() => GAME.scene.getScene('UI').toMenu());
    await player.waitForFunction(() => GAME.scene.isActive('Menu'));
    await auth(player, playerName, playerPassword, true);
    await player.reload();
    await player.waitForFunction(name => GamePortal.user?.username === name, playerName);
    checked('visitante, cadastro com 20 caracteres, cookie e restauração de sessão');

    const denied = await playerContext.request.get(base + '/api/admin/users');
    assert(denied.status() === 403, 'Usuário comum acessou administração');
    await playFromMenu(player);
    const run = await player.evaluate(async () => {
      const g = GAME.scene.getScene('Game'); g.spawningEnabled = false;
      const enemy = g.enemies.spawn('skel_warrior', g.player.x + 80, g.player.y, 1);
      g.damageEnemy(enemy, 999, { x: g.player.x, y: g.player.y, knock: 0 });
      const damage = g.totalDamage, kills = g.totalKills, ranked = (await g.runStart).ranked;
      g.player.takeDamage(g.player.maxHp + 1);
      return { damage, kills, ranked };
    });
    assert(run.damage === 14 && run.kills === 1 && run.ranked, 'Dano efetivo/partida classificada incorretos');
    await player.waitForFunction(() => GAME.scene.isActive('End'));
    const saved = await player.evaluate(() => GAME.scene.getScene('Game').runSubmission);
    assert(saved.saved && saved.ranked, 'Resultado real não foi salvo');
    await player.evaluate(() => { GamePortal.openLeaderboard(); });
    await player.getByRole('dialog').getByText(playerName, { exact: true }).waitFor();
    for (const tab of ['Abates', 'Dano', 'Pontos']) {
      await player.getByRole('dialog').getByRole('button', { name: tab, exact: true }).click();
      await player.getByRole('dialog').getByText(playerName, { exact: true }).waitFor();
    }
    await player.screenshot({ path: '/tmp/muralha-ranking.png' });
    await closeDialog(player);
    checked('partida normal, dano sem sobrecontar, resultado salvo e três critérios do ranking');

    await activatePage(admin, player);
    await admin.goto(base + '/?nointro');
    await admin.getByRole('dialog').getByRole('button', { name: 'Continuar como convidado' }).click();
    await auth(admin, credentials.username, credentials.password);
    await playFromMenu(admin);
    assert(await admin.evaluate(() => GAME.scene.getScene('Game').isPractice), 'Admin entrou em partida classificada');
    await admin.keyboard.press('F2');
    await admin.getByRole('dialog', { name: 'Administração' }).waitFor();
    await admin.getByLabel('Vida máxima', { exact: true }).fill('250');
    await admin.getByLabel('Vida atual', { exact: true }).fill('200');
    await admin.getByLabel('Velocidade', { exact: true }).fill('500');
    await admin.getByRole('button', { name: 'Aplicar atributos', exact: true }).click();
    await admin.waitForFunction(() => GAME.scene.getScene('Game').player.maxHp === 250 && GAME.scene.getScene('Game').player.hp === 200 && GAME.scene.getScene('Game').player.speed === 500);
    await admin.getByLabel('Tipo de inimigo', { exact: true }).selectOption('skel_warrior');
    await admin.getByLabel('Quantidade', { exact: true }).fill('3');
    await admin.getByRole('button', { name: 'Criar ao redor do jogador', exact: true }).click();
    await admin.waitForFunction(() => GAME.scene.getScene('Game').enemies.alive >= 3);
    await admin.getByLabel('Habilidade', { exact: true }).selectOption('fireball');
    await admin.getByLabel('Nível da habilidade', { exact: true }).fill('4');
    await admin.getByRole('button', { name: 'Adicionar / alterar habilidade', exact: true }).click();
    await admin.waitForFunction(() => GAME.scene.getScene('Game').player.hasPower('fireball')?.level === 4);
    await admin.getByLabel('Nível do jogador', { exact: true }).fill('12');
    await admin.getByRole('button', { name: 'Definir nível', exact: true }).click();
    await admin.waitForFunction(() => GAME.scene.getScene('Game').player.level === 12);
    await admin.getByRole('button', { name: 'Ligar invencibilidade', exact: true }).click();
    await admin.waitForFunction(() => GAME.scene.getScene('Game').godMode);
    await admin.screenshot({ path: '/tmp/muralha-admin.png' });
    await admin.getByRole('button', { name: 'Pular para o chefe', exact: true }).click();
    await admin.waitForFunction(() => GAME.scene.getScene('Game').bossStarted);
    checked('admin autenticado, F2, vida, velocidade, spawn, habilidade, nível, invencibilidade e chefe');

    await admin.getByRole('button', { name: 'Usuários', exact: true }).click();
    const userRow = admin.locator('.admin-user-row').filter({ hasText: playerName });
    await userRow.getByRole('button', { name: 'Banir login', exact: true }).click();
    await userRow.getByRole('button', { name: 'Desbanir', exact: true }).waitFor();
    await activatePage(player, admin);
    await player.evaluate(() => window.dispatchEvent(new Event('focus')));
    await player.waitForFunction(() => !GamePortal.user);
    const bannedRanking = await playerContext.request.get(base + '/api/leaderboard?sort=points');
    assert(!(await bannedRanking.json()).entries.some(e => e.username === playerName), 'Banido permaneceu no ranking');
    await activatePage(admin, player);
    await userRow.getByRole('button', { name: 'Desbanir', exact: true }).click();
    await userRow.getByRole('button', { name: 'Banir login', exact: true }).waitFor();
    checked('banimento, revogação de sessão, retirada do ranking e desbanimento');

    await admin.getByRole('button', { name: 'Regras do jogo', exact: true }).click();
    await admin.getByLabel('Chance de cura (%)', { exact: true }).fill('12.5');
    await admin.getByRole('button', { name: 'Salvar regras', exact: true }).click();
    await admin.getByText('Regras salvas para as próximas partidas.', { exact: true }).waitFor();
    await activatePage(player, admin);
    await auth(player, playerName, playerPassword);
    await player.evaluate(() => { GamePortal.settings.healthDropChance = 0.05; GAME.scene.getScene('End').again(); });
    await readyGame(player);
    assert(await player.evaluate(() => CONFIG.healthDropChance === 0.125 && GAME.scene.getScene('Game').isPractice), 'Início usou cache em vez das regras oficiais');
    checked('parâmetros oficiais e treino quando as regras globais mudam');
    await player.evaluate(() => { GamePortal.openLogin(); });
    await player.getByRole('button', { name: 'Sair da conta', exact: true }).click();
    await player.waitForFunction(() => !GamePortal.user);
    await player.getByRole('dialog').waitFor({ state: 'detached' });
    checked('logout real com POST JSON');
    const guestRun = await player.evaluate(async () => {
      GamePortal.settings.healthDropChance = 0.05;
      return await GamePortal.beginRun('vanguard', false);
    });
    assert(!guestRun.run_id && !guestRun.ranked && guestRun.settings.healthDropChance === 0.125, 'Convidado não recebeu as regras atualizadas');
    checked('regras atuais para visitantes');

    assert(errors.length === 0, 'Erros JavaScript: ' + errors.join('; '));
    console.log(JSON.stringify({ ok: true, checks: results, pageErrors: errors.length }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
