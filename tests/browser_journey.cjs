// Integração da jornada; somente o banco temporário do runner é alterado.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const base=process.env.MURALHA_TEST_URL;
if(!base||!process.env.MURALHA_TEST_DATA_DIR)throw Error('Use browser_accounts.py --journey');
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const out=path.join(__dirname,'../docs/auditoria-2026-11-11/capturas/jornada');fs.mkdirSync(out,{recursive:true});
const fallArtifacts=out;
const ready=(page,stage)=>page.waitForFunction(stage=>{const g=window.GAME?.scene.getScene('Game');return g?.gameReady&&GAME.scene.isActive('Game')&&g.stageId===stage&&!g.cinematic&&!g.cameras.main.fadeEffect.isRunning;},stage);
const killBoss=page=>page.evaluate(()=>{
  const g=GAME.scene.getScene('Game');g.godMode=true;g.spawningEnabled=false;g.pendingLevels=0;g.t=900;g.startBossFight();g.boss.invuln=false;g.damageEnemy(g.boss,g.boss.hp+1,null);
});
async function castleFall(page,prefix){
  await page.waitForFunction(()=>GAME.scene.getScene('Game').finale instanceof CastleFinale);
  assert(await page.evaluate(()=>{const g=GAME.scene.getScene('Game');return !!g.cinematic&&!g.ended&&!g.runSubmission&&!GAME.scene.isActive('End');}),'Cavaleiro deve iniciar queda sem concluir ou pontuar a campanha');
  await page.waitForFunction(()=>{const f=GAME.scene.getScene('Game').finale;return f instanceof CastleFinale&&f.opening>120&&f.lava.visible&&f.elapsed<6.8;});
  await page.screenshot({path:path.join(fallArtifacts,prefix+'-lava.png')});
  await page.waitForFunction(()=>{const g=GAME.scene.getScene('Game');return g.finale instanceof CastleFinale&&g.finale.elapsed>=7.4&&g.player.sprite.scaleX<.9&&!g.player.shadow.visible;});
  await page.screenshot({path:path.join(fallArtifacts,prefix+'-queda.png')});
  await ready(page,'catacombs');
}
// Age each phase independently in the runner's disposable database. A long
// total duration must not mask a fresh advanced_at or catacombs_at timestamp.
const ageRun=(run,stage='forest')=>execFileSync(process.env.MURALHA_PYTHON||'python3',['-c',[
  'import sqlite3,sys,time',
  'db=sqlite3.connect(sys.argv[1]); now=time.time(); stages=["forest","castle","catacombs"]',
  'row=db.execute("SELECT start_stage FROM runs WHERE id=?",(sys.argv[2],)).fetchone()',
  'assert row, "Unknown test run"',
  'start=stages.index(row[0]); current=stages.index(sys.argv[3]); assert current>=start',
  'values={"started_at":now-(current-start+1)*905}',
  'if start==0 and current>=1: values["advanced_at"]=now-current*905',
  'if start<2 and current==2: values["catacombs_at"]=now-905',
  'db.execute("UPDATE runs SET "+",".join(key+"=?" for key in values)+" WHERE id=?",(*values.values(),sys.argv[2]))',
  'db.commit(); db.close()',
].join('\n'),process.env.MURALHA_TEST_DATA_DIR+'/jogo.sqlite3',run,stage]);
async function startMenu(page){
  await page.goto(base+'/?nointro');
  const dialog=page.getByRole('dialog');
  await dialog.getByRole('button',{name:'Continuar como convidado'}).click();
  await page.evaluate(()=>GAME.scene.getScene('Menu').go());
  await page.waitForFunction(()=>GAME.scene.isActive('Select'));
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>GAME.scene.isActive('StageSelect'));
  await page.waitForFunction(()=>!GAME.scene.getScene('StageSelect').cameras.main.fadeEffect.isRunning);
}
async function auth(page,name,register){
  await page.evaluate(()=>{ GamePortal.openLogin(); });
  const dialog=page.getByRole('dialog');
  if(register)await dialog.locator('.portal-switches button').nth(1).click();
  await dialog.getByLabel('Nome de usuário',{exact:true}).fill(name);
  await dialog.getByLabel('Senha',{exact:true}).fill('Jornada!2026');
  await dialog.locator('form button[type=submit]').click();
  await page.waitForFunction(name=>GamePortal.user?.username===name,name);
  await dialog.waitFor({state:'detached'});
}
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,
    args:['--no-sandbox','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage();
  page.setDefaultTimeout(25000);
  const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
  const check=s=>{checks.push(s);console.log('OK: '+s);};
  try{
    await startMenu(page);
    assert(await page.evaluate(()=>GamePortal.canPlayStage('forest')&&!GamePortal.canPlayStage('castle')&&!GamePortal.canPlayStage('catacombs')),'Bloqueio inicial incorreto');
    await page.keyboard.press('2');
    assert(await page.evaluate(()=>GAME.scene.isActive('StageSelect')),'Fase bloqueada iniciou por teclado');
    await page.keyboard.press('3');
    assert(await page.evaluate(()=>GAME.scene.isActive('StageSelect')),'Catacumbas bloqueadas iniciaram pelo teclado');
    await page.screenshot({path:out+'/selecao-bloqueada.png'});
    await page.keyboard.press('1');
    await page.waitForFunction(()=>GAME.scene.isActive('Difficulty'));
    await page.waitForFunction(()=>!GAME.scene.getScene('Difficulty').cameras.main.fadeEffect.isRunning);
    await page.keyboard.press('1');await ready(page,'forest');
    check('herói → fase → dificuldade; Castelo e Catacumbas bloqueados inicialmente');

    await require('./gates_checks.cjs')(page);
    check('fachada física contém jogador, dash e flancos; porta é a única passagem');
    await page.evaluate(()=>{
      const g=GAME.scene.getScene('Game');g.godMode=true;g.spawningEnabled=false;
      const frost=g.player.addPower('frost');frost.levelUp();g.player.dashLevel=2;
      g.t=900;g.startBossFight();g.boss.invuln=false;g.damageEnemy(g.boss,g.boss.hp+1,null);
    });
    await page.waitForFunction(()=>GAME.scene.getScene('Game').stageCleared);
    await page.evaluate(async()=>{
      const g=GAME.scene.getScene('Game');g.player.x=g.world.gate.x;g.player.y=g.world.gate.y+70;await g.enterCastle();
    });
    await ready(page,'castle');
    assert(await page.evaluate(()=>{
      const g=GAME.scene.getScene('Game');return g.world.entry&&Math.abs(g.player.y-g.world.entry.endY)<3&&g.player.hasPower('frost')?.level===2&&g.player.dashLevel===2&&GamePortal.canPlayStage('castle');
    }),'Chegada não saiu pela porta ou perdeu build/desbloqueio');
    await page.screenshot({path:out+'/entrada-castelo.png'});
    check('atravessar a porta libera castelo e chegada animada sai da porta interna');

    await page.evaluate(()=>{const g=GAME.scene.getScene('Game');g.godMode=false;g.player.invuln=0;g.player.takeDamage(g.player.maxHp+1);});
    await page.waitForFunction(()=>GAME.scene.isActive('End'));
    await page.keyboard.press('Enter');await ready(page,'castle');
    assert(await page.evaluate(()=>{
      const g=GAME.scene.getScene('Game');return g.startStageId==='castle'&&g.totalKills===0&&g.totalDamage===0&&g.totalTime<3&&g.player.hp===g.player.maxHp&&g.player.hasPower('frost')?.level===2;
    }),'Morte voltou à floresta, perdeu checkpoint ou reutilizou pontuação');
    check('morte reinicia fase atual com build de entrada e estatísticas de nova partida');

    await killBoss(page);await castleFall(page,'castelo');
    assert(await page.evaluate(()=>{
      const g=GAME.scene.getScene('Game');return g.world instanceof CatacombWorld&&Math.abs(g.player.y-g.world.entry.endY)<3
        &&g.player.hasPower('frost')?.level===2&&g.player.dashLevel===2&&GamePortal.canPlayStage('catacombs')
        &&g.elapsedBefore>=900&&g.t<3&&!g.finale&&!g.runSubmission&&g.player.sprite.alpha>0
        &&g.player.sprite.scaleX>=1&&g.player.sprite.angle===0&&g.player.shadow.visible&&GAME.scene.isVisible('UI');
    }),'Descida perdeu build, saída da entrada ou desbloqueio das Catacumbas');
    await page.screenshot({path:out+'/entrada-catacumbas.png'});
    check('Cavaleiro rompe o selo e a queda automática mantém build e desbloqueia Catacumbas');
    await page.evaluate(()=>{
      const g=GAME.scene.getScene('Game');g.t=900;g.startBossFight();if(!(g.boss instanceof NecromancerBoss))throw Error('Chefe final não é Necromante');
      g.boss.invuln=false;g.damageEnemy(g.boss,g.boss.hp+1,null);
    });
    await page.waitForFunction(()=>!!GAME.scene.getScene('Game').finale);
    assert(!await page.evaluate(()=>GAME.scene.isActive('End')),'Tela final apareceu antes da cutscene');
    await page.waitForFunction(()=>GAME.scene.getScene('Game').finale.elapsed>=6.7);
    await require('./finale_checks.cjs')(page);
    assert(await page.evaluate(()=>{
      const g=GAME.scene.getScene('Game'),time=g.totalTime;g.onBossDefeated();
      return g.finale instanceof SoulFinale&&g.finale.souls.length===24&&g.totalTime===time&&g.ended&&g.stageId==='catacombs';
    }),'Almas não foram libertadas ou cutscene duplicou');
    await page.screenshot({path:out+'/almas-libertadas.png'});
    await page.waitForFunction(()=>GAME.scene.isActive('End'));
    assert(await page.evaluate(()=>{const d=GAME.scene.getScene('End').d;return d.win&&d.stage==='catacombs'&&d.startStage==='castle'&&d.time>=1800;}),'Necromante não concluiu a campanha iniciada no checkpoint do Castelo');
    await page.keyboard.press('Enter');await ready(page,'castle');
    assert(await page.evaluate(()=>GAME.scene.isVisible('UI')),'HUD permaneceu escondido depois da cutscene');
    check('Necromante → almas libertadas → fim; vitória única e reinício no estágio inicial da campanha');

    await page.close();
    const account=await context.newPage();account.on('pageerror',e=>errors.push(e.message));account.setDefaultTimeout(25000);
    await account.goto(base+'/?nointro');
    await account.getByRole('dialog').getByRole('button',{name:'Continuar como convidado'}).click();
    await auth(account,'GuardiaoDaPorta',true);
    assert(await account.evaluate(()=>!GamePortal.canPlayStage('castle')&&!GamePortal.canPlayStage('catacombs')),'Progresso guest contaminou conta nova');
    await account.evaluate(()=>{ GAME.scene.start('Game',{char:'ranger',stage:'forest',difficulty:'medium'}); });
    await ready(account,'forest');
    const run=await account.evaluate(async()=>(await GAME.scene.getScene('Game').runStart).run_id);ageRun(run);
    await account.evaluate(()=>{const g=GAME.scene.getScene('Game');g.player.addPower('frost').levelUp();g.player.addRelic('twin_seal');g.player.dashLevel=3;g.player.enableSmokeDash();window.__accountProfile={key:g.metaProfileKey,run:g.metaRunId};});
    await killBoss(account);
    await account.waitForFunction(()=>GAME.scene.getScene('Game').stageCleared&&!GAME.scene.getScene('Game').cinematic);
    await account.evaluate(async()=>{const g=GAME.scene.getScene('Game');g.player.x=g.world.gate.x;g.player.y=g.world.gate.y+70;await g.enterCastle();});
    await ready(account,'castle');ageRun(run,'castle');
    assert(await account.evaluate(()=>{const g=GAME.scene.getScene('Game'),c=g.phaseCheckpoint;return c.metaProfileKey===g.metaProfileKey&&c.player.powers.some(w=>w.id==='frost'&&w.level===2)&&c.player.relics.includes('twin_seal');}),'Checkpoint real deve registrar perfil e build de entrada');
    assert(await account.evaluate(async id=>(await GAME.scene.getScene('Game').runStart).run_id===id,run),'Primeira passagem autenticada trocou runId');
    await killBoss(account);await castleFall(account,'conta-castelo');
    assert(await account.evaluate(async id=>(await GAME.scene.getScene('Game').runStart).run_id===id,run),'Segunda passagem autenticada trocou runId');
    const arrival=await account.evaluate(()=>{const g=GAME.scene.getScene('Game'),p=g.player;return {elapsed:g.elapsedBefore,time:g.t,frost:p.hasPower('frost')?.level,relic:p.relics.includes('twin_seal'),dash:p.dashLevel,smoke:p.dashSmoke,profile:g.metaProfileKey===window.__accountProfile.key,identity:g.metaRunId===window.__accountProfile.run,practice:g.isPractice,error:g.saveError,hud:GAME.scene.isVisible('UI')};});
    assert(arrival.elapsed>=1800&&arrival.time<3&&arrival.frost===2&&arrival.relic&&arrival.dash===3&&arrival.smoke&&arrival.profile&&arrival.identity&&!arrival.practice&&!arrival.error&&arrival.hud,'Queda autenticada perdeu build, relíquia, dash, perfil, relógio ou classificação: '+JSON.stringify(arrival));
    // Inspect the arrival before the synchronous disposable-DB clock edit:
    // Python startup can take several seconds while Phaser keeps running.
    ageRun(run,'catacombs');
    await account.evaluate(()=>{
      const g=GAME.scene.getScene('Game');g.godMode=true;g.t=900;g.startBossFight();g.boss.invuln=false;g.damageEnemy(g.boss,g.boss.hp+1,null);
    });
    await account.waitForFunction(()=>GAME.scene.isActive('End'));
    const victory=await account.evaluate(()=>GAME.scene.getScene('Game').runSubmission);
    assert(victory.saved&&victory.ranked,'Vitória autenticada das três fases não foi salva no ranking');
    assert(await account.evaluate(()=>{const d=GAME.scene.getScene('End').d;return d.win&&d.stage==='catacombs'&&d.startStage==='forest'&&d.time>=2700;}),'Resultado autenticado perdeu fase final ou duração das três fases');
    await account.reload();
    await account.waitForFunction(()=>GamePortal.user?.username==='GuardiaoDaPorta'&&GamePortal.canPlayStage('castle')&&GamePortal.canPlayStage('catacombs')&&GamePortal.getProgress().catacombs_clears>=1);
    check('campanha autenticada mantém runId nas duas passagens e vitória final persiste com três relógios válidos');
    await account.evaluate(()=>{ GAME.scene.start('StageSelect',{char:'ranger'}); });
    await account.waitForFunction(()=>GAME.scene.isActive('StageSelect'));
    await account.waitForFunction(()=>!GAME.scene.getScene('StageSelect').cameras.main.fadeEffect.isRunning);
    await account.screenshot({path:out+'/selecao-liberada.png'});
    await account.keyboard.press('2');await account.waitForFunction(()=>GAME.scene.isActive('Difficulty'));
    await account.waitForFunction(()=>!GAME.scene.getScene('Difficulty').cameras.main.fadeEffect.isRunning);
    await account.keyboard.press('1');await ready(account,'castle');
    await account.evaluate(()=>{
      const g=GAME.scene.getScene('Game');g.spawningEnabled=false;
      const e=g.enemies.spawn('skel_warrior',g.player.x+80,g.player.y,1);g.damageEnemy(e,100,null);g.player.invuln=0;g.player.takeDamage(g.player.maxHp+1);
    });
    await account.waitForFunction(()=>GAME.scene.isActive('End'));
    const saved=await account.evaluate(()=>GAME.scene.getScene('Game').runSubmission);
    assert(saved.saved&&saved.ranked,'Estatísticas reais da conta não salvas');
    await account.reload();await account.waitForFunction(()=>GamePortal.stats?.kills>=1&&GamePortal.canPlayStage('castle'));
    await account.evaluate(()=>{ GamePortal.openLogin(); });
    await account.getByRole('dialog').waitFor();await account.screenshot({path:out+'/perfil.png'});
    check('conta guarda fase e estatísticas no servidor após recarregar; acesso direto ao castelo liberado');
    assert(!errors.length,errors.join('; '));
    console.log(JSON.stringify({ok:true,checks:checks.length,pageErrors:errors.length,artifacts:out}));
  }catch(e){await context.pages().at(-1)?.screenshot({path:out+'/falha.png'}).catch(()=>{});console.error('PAGE ERRORS',errors);throw e;}
  finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
