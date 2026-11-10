const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path');
const base=process.env.MURALHA_TEST_URL;
if(!base)throw Error('Use browser_accounts.py --journey-regressions');
const blankProgress={castle_unlocked:false,forest_clears:0,castle_clears:0,catacombs_unlocked:false,catacombs_clears:0};
const blankStats={runs:0,victories:0,kills:0,damage:0,points:0,best_points:0};
const artifacts=path.join(__dirname,'../docs/feixe-e-queda/capturas/journey-regressions');fs.mkdirSync(artifacts,{recursive:true});
const ready=(page,stage)=>page.waitForFunction(stage=>{const g=window.GAME?.scene.getScene('Game');return g?.gameReady&&GAME.scene.isActive('Game')&&g.stageId===stage&&!g.cinematic&&!g.cameras.main.fadeEffect.isRunning;},stage,{timeout:40000});
const killBoss=page=>page.evaluate(()=>{
  const g=GAME.scene.getScene('Game');g.godMode=true;g.spawningEnabled=false;g.pendingLevels=0;g.t=900;g.startBossFight();g.boss.invuln=false;g.damageEnemy(g.boss,g.boss.hp+1,null);
});
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  const failures=[],errors=[],network=[];let checks=0;
  const watch=page=>{
    page.on('pageerror',e=>errors.push(e.message));
    page.on('requestfailed',r=>network.push({url:r.url(),error:r.failure()?.errorText}));
    page.on('response',r=>{if(r.status()>=400)network.push({url:r.url(),status:r.status()});});
  };
  let p;
  const check=(ok,msg)=>{checks++;if(!ok)failures.push(msg);console.log((ok?'OK: ':'FAIL: ')+msg);};
  try{
    p=await b.newPage({viewport:{width:1280,height:720}});watch(p);
    await p.goto(base+'/?char=mage&god&nointro&stage=castle');
    await ready(p,'castle');await killBoss(p);
    check(await p.evaluate(()=>{const g=GAME.scene.getScene('Game'),first=g.castleVictory;g.damageEnemy(g.boss,g.boss.maxHp+1,null);g.onBossDefeated();return !!g.cinematic&&!g.ended&&!g.runSubmission&&!GAME.scene.isActive('End')&&first===g.castleVictory;}),
      'Morte real do Cavaleiro bloqueia combate e inicia uma única queda sem vitória');
    await p.waitForFunction(()=>GAME.scene.getScene('Game').finale instanceof CastleFinale);
    const castleSpeed=await p.evaluate(()=>{const g=GAME.scene.getScene('Game'),t=g.totalTime,points=g.points,before=g.finale.elapsed;g.update(0,1000);return {elapsed:g.finale.elapsed-before,time:g.totalTime===t,points:g.points===points};});
    check(castleSpeed.elapsed>=.99&&castleSpeed.time&&castleSpeed.points,'Queda usa tempo real com FPS baixo sem gerar tempo ou pontos');
    for(const key of ['g','Escape','p','e','Space'])await p.keyboard.press(key);
    check(await p.evaluate(()=>{const g=GAME.scene.getScene('Game');return !!g.cinematic&&!GamePortal.dialogOpen&&!GAME.scene.isPaused('Game')&&!g.scene.get('UI').paused&&!g.interactNearby()&&!g.requestDash&&!g.requestInteract;}),'Queda bloqueia interação, dash, grimório e pausa');
    await p.waitForFunction(()=>{const f=GAME.scene.getScene('Game').finale;return f instanceof CastleFinale&&f.opening>120&&f.lava.visible&&f.elapsed<6.8;});
    await p.screenshot({path:path.join(artifacts,'castelo-lava.png')});
    await p.waitForFunction(()=>{const g=GAME.scene.getScene('Game');return g.finale instanceof CastleFinale&&g.finale.elapsed>=7.4&&g.player.sprite.scaleX<.9&&!g.player.shadow.visible;});
    await p.screenshot({path:path.join(artifacts,'castelo-queda.png')});
    await ready(p,'catacombs');
    check(await p.evaluate(()=>{const g=GAME.scene.getScene('Game'),p=g.player;return g.elapsedBefore>=900&&!g.ended&&!g.finale&&!g.runSubmission&&GAME.scene.isVisible('UI')&&p.sprite.visible&&p.sprite.alpha>0&&p.sprite.scaleX>=1&&p.sprite.angle===0&&p.shadow.visible;}),'Queda chega automaticamente ao Inferno e restaura herói e HUD');
    await killBoss(p);
    await p.waitForFunction(()=>!!GAME.scene.getScene('Game').finale);
    await p.keyboard.press('g');
    check(!await p.evaluate(()=>GamePortal.dialogOpen),'Grimório não cobre a cutscene pelo atalho G');
    if(await p.evaluate(()=>GamePortal.dialogOpen))await p.keyboard.press('Escape');
    const speed=await p.evaluate(()=>{const g=GAME.scene.getScene('Game'),t=g.totalTime,before=g.finale.elapsed;g.update(0,1000);return {elapsed:g.finale.elapsed-before,time:g.totalTime===t};});
    check(speed.elapsed>=.99&&speed.time,'Cutscene usa tempo real com FPS baixo e não gera tempo de partida');

    // Restart during a real CastleFinale, then force the old object beyond its
    // completion point. Its callback must not touch the replacement campaign.
    await p.evaluate(()=>GAME.scene.getScene('Game').scene.restart({char:'mage',stage:'castle'}));await ready(p,'castle');
    await killBoss(p);await p.waitForFunction(()=>GAME.scene.getScene('Game').finale instanceof CastleFinale);
    await p.evaluate(()=>{const g=GAME.scene.getScene('Game');window.__cancelledFinale=g.finale;window.__cancelledVictory=g.castleVictory;window.__cancelledInitialization=g.initialization;g.scene.restart({char:'mage',stage:'forest'});});
    await ready(p,'forest');
    check(await p.evaluate(async()=>{window.__cancelledFinale.update(30);const cancelled=await window.__cancelledVictory;const g=GAME.scene.getScene('Game');return cancelled===false&&g.initialization!==window.__cancelledInitialization&&g.stageId==='forest'&&g.gameReady&&!g.cinematic&&!g.finale&&!g.stageCleared&&!GAME.scene.isActive('FinaleOverlay');}),'Shutdown cancela queda e callback antigo não reinicia uma nova partida');

    await p.close();
    const a=await b.newPage();watch(a);
    let current={user:{id:701,username:'RevisionTester',role:'player'},csrf:'revision-csrf',
      settings:{healthDropChance:.05,bossTime:900,spawnBaseRate:1.1,spawnGrowth:.0115,maxEnemies:240},
      progress:{...blankProgress},stats:{...blankStats}};
    let holdNext=false,captured,release,runStage='forest';
    await a.route('**/api/**',async route=>{
      const path=new URL(route.request().url()).pathname;
      if(path==='/api/session'){
        const data=structuredClone(current);
        if(holdNext){holdNext=false;captured();await new Promise(resolve=>{release=resolve;});}
        return route.fulfill({json:data});
      }
      if(path==='/api/runs/advance'){
        const target=route.request().postDataJSON().stage;
        if(!['castle','catacombs'].includes(target))throw Error('Avanço sem alvo explícito');
        runStage=target;current.progress={...blankProgress,castle_unlocked:true,forest_clears:1,
          castle_clears:target==='catacombs'?1:0,catacombs_unlocked:target==='catacombs'};
      }
      if(path==='/api/runs/finish'){
        current.progress={...current.progress,catacombs_clears:1};
        current.stats={runs:1,victories:1,kills:12,damage:450,points:8000,best_points:8000};
      }
      return route.fulfill({json:{saved:true,ranked:true,run_id:'fixture',stage:runStage,progress:current.progress,stats:current.stats}});
    });
    await a.goto(base+'/?nointro');
    await a.waitForFunction(()=>GamePortal.user?.username==='RevisionTester');
    for(const step of [{endpoint:'advance',target:'castle'},{endpoint:'advance',target:'catacombs'},{endpoint:'finish'}]){
      const {endpoint,target}=step;
      holdNext=true;const arrived=new Promise(resolve=>{captured=resolve;});
      await a.evaluate(()=>window.dispatchEvent(new Event('focus')));await arrived;
      await a.evaluate(({endpoint,target})=>endpoint==='advance'?GamePortal.advanceRun('fixture',target):GamePortal.finishRun({run_id:'fixture',victory:true}),step);
      const response=a.waitForResponse(r=>new URL(r.url()).pathname==='/api/session');release();await(await response).finished();
      await a.evaluate(()=>new Promise(requestAnimationFrame));
      const state=await a.evaluate(()=>({progress:GamePortal.getProgress(),stats:GamePortal.stats,csrf:GamePortal.csrf}));
      check(state.progress.castle_unlocked&&state.progress.forest_clears===1&&state.csrf==='revision-csrf'
        &&(target==='castle'||state.progress.catacombs_unlocked&&state.progress.castle_clears===1)
        &&(endpoint!=='finish'||state.stats.kills===12&&state.progress.catacombs_clears===1),
        'Sessão atrasada não regride perfil após '+endpoint+(target?' → '+target:''));
    }
    if(errors.length)failures.push(...errors);
    if(failures.length)throw Error(failures.join('\n'));
    console.log(JSON.stringify({ok:true,checks,pageErrors:errors.length,artifacts}));
  }catch(error){
    console.error('JOURNEY NETWORK',JSON.stringify(network));
    console.error('JOURNEY DIAGNOSTIC',JSON.stringify(await p?.evaluate(errors=>{
      const g=window.GAME?.scene.getScene('Game');return {errors,stage:g?.stageId,ready:g?.gameReady,cinematic:g?.cinematic,scenes:window.GAME?.scene.getScenes(true).map(s=>s.sys.settings.key),focus:document.hasFocus(),dialog:window.GamePortal?.dialogOpen};
    },errors).catch(()=>({errors}))));throw error;
  }finally{await b.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
