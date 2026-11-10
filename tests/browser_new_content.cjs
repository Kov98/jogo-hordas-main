// Conteúdo e travessia com Phaser real; runner usa exclusivamente dados descartáveis.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.MURALHA_TEST_URL;
if (!base) throw Error('Execute tests/browser_accounts.py --new-content');
const out = process.env.MURALHA_TEST_ARTIFACTS || path.join(require('node:os').tmpdir(), 'muralha-novos-poderes');
fs.mkdirSync(out, { recursive: true });
const ready = (p, stage = 'forest') => p.waitForFunction(stage =>
  window.GAME?.scene.isActive('Game') && GAME.scene.getScene('Game').gameReady &&
  !GAME.scene.getScene('Game').cinematic && GAME.scene.getScene('Game').stageId === stage &&
  !GAME.scene.getScene('Game').cameras.main.fadeEffect.isRunning, stage);
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
    headless: true, args: ['--no-sandbox', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(25000);
  const check = message => { checks.push(message); console.log('OK: ' + message); };
  const capture = name => page.screenshot({ path: path.join(out, name + '.png') });
  try {
    await page.goto(base + '/?char=channeler&god&nointro');
    await ready(page);
    assert(await page.evaluate(() => {
      const g = GAME.scene.getScene('Game'); g.spawningEnabled = false; Sfx.muted = true;
      return g.player.def.id === 'channeler' && g.player.maxHp === 110 && g.player.hasPower('plasma')?.level === 1;
    }), 'Canalizador deve começar com Plasma e vida própria');
    check('Canalizador inicia uma partida com Plasma');

    for (const id of ['cyclone', 'radiant_beam', 'plasma', 'meteor']) {
      const result = await page.evaluate(id => {
        const g = GAME.scene.getScene('Game'), p = g.player;
        g.scene.resume();
        for (const w of p.powers) w.destroy(); p.powers = [];
        for (const shot of g.pShots.items) if (shot.live) g.pShots.kill(shot);
        g.enemies.killAllSilently(); g.enemyShots.clear(); g.hazards.length = 0;
        g.pendingLevels = 0; g.levelUpOpen = false; g.spawningEnabled = false;
        p.x = 2000; p.y = 3000; p.sprite.setPosition(p.x, p.y);
        const targets = [0, -60, 60].map(dy => {
          const e = g.enemies.spawn('forest_rootling', p.x + 160, p.y + dy, 1);
          e.hp = e.maxHp = 100000; e.def = { ...e.def, speed: 0, summon: undefined, shell: undefined };
          return e;
        });
        const power = p.addPower(id), before = g.totalDamage;
        g.botInput = { x: 0, y: 0, dash: false };
        for (let i = 0; i < 120; i++) g.update(i * 50, 50);
        const damage = g.totalDamage - before;
        power.timer = 0;
        for (let i = 0; i < 12; i++) g.update(i * 50, 50);
        g.botInput = null; g.scene.pause();
        return { damage, levels: power.maxLevel, shots: g.pShots.items.filter(s => s.live).length,
          missing: !g.textures.exists('i_' + id), alive: targets.filter(e => e.alive).length };
      }, id);
      assert(result.damage > 0, id + ' precisa causar dano real');
      assert.equal(result.levels, 8, id + ' precisa de oito níveis');
      assert(!result.missing && result.shots <= 160, id + ' precisa de ícone e respeitar o pool');
      await capture('poder-' + id);
      check(id + ': dano real, oito níveis, ícone e pool limitado');
    }
    await page.evaluate(() => { GAME.scene.getScene('Game').scene.resume(); });
    assert(await page.evaluate(() => {
      const g = GAME.scene.getScene('Game');
      g.fx.embers(g.player.x, g.player.y, 5000);
      return g.fx.em.ember.getAliveParticleCount() > 0 && g.fx.em.ember.getAliveParticleCount() <= 128 &&
        g.world.fireSources.length > 15;
    }), 'Brasas precisam existir e respeitar o orçamento compartilhado');
    check('fontes ambientais e brasas pequenas usam emissor limitado');

    await page.evaluate(() => {
      const g = GAME.scene.getScene('Game');
      g.enemies.killAllSilently(); g.enemyShots.clear(); g.hazards.length = 0;
      for (const power of g.player.powers) power.destroy(); g.player.powers = [];
      for (const [id, dx] of [['forest_witch', -230], ['forest_storm_mage', 230]]) {
        const e = g.enemies.spawn(id, g.player.x + dx, g.player.y - 40, 1);
        e.hp = e.maxHp = 100000; e.shellCd = 0;
      }
      g.grid.clear(); for (const e of g.enemies.pool) if (e.alive) g.grid.insert(e);
      // A IA de ataques, como o diretor, respeita o bloqueio global de combate.
      g.spawningEnabled = true; g.enemies.update(.05); g.spawningEnabled = false;
      g.fx.update(.4); g.scene.pause();
    });
    const warnings = await page.evaluate(() => GAME.scene.getScene('Game').hazards.map(h => ({kind:h.kind, delay:h.delay})));
    assert(warnings.some(h => h.kind === 'dark') && warnings.some(h => h.kind === 'spark'), 'Criaturas precisam de ataques próprios');
    assert(warnings.every(h => h.delay >= .8), 'Ataques precisam dar tempo para desviar');
    await capture('bruxa-mago-avisos');
    check('bruxa e mago elétrico anunciam ataques distintos no cenário');

    await page.evaluate(() => { GAME.scene.stop('UI'); GAME.scene.stop('Game'); GAME.scene.start('Select'); });
    await page.waitForFunction(() => GAME.scene.isActive('Select') && !GAME.scene.getScene('Select').cameras.main.fadeEffect.isRunning);
    assert(await page.evaluate(() => {
      const s = GAME.scene.getScene('Select');
      return s.ids.length === 4 && s.cards.every(c => c.panel.x - c.panel.width / 2 >= 0 && c.panel.x + c.panel.width / 2 <= 1280);
    }), 'Quatro cartões devem ficar inteiros na tela');
    await capture('quatro-personagens');
    await page.keyboard.press('4');
    await page.waitForFunction(() => GAME.scene.isActive('StageSelect'));
    assert.equal(await page.evaluate(() => GAME.scene.getScene('StageSelect').charId), 'channeler');
    check('quatro heróis cabem na tela e atalho 4 escolhe Canalizador');

    await page.evaluate(() => { GAME.scene.stop('StageSelect'); GAME.scene.start('Game', { char: 'channeler', stage: 'forest' }); });
    await ready(page);
    await page.evaluate(() => {
      const g = GAME.scene.getScene('Game'); g.godMode = true; g.spawningEnabled = false;
      for (const id of ['cyclone', 'radiant_beam', 'meteor']) g.player.addPower(id);
      for (const power of g.player.powers) power.levelUp();
      g.player.dashLevel = 2; g.t = 900; g.startBossFight();
      g.boss.invuln = false; g.damageEnemy(g.boss, g.boss.hp + 1, null);
      window.__passageCheck = { time: g.totalTime, points: g.points, hp: g.player.hp };
    });
    assert(await page.evaluate(() => !!GAME.scene.getScene('Game').cinematic), 'Golpe fatal deve iniciar cinema imediatamente');
    for (const key of ['g', 'F2', 'p', 'Escape', 'Space']) await page.keyboard.press(key);
    assert(await page.evaluate(() => {
      const g = GAME.scene.getScene('Game'), before = window.__passageCheck;
      return !GamePortal.dialogOpen && !g.scene.get('UI').paused && g.totalTime === before.time &&
        g.points === before.points && g.player.hp === before.hp;
    }), 'Cinema não pode receber menus, dano nem tempo extra');
    await capture('guardiao-derrotado');
    await page.waitForFunction(() => {
      const g = GAME.scene.getScene('Game');
      return g.cinematic === 'forest-gate' && g.world.gateLeaves?.[0]?.scaleX < .85;
    });
    await capture('portao-abrindo');
    await page.waitForFunction(() => GAME.scene.getScene('Game').stageCleared && !GAME.scene.getScene('Game').cinematic);
    assert(await page.evaluate(() => {
      const g = GAME.scene.getScene('Game'); return g.world.gateOpen && !g.ended && g.totalTime === window.__passageCheck.time;
    }));
    check('guardião → raízes → abertura do portão → controle, sem pontuação extra');

    await page.evaluate(() => {
      const g = GAME.scene.getScene('Game'), p = g.player;
      p.x = g.world.gate.x; p.y = g.world.gate.y + 80; p.sprite.setPosition(p.x, p.y);
      g.cameras.main.centerOn(p.x, p.y);
      window.__passageCheck.startY = p.y;
      window.__passagePromise = g.enterCastle();
    });
    await page.waitForFunction(() => {
      const g = GAME.scene.getScene('Game');
      return g.stageId === 'forest' && g.cinematic === 'castle-entry' && g.player.y < window.__passageCheck.startY - 10;
    });
    assert.equal(await page.evaluate(() => GAME.scene.getScene('Game').enterCastle()), false, 'Entrada repetida deve ser rejeitada');
    await capture('entrando-na-porta');
    await page.waitForFunction(() => {
      const g = GAME.scene.getScene('Game'); return g.stageId === 'castle' && g.cinematic === 'castle-arrival' &&
        GAME.scene.getScene('UI').ready && !g.cameras.main.fadeEffect.isRunning;
    });
    assert.equal(await page.evaluate(() => GAME.scene.isVisible('UI')), false, 'HUD deve ficar oculto durante a saída da porta');
    await capture('saindo-no-castelo');
    await ready(page, 'castle');
    assert(await page.evaluate(() => {
      const g = GAME.scene.getScene('Game'), p = g.player;
      return p.def.id === 'channeler' && p.hp === p.maxHp && p.dashLevel === 2 &&
        ['cyclone','radiant_beam','plasma','meteor'].every(id => p.hasPower(id)?.level === 2) &&
        g.t < 2 && g.totalTime >= 900 && GAME.scene.isVisible('UI');
    }), 'Travessia deve preservar personagem, armas, níveis e dash e devolver o HUD');
    check('entrada → fade → saída preserva os quatro poderes e devolve combate/HUD');
    assert.deepEqual(errors, [], 'Navegador sem erros JavaScript');
    console.log(JSON.stringify({ok:true, checks:checks.length, pageErrors:errors.length, artifacts:out}));
  } catch (error) { await capture('falha').catch(()=>{}); console.error('PAGE ERRORS', errors); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode=1; });
