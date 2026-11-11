// Visual integration in real Phaser; the Python runner owns the disposable DB.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.MURALHA_TEST_URL;
if(!base)throw Error('Execute tests/browser_accounts.py --inferno');
const artifacts=path.join(__dirname,'../docs/portal-e-legiao/capturas/inferno');
fs.mkdirSync(artifacts,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,
  args:['--no-sandbox','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],checks=[];
 page.setDefaultTimeout(40000);page.on('pageerror',error=>errors.push(error.message));
 const check=text=>{checks.push(text);console.log('OK: '+text);};
 const capture=name=>page.screenshot({path:path.join(artifacts,name+'.png')});
 const active=key=>page.waitForFunction(key=>window.GAME?.scene.isActive(key)&&!GAME.scene.getScene(key).cameras.main.fadeEffect.isRunning,key);
 const ready=()=>page.waitForFunction(()=>window.GAME?.scene.isActive('Game')&&GAME.scene.getScene('Game').gameReady&&!GAME.scene.getScene('Game').cinematic);
 const move=(x,y)=>page.evaluate(({x,y})=>{
  const g=GAME.scene.getScene('Game');g.player.x=x;g.player.y=y;g.world.constrain(g.player);
  g.player.sprite.setPosition(g.player.x,g.player.y);g.cameras.main.stopFollow();g.cameras.main.centerOn(g.player.x,g.player.y);
 },{x,y});
 try{
  // The old storage schema must still unlock the newly presented third phase.
  await page.addInitScript(()=>{
   if(!localStorage.getItem('muralha.guest.progress.v1'))localStorage.setItem('muralha.guest.progress.v1',JSON.stringify({castle_unlocked:true,forest_clears:1,castle_clears:1,catacombs_unlocked:true,catacombs_clears:2}));
  });
  await page.goto(base+'/?nointro');await active('Menu');
  const guest=page.getByRole('button',{name:'Continuar como convidado',exact:true});if(await guest.count())await guest.click();
  await page.evaluate(()=>{GAME.scene.getScene('Menu').scene.start('StageSelect',{char:'channeler',stage:'catacombs'});});
  await active('StageSelect');
  assert(await page.evaluate(()=>{
   const s=GAME.scene.getScene('StageSelect');return s.cards[2].title==='INFERNO'&&s.cards[2].status.text==='ENTRAR NO INFERNO'&&GamePortal.getProgress().catacombs_clears===2;
  }));
  await capture('selecao-inferno');check('legacy third-stage progress unlocks Inferno and keeps past clears');
  await page.keyboard.press('3');await active('Difficulty');await page.keyboard.press('1');await ready();
  assert(await page.evaluate(()=>{const g=GAME.scene.getScene('Game');g.godMode=true;g.spawningEnabled=false;g.pendingLevels=0;return g.stageId==='catacombs'&&g.stage.shortName==='Inferno'&&g.world instanceof CatacombWorld;}));
  await move(2000,3450);await capture('entrada-inferno');
  await move(1100,1160);
  await page.evaluate(()=>{
   const g=GAME.scene.getScene('Game');g.enemies.killAllSilently();
   for(const [i,id]of CATACOMB_ENEMY_IDS.entries()){
    const e=g.enemies.spawn(id,800+(i%4)*200,950+Math.floor(i/4)*170,1);
    if(!e)throw Error('Missing demon '+id);e.hp=e.maxHp=100000;e.def={...e.def,speed:0};
   }
  });
  await capture('fortaleza-e-demonios');
  assert(await page.evaluate(()=>{
   const g=GAME.scene.getScene('Game');return CATACOMB_ENEMY_IDS.length===11&&g.enemies.pool.filter(e=>e.alive).length===11&&g.stage.bossName==='Arquidemônio das Cinzas';
  }));
  check('fortress entrance, chains, fire and all eleven demon species render in real Phaser');
  for(const id of ['cyclone','radiant_beam'])for(const level of [1,8]){
   const result=await page.evaluate(({id,level})=>{
    const g=GAME.scene.getScene('Game'),p=g.player;if(g.scene.isPaused())g.scene.resume();
    for(const w of p.powers)w.destroy();p.powers=[];g.enemies.killAllSilently();g.enemyShots.clear();g.hazards.length=0;g.pendingLevels=0;
    p.x=2000;p.y=2000;p.sprite.setPosition(p.x,p.y);g.cameras.main.centerOn(p.x,p.y);g.cameras.main.setZoom(1);
    const w=p.addPower(id);while(w.level<level)w.levelUp();
    for(const dy of [-30,0,30]){const e=g.enemies.spawn('crypt_sentinel',p.x+65,p.y+dy,1);e.hp=e.maxHp=100000;e.def={...e.def,speed:0};}
    const before=g.totalDamage;g.botInput={x:0,y:0,dash:false};
    // Include the normal 0.4 s initial cast delay, then a damaging active pulse.
    for(let step=0;step<18;step++)g.update(step*50,50);
    g.botInput=null;g.scene.pause();return {damage:g.totalDamage-before,live:id==='cyclone'?w.state.vortices.some(v=>v.life>0):w.state.life>0,
     beam:id==='radiant_beam'?{rotation:w.state.sprite.rotation,x:w.state.sprite.x,y:w.state.sprite.y,playerX:p.x,playerY:p.y}:null};
   },{id,level});
   assert(result.damage>0&&result.live,id+' '+level+' must render while dealing real damage: '+JSON.stringify(result));
   if(result.beam){
    assert(Math.abs(Math.abs(result.beam.rotation)-Math.PI/2)<.01,'Light column must be vertical');
    assert(Math.abs(result.beam.x-result.beam.playerX)>20,'Light must land on its target instead of originating on the hero');
   }
   await capture(id+'-nivel-'+level);
  }
  check('tornado and light beam render and deal real damage at levels one and eight');
  await page.evaluate(()=>{
   const g=GAME.scene.getScene('Game');g.scene.resume();for(const w of g.player.powers)w.destroy();g.player.powers=[];
   g.enemies.killAllSilently();g.pendingLevels=0;g.t=g.bossTime-.08;
   g.update(0,50);if(g.bossStarted)throw Error('Inferno boss spawned before its scheduled time');
   g.update(50,50);if(!g.bossStarted)throw Error('Inferno boss missing after crossing its scheduled time');
  });
  await page.waitForFunction(()=>GAME.scene.getScene('Game').boss.state!=='intro');
  assert(await page.evaluate(()=>{
   const g=GAME.scene.getScene('Game'),v=g.cameras.main.worldView,b=g.boss,p=g.player;
   return v.contains(b.x,b.y)&&v.contains(p.x,p.y)&&b.sprite.alpha>0;
  }),'Natural boss camera must contain both the Archdemon and the hero');
  await capture('arquidemonio');
  assert(await page.evaluate(()=>GAME.scene.getScene('Game').boss.data.name==='Arquidemônio das Cinzas'));
  await page.evaluate(()=>{const g=GAME.scene.getScene('Game');g.boss.invuln=false;g.damageEnemy(g.boss,g.boss.hp+1);});
  await page.waitForFunction(()=>GAME.scene.getScene('Game').finale?.elapsed>=2.6);
  await capture('correntes-rompidas');
  await page.waitForFunction(()=>GAME.scene.isActive('End'));
  assert(await page.evaluate(()=>{const e=GAME.scene.getScene('End');return e.d.win&&e.d.stage==='catacombs'&&e.children.list.some(o=>o.type==='Text'&&o.text?.includes('INFERNO'));}));
  await capture('vitoria-inferno');check('Archdemon defeat breaks the chains and finishes with Inferno result');
  await page.reload();await active('Menu');
  assert(await page.evaluate(()=>GamePortal.canPlayStage('catacombs')&&GamePortal.getProgress().catacombs_clears===3));
  check('new Inferno victory persists alongside historical third-stage clears');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,checks:checks.length,pageErrors:0,artifacts}));
 }catch(error){await capture('falha').catch(()=>{});console.error('PAGE ERRORS',errors);throw error;}
 finally{await browser.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
