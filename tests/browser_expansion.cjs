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
      GAME.scene.start('Game', { char: 'mage', difficulty: d, stage: 'castle' });
    }, difficulty);
    await ready();
    await page.evaluate(() => { const g = GAME.scene.getScene('Game'); g.godMode = true; g.spawningEnabled = false; Sfx.muted = true; });
  }
  try {
    await page.goto(base + '/?nointro&stage=castle');
    await page.waitForFunction(() => window.GAME?.scene.isActive('Menu'));
    if (await page.getByRole('dialog').count()) await page.getByRole('button', { name: 'Continuar como convidado' }).click();
    await page.evaluate(() => GAME.scene.getScene('Menu').go());
    await page.waitForFunction(() => GAME.scene.isActive('Select'));
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => GAME.scene.isActive('StageSelect'));
    await page.keyboard.press('1');
    await page.waitForFunction(() => GAME.scene.isActive('Difficulty'));
    assert(await page.evaluate(() => GAME.scene.getScene('Difficulty').cards.length === 4), 'Faltam dificuldades');
    await page.waitForFunction(() => !GAME.scene.getScene('Difficulty').cameras.main.fadeEffect.isRunning);
    await page.screenshot({ path: artifacts + '/dificuldades.png' });
    await page.keyboard.press('4');
    await ready();
    assert(await page.evaluate(() => {
      const g = GAME.scene.getScene('Game');
      return g.difficultyId === 'hardcore' && g.bossTime === 900 && g.player.dashLevel === 1;
    }), 'Seleção não iniciou Hardcore de 15 minutos');
    check('menu → herói → fase → quatro dificuldades → Hardcore com chefe aos 15 minutos');

    await fresh();
    const recipeChecks = await page.evaluate(() => {
      const g = GAME.scene.getScene('Game'), p = g.player, result = [];
      const clear = () => { for (const w of p.powers) w.destroy(); p.powers = []; p.passives = {}; p.dashLevel = 1; p.dashSmoke = false; g.progression = new ProgressionSystem(g); };
      for (const recipe of PROGRESSION_RECIPES) {
        clear(); g.t = 300;
        if (g.progression.applyRecipe(recipe.id)) throw new Error('Receita incompleta foi aceita: ' + recipe.id);
        if (recipe.kind === 'dash') { p.upgradeDash(); p.upgradeDash(); }
        else for (const id of recipe.ingredients) { const w = p.addPower(id); while (!w.maxed) w.levelUp(); }
        if (recipe.passive) p.addPassive(recipe.passive);
        g.t = 299;
        if (g.progression.applyRecipe(recipe.id)) throw new Error('Evoluiu antes de 5 minutos');
        g.t = 300;
        if (!g.progression.getOffers().some(c => c.type === 'evolution' && c.id === recipe.id)) throw new Error('Baú não oferece receita pronta');
        const previous = p.powers.slice(), oldOrbitalSprites = previous.flatMap(w => w.state.sprites || []);
        if (!g.progression.applyRecipe(recipe.id)) throw new Error('Receita válida recusada');
        if (recipe.kind === 'dash') {
          if (!p.dashSmoke || p.powers.length) throw new Error('Fumaça ocupa arma ou não ativa');
        } else {
          if (!p.hasPower(recipe.result) || recipe.ingredients.some(id => p.hasPower(id) || g.progression.canOfferPower(id))) throw new Error('Transformação/consumo inválido');
          if (p.powers.length !== previous.length - recipe.ingredients.length + 1) throw new Error('União não libera espaço');
          if (oldOrbitalSprites.some(s => s.scene)) throw new Error('Órbita antiga não foi destruída');
        }
        if (recipe.passive && p.passives[recipe.passive] !== 1) throw new Error('Passiva foi consumida');
        if (g.progression.applyRecipe(recipe.id)) throw new Error('Aplicou receita duas vezes');
        if (g.rollChoices().some(c => c.type === 'new' && POWERS[c.id].obtainable === false)) throw new Error('Evolução na rolagem comum');
        result.push(recipe.id);
      }
      clear();
      return result;
    });
    assert(recipeChecks.length === 13, 'Faltam receitas');
    check('treze receitas: requisitos e horário, baú, uniões, limpeza de órbitas, passivas e bloqueio de reaquisição');

    // Verifica dano real para cada arma nova/evoluída, com efeitos e texturas reais.
    await fresh();
    const weapons = await page.evaluate(() => {
      const g = GAME.scene.getScene('Game'), p = g.player;
      g.t = 360;
      for (const w of p.powers) w.destroy(); p.powers = [];
      const results = [];
      for (const id of ['axes','frost','poison','soulblade','tempest','inferno','reaper_axes','blizzard','miasma','celestial_ring','singularity']) {
        g.enemies.killAllSilently();
        const e = g.enemies.spawn('skel_warrior', p.x + 85, p.y, 1); e.hp = e.maxHp = 1e6;
        const w = p.addPower(id); let before = g.totalDamage;
        for (let step = 0; step < 100; step++) {
          g.t += .05; g.grid.clear(); g.grid.insert(e); w.update(.05); g.fx.update(.05);
        }
        if (g.totalDamage <= before) throw new Error('Arma não causou dano: ' + id);
        results.push(id); w.destroy(); p.powers = [];
      }
      return results;
    });
    assert(weapons.length === 11, 'Armas incompletas');
    check('onze armas novas/evoluídas causam dano real e geram efeitos sem erros');

    await fresh();
    const dash = await page.evaluate(() => {
      const g = GAME.scene.getScene('Game'), p = g.player;
      const start = { x: p.x, y: p.y };
      for (let i = 0; i < 3; i++) p.update(.05, { x: 1, y: 0, dash: i === 0 }, g.world);
      const distance = p.x - start.x;
      if (distance < 95 || distance > 105 || p.dashT !== 0 || p.dashCd <= 0) throw new Error('Distância/recarga dash: ' + distance);
      const after = p.x; p.update(.05, { x: 0, y: 0, dash: true }, g.world);
      if (p.x !== after) throw new Error('Ignorou recarga');
      p.x = start.x; p.y = start.y; p.dashCd = 0;
      g.world.solid(p.x + 48, p.y, 20);
      for (let i = 0; i < 4; i++) p.update(.05, { x: 1, y: 0, dash: i === 0 }, g.world);
      if (p.x > start.x + 19) throw new Error('Dash atravessou obstáculo');
      p.x = start.x - 150; p.y = start.y; p.dashCd = 0;
      p.upgradeDash(); p.upgradeDash(); p.enableSmokeDash();
      g.godMode = false; p.invuln = 0;
      p.update(.05, { x: 1, y: 0, dash: true }, g.world);
      const hp = p.hp;
      if (p.takeDamage(5) || p.hp !== hp || p.sprite.alpha > .3) throw new Error('Fumaça não protege/desaparece');
      p.update(.05, { x: 0, y: 0 }, g.world); p.update(.05, { x: 0, y: 0 }, g.world);
      if (!p.takeDamage(5) || p.hp !== hp - 5 || p.dashT > 0) throw new Error('Imunidade não terminou');
      g.godMode = true;
      return { distance, level: p.dashLevel, cooldown: p.dashCooldown };
    });
    assert(dash.level === 3 && dash.cooldown < 1.8, 'Dash não melhora');
    check('dash curto com recarga, colisão e evolução: fumaça só protege durante o movimento');

    await fresh();
    await page.evaluate(() => { const g = GAME.scene.getScene('Game'); g.spawningEnabled = false; });
    const beforeInput = await page.evaluate(() => GAME.scene.getScene('Game').player.dashCd);
    await page.keyboard.press('Shift');
    await page.waitForFunction(() => GAME.scene.getScene('Game').player.dashCd > .1);
    assert(beforeInput === 0, 'Dash não estava pronto');
    await page.keyboard.press('g');
    await page.getByRole('dialog', { name: 'Grimório da muralha' }).waitFor();
    const guideLists=page.getByRole('dialog',{name:'Grimório da muralha'}).locator('.guide-recipes');
    assert(await guideLists.nth(0).locator('.guide-recipe').count() === 13, 'Receitas do grimório incompletas');
    assert(await guideLists.nth(1).locator('.guide-recipe').count() === 6, 'Relíquias do grimório incompletas');
    assert(await page.evaluate(() => GAME.scene.isPaused('Game')), 'Grimório não pausa');
    await page.screenshot({ path: artifacts + '/grimorio.png' });
    await page.keyboard.press('Escape');
    await page.keyboard.down('d');
    await page.waitForFunction(() => GAME.scene.getScene('Game').keys.D.isDown);
    await page.keyboard.up('d');
    check('Shift aciona dash, G mostra treze receitas e fechar devolve o teclado');

    // Baú físico, painel de escolha e retorno à partida.
    await fresh();
    await page.evaluate(() => {
      const g = GAME.scene.getScene('Game'), p = g.player; g.t = 300;
      p.addPower('slash'); while (!p.hasPower('slash').maxed) p.hasPower('slash').levelUp(); p.addPassive('maxHp');
      g.progression.dropChest(p.x, p.y, true);
    });
    await page.waitForFunction(() => GAME.scene.getScene('Game').chestOpen && GAME.scene.getScene('UI').lvlActive);
    await page.screenshot({ path: artifacts + '/tesouro.png' });
    await page.waitForFunction(() => { const ui = GAME.scene.getScene('UI'); return ui.time.now - ui.lvlOpenAt >= 350; });
    await page.keyboard.press('1');
    await page.waitForFunction(() => GAME.scene.getScene('Game').player.hasPower('soulblade') && GAME.scene.isActive('Game'));
    check('baú físico pausa, oferece evolução e aplica recompensa ao escolher pelo teclado');

    await fresh();
    await page.evaluate(() => {
      const g = GAME.scene.getScene('Game'), p = g.player, w = g.world;
      const originalOpen = g.openEvolutionChest;
      let pickups = 0; g.openEvolutionChest = () => { pickups++; return true; };
      for (const [x,y] of [[w.B+p.radius,w.B+p.radius],[w.W-w.B-p.radius,w.B+p.radius],[w.B+p.radius,w.H-w.B-p.radius],[w.W-w.B-p.radius,w.H-w.B-p.radius]]) {
        p.x=x; p.y=y; w.constrain(p); g.t=180;
        g.progression.destroy(); g.progression.supplemental.clear(); g.progression.update(0);
        if (!g.progression.supplemental.has(180)) throw new Error('Supply not delivered');
        const c=g.progression.chests[0];
        if (c) { p.x=c.x; p.y=c.y; w.constrain(p); g.progression.update(0); }
        if (g.progression.chests.length) throw new Error('Corner chest physically unreachable');
      }
      if (pickups!==4) throw new Error('Missing corner pickups');
      p.x=CONFIG.arena.x; p.y=CONFIG.arena.y; w.arenaLock=true;
      const arenaChest=g.progression.dropChest(w.A.x+w.A.r+100,w.A.y);
      if(!arenaChest || Math.hypot(arenaChest.x-w.A.x,arenaChest.y-w.A.y)>w.A.r-p.radius) throw new Error('Chest outside locked arena');
      g.progression.destroy(); w.arenaLock=false;
      w.solid(p.x+100,p.y,30);
      const obstacleChest=g.progression.dropChest(p.x+100,p.y);
      if(!obstacleChest || Math.hypot(obstacleChest.x-(p.x+100),obstacleChest.y-p.y)<30+p.radius-.01) throw new Error('Chest inside obstacle');
      g.progression.destroy();
      for(let i=0;i<8;i++) if(!g.progression.dropChest(p.x+100,p.y+100)) throw new Error('Chest budget too low');
      g.progression.supplemental.clear(); g.progression.update(0);
      if(g.progression.dropChest(p.x,p.y) || g.progression.supplemental.has(180)) throw new Error('Full budget falsely delivered supply');
      g.progression.destroy(); g.progression.update(0);
      if(!g.progression.supplemental.has(180)) throw new Error('Supply did not retry');
      g.openEvolutionChest=originalOpen;
    });
    check('suprimentos nos quatro cantos permanecem fisicamente coletáveis');

    await fresh('hardcore');
    await page.evaluate(() => {
      const g=GAME.scene.getScene('Game'); g.spawningEnabled=true; g.t=270;
      while(g.enemies.spawn('skel_warrior',g.player.x+550,g.player.y,1)) {}
      g.enemies.runEvent(EVENTS.find(e=>e.t===270));
      if(g.enemies.alive>238) throw new Error('Event consumed reserved slots');
      g.t=300; g.encounters.update(0);
      if(!g.encounters.spawned[0]) throw new Error('First saturated encounter late');
      while(g.enemies.spawn('skel_warrior',g.player.x+550,g.player.y,1,true)) {}
      g.enemies.runEvent({type:'swarm',enemy:'skel_warrior',count:50,msg:'test'});
      g.t=600; g.encounters.update(0);
      if(!g.encounters.spawned[1] || g.enemies.alive>240) throw new Error('Second saturated encounter late');
      const originalMax=CONFIG.maxEnemies, originalEnemies=g.enemies, originalEncounters=g.encounters;
      try {
        for(const cap of [1,2]) {
          CONFIG.maxEnemies=cap; g.enemies=new EnemyManager(g); g.encounters=new EncounterDirector(g); g.t=0;
          g.enemies.director(1);
          if(g.enemies.alive!==1) throw new Error('Tiny cap has no ordinary spawn: '+cap);
          const xp=g.player.xp, kills=g.totalKills;
          g.t=300; g.encounters.update(0);
          if(!g.encounters.spawned[0]) throw new Error('Tiny first encounter late');
          const first=g.encounters.active[0];
          g.t=600; g.encounters.update(0);
          if(cap===1) {
            if(!first.alive || g.encounters.spawned[1]) throw new Error('Tiny cap displaced active miniboss');
            g.enemies.kill(first,true); g.encounters.update(0);
          }
          if(!g.encounters.spawned[1] || g.player.xp!==xp || g.totalKills!==kills) throw new Error('Tiny precedence/reward failure');
          for(const e of g.enemies.pool) e.sprite.destroy();
        }
      } finally { CONFIG.maxEnemies=originalMax; g.enemies=originalEnemies; g.encounters=originalEncounters; }
      g.spawningEnabled=false;
    });
    check('reserva central resiste a eventos/summons; limites 1/2 mantêm hordas e prioridade/retry sem XP');

    await fresh();
    const encounters = await page.evaluate(() => {
      const g = GAME.scene.getScene('Game'), p = g.player;
      g.spawningEnabled = true; g.t = 299.9; g.encounters.update(.1);
      if (g.encounters.active.length) throw new Error('Mini nasceu cedo');
      g.t = 300; g.encounters.update(.1); g.encounters.update(.1);
      if (g.encounters.active.length !== 1 || g.encounters.active[0].id !== 'storm_warden') throw new Error('Primeiro mini incorreto/duplicado');
      let xp = p.xp; const initialLevel = p.level, first = g.encounters.active[0];
      g.enemies.kill(first);
      if (p.level === initialLevel && p.xp <= xp || !g.progression.chests.length) throw new Error('Mini sem XP/baú');
      const level = p.level, currentXp = p.xp;
      g.encounters.onKill(first);
      if (p.level !== level || p.xp !== currentXp) throw new Error('Recompensa duplicada');
      g.t = 600; g.encounters.update(.1); g.encounters.update(.1);
      if (g.encounters.active.length !== 1 || g.encounters.active[0].id !== 'crypt_lord') throw new Error('Segundo mini incorreto');
      g.enemies.kill(g.encounters.active[0], true);
      if (p.level !== level || p.xp !== currentXp) throw new Error('Limpeza silenciosa concedeu XP');
      g.t = 900; g.encounters.update(.1);
      if (g.encounters.active.length || g.encounters.spawned.length !== 2) throw new Error('Terceiro mini indevido');
      // Todos os ataques especiais passam pela IA real.
      g.t = 350; g.pendingLevels = 0; g.hazards = []; g.enemyShots.clear();
      for (const id of ['storm_caller', 'poisoner', 'frost_wraith', 'hell_charger']) {
        const e = g.enemies.spawn(id, p.x + 200, p.y, 1);
        e.atkCd = e.shellCd = e.chargeCd = 0;
        g.enemies.ai(e, .05, p, 1);
        if (id === 'hell_charger' && e.state === 'chase') throw new Error('Carrasco não prepara investida');
      }
      if (!g.hazards.length || !g.enemyShots.items.some(s => s.live && s.slow > 0)) throw new Error('Faltam raios/veneno/gelo');
      return { xpLevel: level, miniCount: g.encounters.spawned.filter(Boolean).length };
    });
    assert(encounters.miniCount === 2, 'Faltam minibosses');
    check('minibosses únicos aos 5/10, muita XP e baú, limpeza sem recompensa e quatro inimigos especiais');

    await fresh('hardcore');
    const simulation = await page.evaluate(() => {
      const g = GAME.scene.getScene('Game'), p = g.player;
      g.spawningEnabled = true; g.t = 0; g.bossTime = 900;
      g.botInput = { x: 0, y: 0, dash: false };
      for (const w of p.powers) w.destroy(); p.powers = [];
      // Build viável para estressar todas as interações sem transformar o teste em teste de habilidade.
      for (const id of ['soulblade','tempest','inferno','blizzard','celestial_ring','singularity']) p.addPower(id);
      p.upgradeDash(); p.upgradeDash(); p.enableSmokeDash();
      g.openLevelUp = function() { this.pendingLevels--; this.applyChoice(this.rollChoices()[0]); };
      g.openEvolutionChest = function(chest) { this.applyChoice(this.progression.getOffers(chest.canEvolve)[0]); return true; };
      const start = performance.now(); let peak = 0;
      for (let frame = 0; frame < 18002 && !g.bossStarted; frame++) {
        g.botInput.x = Math.cos(frame / 400); g.botInput.y = Math.sin(frame / 400);
        g.botInput.dash = frame % 35 === 0;
        g.update(frame * 50, 50);
        peak = Math.max(peak, g.enemies.alive);
        if (g.enemies.alive > 240 || g.hazards.length > 41 || g.fx.dashTrails.length > 12 || g.fx.dashPuffs.length > 24) throw new Error('Pool excedido');
      }
      if (!g.bossStarted || g.t < 900 || g.t > 900.1 || g.encounters.spawned.filter(Boolean).length !== 2) throw new Error('Cronograma de 15 minutos incorreto');
      if (g.enemies.alive || g.encounters.active.length) throw new Error('Chefe não limpou hordas/minis');
      if (g.boss.maxHp !== Math.round(BOSS.hp * DIFFICULTIES.hardcore.bossHpMul)) throw new Error('Chefe não escala com dificuldade');
      return { simulatedSeconds: g.t, peakEnemies: peak, finalBossHp: g.boss.maxHp, elapsedMs: Math.round(performance.now() - start), kills: g.totalKills };
    });
    assert(simulation.peakEnemies > 100, 'Hardcore não ficou denso');
    check('15 minutos simulados no Hardcore: hordas, armas, efeitos, dois minis e chefe final com pools limitados');
    console.log(JSON.stringify(simulation));
    await page.waitForFunction(() => GAME.scene.getScene('Game').boss.state !== 'intro');
    await page.screenshot({ path: artifacts + '/chefe-hardcore.png' });
    await page.evaluate(() => {
      GAME.scene.stop('UI'); GAME.scene.stop('Game');
      GAME.scene.start('End',{win:false,char:'mage',difficulty:'hardcore',time:600,level:10,kills:10,damage:100,points:100,powers:[]});
    });
    await page.waitForFunction(() => GAME.scene.isActive('End'));
    assert(await page.evaluate(() => {
      const sc=GAME.scene.getScene('End'), list=sc.children.list;
      const label=list.find(o=>o.type==='Text' && o.text===resolveDifficulty('hardcore').name.toUpperCase()+' • '+STAGES.castle.shortName.toUpperCase());
      return label && label.visible && label.alpha>0 && list.filter(o=>o.type==='Rectangle').every(o=>o.depth<label.depth || list.indexOf(o)<list.indexOf(label) || o.getBounds().bottom<label.getBounds().top || o.getBounds().top>label.getBounds().bottom);
    }), 'End difficulty label occluded');
    await page.screenshot({path:artifacts+'/resultado-hardcore.png'});
    check('resultado mostra dificuldade acima dos fundos');
    await page.close();
    const touchContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true });
    const touchPage = await touchContext.newPage(); touchPage.on('pageerror', e => errors.push(e.message));
    await touchPage.goto(base + '/?char=ranger&god&nointro&stage=castle');
    await touchPage.waitForFunction(() => window.GAME?.scene.getScene('Game')?.gameReady && GAME.scene.isActive('Game'));
    await touchPage.evaluate(() => { GAME.scene.getScene('Game').spawningEnabled = false; });
    const cdp = await touchContext.newCDPSession(touchPage);
    const finger = { id: 1, x: 200, y: 550 };
    const dashFinger = { id: 2, x: 1204, y: 550 };
    const initialX = await touchPage.evaluate(() => GAME.scene.getScene('Game').player.x);
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[finger] });
    await touchPage.waitForFunction(() => GAME.scene.getScene('Game').joy.active);
    finger.x=250;
    await cdp.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[finger] });
    await touchPage.waitForFunction(x => {
      const g = GAME.scene.getScene('Game');
      return g.joy.active && g.joy.x > .5 && g.player.x > x + 1;
    }, initialX);
    await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[finger, dashFinger] });
    await touchPage.waitForFunction(() => GAME.scene.getScene('Game').player.dashCd > .1);
    assert(await touchPage.evaluate(() => GAME.scene.getScene('Game').joy.active), 'Dash cancelled held joystick');
    // Neste comando do Chrome, os pontos de touchEnd são os contatos a soltar.
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[dashFinger] });
    assert(await touchPage.evaluate(() => GAME.scene.getScene('Game').joy.active && GAME.scene.getScene('Game').joy.x > .5), 'Dash release cancelled joystick');
    await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
    await touchPage.waitForFunction(() => !GAME.scene.getScene('Game').joy.active);
    await touchContext.close();
    check('dois dedos simultâneos: joystick move, DASH dispara e soltar DASH preserva joystick');
    assert(!errors.length, errors.join('; '));
    console.log(JSON.stringify({ ok: true, checks: checks.length, pageErrors: errors.length, artifacts }));
  } catch (error) {
    await page.screenshot({ path: artifacts + '/falha.png' }).catch(() => {});
    if (errors.length) console.error('PAGE ERRORS:', errors.join('; '));
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
