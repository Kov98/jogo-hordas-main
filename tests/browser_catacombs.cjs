// Full expansion in real Phaser. Only accounts/DB belonging to this runner exist.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.MURALHA_TEST_URL;
if(!base)throw Error('Execute tests/browser_accounts.py --catacombs');
const artifacts=path.join(require('node:os').tmpdir(),'muralha-catacumbas');fs.mkdirSync(artifacts,{recursive:true});
const fallArtifacts=path.join(__dirname,'../docs/feixe-e-queda/capturas/browser-catacombs');fs.mkdirSync(fallArtifacts,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.setDefaultTimeout(40000);page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);});
 const capture=name=>page.screenshot({path:path.join(artifacts,name+'.png')});
 const ready=stage=>page.waitForFunction(s=>window.GAME?.scene.isActive('Game')&&GAME.scene.getScene('Game').gameReady&&GAME.scene.getScene('Game').stageId===s&&!GAME.scene.getScene('Game').cinematic&&!GAME.scene.getScene('Game').cameras.main.fadeEffect.isRunning,stage);
 const move=async(kind,index=0)=>page.evaluate(({kind,index})=>{
  const g=GAME.scene.getScene('Game'),target=kind==='altar'?g.exploration.altars[index]:kind==='symbol'?g.exploration.symbols[index]:kind==='shrine'?g.exploration.shrine:g.world.gate;
  g.player.x=target.x;g.player.y=target.y+(kind==='exit'?80:0);g.world.constrain(g.player);g.player.sprite.setPosition(g.player.x,g.player.y);g.cameras.main.centerOn(g.player.x,g.player.y);
 },{kind,index});
 const fatal=async()=>page.evaluate(()=>{
  const g=GAME.scene.getScene('Game');g.godMode=true;g.spawningEnabled=false;g.pendingLevels=0;g.levelUpOpen=false;g.t=900;g.startBossFight();g.boss.invuln=false;g.damageEnemy(g.boss,g.boss.hp+1);
 });
 const observeFall=async()=>{
  await page.waitForFunction(()=>GAME.scene.getScene('Game').finale instanceof CastleFinale);
  assert(await page.evaluate(()=>{const g=GAME.scene.getScene('Game');return g.stageId==='castle'&&!!g.cinematic&&!g.ended&&!g.runSubmission&&!GAME.scene.isActive('End');}),'Castle fall must block play without submitting victory');
  await page.waitForFunction(()=>{const f=GAME.scene.getScene('Game').finale;return f instanceof CastleFinale&&f.opening>120&&f.lava.visible&&f.elapsed<6.8;});
  await page.screenshot({path:path.join(fallArtifacts,'castelo-lava.png')});
  await page.waitForFunction(()=>{const g=GAME.scene.getScene('Game');return g.finale instanceof CastleFinale&&g.finale.elapsed>=7.4&&g.player.sprite.scaleX<.9&&!g.player.shadow.visible;});
  await page.screenshot({path:path.join(fallArtifacts,'castelo-queda.png')});
  await ready('catacombs');
  assert(await page.evaluate(()=>{const g=GAME.scene.getScene('Game'),p=g.player;return !g.finale&&!g.ended&&!g.runSubmission&&p.sprite.visible&&p.sprite.alpha>0&&p.sprite.scaleX>=1&&p.sprite.angle===0&&p.shadow.visible&&g.cameras.main._follow===p.sprite&&GAME.scene.isVisible('UI')&&!GAME.scene.isActive('FinaleOverlay');}),'Arrival must restore hero, camera and HUD after the fall');
 };
 try{
  // Keep the former runner switch as an alias for the restored automatic fall.
  if(process.env.MURALHA_FALL_FOCUS==='1'||process.env.MURALHA_STAIRS_FOCUS==='1'){
   await page.goto(base+'/?char=mage&god&nointro&stage=castle');await ready('castle');
   await page.evaluate(()=>{GAME.scene.getScene('Game').spawningEnabled=false;});
   await fatal();await observeFall();
   assert(await page.evaluate(()=>{
    const g=GAME.scene.getScene('Game');g.requestInteract=true;g.keys.E._justDown=true;g.keys.ENTER._justDown=true;
    const first=g.readInput(),second=g.readInput();return first.interact&&!second.interact&&!g.requestInteract&&!g.keys.E._justDown&&!g.keys.ENTER._justDown;
   }),'Latch and both Phaser key flags must be consumed in one frame');
   assert.deepEqual(errors,[]);console.log('OK: focused Castle lava and automatic fall to Catacombs');return;
  }
  await page.goto(base+'/?char=channeler&god&nointro');await ready('forest');
  await page.evaluate(()=>{const g=GAME.scene.getScene('Game');g.spawningEnabled=false;g.player.level=100;g.pendingLevels=0;});
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>Sfx.ctx?.state==='running');
  assert(await page.evaluate(()=>{const g=GAME.scene.getScene('Game');Sfx.muted=false;g.soundscape.update(.05);return Sfx.ctx&&g.soundscape.loops.length===2;}));
  await page.keyboard.press('m');
  await page.waitForFunction(()=>Sfx.muted);
  const mutedState=await page.evaluate(()=>({muted:Sfx.muted,gain:Sfx.master.gain.value,loops:GAME.scene.getScene('Game').soundscape.loops.length}));
  assert(mutedState.muted&&mutedState.gain===0&&mutedState.loops===0,JSON.stringify(mutedState));
  await page.keyboard.press('m');
  await page.waitForFunction(()=>!Sfx.muted);
  console.log('OK: audio starts after gesture, has two loops and M silences immediately');

  await move('altar');const hp=await page.evaluate(()=>GAME.scene.getScene('Game').player.hp);
  await page.keyboard.press('e');await page.getByRole('dialog',{name:'Altar de oferendas'}).waitFor();
  assert(await page.evaluate(()=>GAME.scene.isPaused('Game')&&GAME.scene.getScene('Game').explorationOpen&&GAME.scene.getScene('Game').soundscape.loops.length===0));
  await capture('altar');await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  assert.equal(await page.evaluate(()=>GAME.scene.getScene('Game').player.hp),hp);
  await page.keyboard.press('e');await page.getByRole('dialog',{name:'Altar de oferendas'}).waitFor();
  await page.getByRole('dialog').getByRole('button',{name:/^1\./}).click();
  assert(await page.evaluate(before=>{const g=GAME.scene.getScene('Game');return g.player.relics.length===1&&g.player.hp===before-g.player.maxHp*.25&&g.exploration.altars[0].used&&!g.explorationOpen;},hp));
  console.log('OK: E opens altar, cancellation is free and reward costs health exactly once');

  for(let i=0;i<3;i++){
   await move('symbol',i);await page.keyboard.press('e');
   // Each teleport/press represents a separate player interaction. Let Phaser
   // consume it before moving to the next symbol, even on a slow renderer.
   await page.waitForFunction(count=>GAME.scene.getScene('Game').exploration.getStatus().symbolsFound>=count,i+1);
  }
  assert.equal(await page.evaluate(()=>GAME.scene.getScene('Game').exploration.getStatus().symbolsFound),3);
  await move('shrine');await page.keyboard.press('e');
  await page.waitForFunction(()=>GAME.scene.getScene('Game').exploration.secretState==='active');
  await capture('guardiao-secreto');
  assert(await page.evaluate(()=>{
   const g=GAME.scene.getScene('Game'),e=g.exploration.encounter.enemy,before=e.hp;
   g.damageEnemy(e,100);if(e.hp!==before-100)return false;g.damageEnemy(e,e.hp+1);
   return g.exploration.secretState==='defeated'&&!g.stageCleared&&!g.ended&&MetaProgress.unlocked().skins.includes('oathbound');
  }));
  console.log('OK: three symbols summon optional Guardian; real player damage unlocks unique reward without clearing stage');

  const evolutionIds=['fire_hurricane','celestial_judgment','plasma_storm','meteor_cataclysm'];
  for(const id of evolutionIds){
   const damage=await page.evaluate(id=>{
    const g=GAME.scene.getScene('Game'),p=g.player;g.enemies.killAllSilently();g.enemyShots.clear();g.hazards.length=0;
    for(const power of p.powers)power.destroy();p.powers=[];for(const shot of g.pShots.items)if(shot.live)g.pShots.kill(shot);
    p.x=2000;p.y=3000;p.sprite.setPosition(p.x,p.y);g.cameras.main.centerOn(p.x,p.y);
    const recipe=PROGRESSION_RECIPES.find(r=>r.result===id),w=p.addPower(recipe.ingredients[0]);while(!w.maxed)w.levelUp();
    if(!p.passives[recipe.passive])p.addPassive(recipe.passive);g.t=400;
    if(!g.progression.applyRecipe(id))throw Error('Recipe not applied: '+id);
    const before=g.totalDamage;
    for(const dy of [-50,0,50]){const e=g.enemies.spawn('forest_rootling',p.x+125,p.y+dy,1);e.hp=e.maxHp=100000;e.def={...e.def,speed:0};}
    g.botInput={x:0,y:0,dash:false};for(let i=0;i<140;i++)g.update(i*50,50);g.botInput=null;
    return g.totalDamage-before;
   },id);
   assert(damage>0,id+' must deal real damage');await capture(id);
  }
  await page.evaluate(ids=>{const g=GAME.scene.getScene('Game');for(const w of g.player.powers)w.destroy();g.player.powers=[];for(const id of ids)g.player.addPower(id);g.pendingLevels=0;g.player.dashLevel=3;g.player.dashSmoke=true;window.__relics=[...g.player.relics];},evolutionIds);
  console.log('OK: all four chest evolutions consume bases, deal real damage and unlock discoveries');

  await fatal();await page.waitForFunction(()=>GAME.scene.getScene('Game').stageCleared&&!GAME.scene.getScene('Game').cinematic);
  await move('exit');await page.keyboard.press('e');await ready('castle');
  assert(await page.evaluate(ids=>{const g=GAME.scene.getScene('Game');return g.player.relics.join(',')===window.__relics.join(',')&&ids.every(id=>g.player.hasPower(id))&&g.player.dashSmoke&&g.player.dashLevel===3;},evolutionIds));
  await page.evaluate(()=>{const g=GAME.scene.getScene('Game');g.spawningEnabled=false;window.__castleProfile={key:g.metaProfileKey,run:g.metaRunId};});
  await fatal();await observeFall();
  assert(await page.evaluate(ids=>{
   const g=GAME.scene.getScene('Game');g.spawningEnabled=false;
   return g.world instanceof CatacombWorld&&g.player.relics.join(',')===window.__relics.join(',')&&ids.every(id=>g.player.hasPower(id))&&g.player.dashSmoke&&g.player.dashLevel===3&&g.elapsedBefore>=1800&&g.t<2&&g.metaProfileKey===window.__castleProfile.key&&g.metaRunId===window.__castleProfile.run&&GAME.scene.isVisible('UI')&&g.stage.enemyIds.every(id=>ENEMIES[id].stage==='catacombs');
  },evolutionIds));await capture('catacumbas');
  console.log('OK: Forest to Castle to Catacombs, lava fall and build/relic/dash preserved; Castle cannot submit victory');

  await page.evaluate(()=>{
   const g=GAME.scene.getScene('Game');g.player.invuln=100;g.player.x=1100;g.player.y=1160;g.player.sprite.setPosition(g.player.x,g.player.y);g.cameras.main.centerOn(g.player.x,g.player.y);
   g.spawningEnabled=true;g.t=610;for(let i=0;i<100&&g.encounters.spawned.filter(Boolean).length<2;i++)g.encounters.update(.05);
  });
  assert(await page.evaluate(()=>{const g=GAME.scene.getScene('Game');return g.encounters.spawned.filter(Boolean).length===2&&g.enemies.pool.filter(e=>e.alive&&e.isMiniBoss).every(e=>e.def.stage==='catacombs');}));
  await page.evaluate(()=>{const g=GAME.scene.getScene('Game');g.spawningEnabled=false;g.enemies.killAllSilently();g.hazards.length=0;g.pendingLevels=0;});
  await fatal();assert(await page.evaluate(()=>GAME.scene.getScene('Game').boss instanceof NecromancerBoss));
  await page.waitForFunction(()=>GAME.scene.isActive('End'));
  assert(await page.evaluate(()=>GAME.scene.getScene('End').d.win&&GAME.scene.getScene('End').d.stage==='catacombs'));
  await capture('vitoria-necromante');
  console.log('OK: Catacombs has its own minibosses and only Necromancer triggers campaign victory');

  await page.evaluate(()=>{GAME.scene.getScene('End').menu();});
  await page.waitForFunction(()=>GAME.scene.isActive('Menu'));await page.keyboard.press('c');
  await page.getByRole('dialog',{name:'Coleção e desafios'}).waitFor();
  await capture('colecao');assert(await page.getByRole('dialog').getByText('Juramentado',{exact:true}).count()>0);
  await page.getByRole('button',{name:'Voltar',exact:true}).click();
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,pageErrors:0,artifacts}));
 }catch(error){await capture('falha').catch(()=>{});console.error(errors);throw error;}
 finally{await browser.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
