const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { EventEmitter } = require('node:events');
const ctx = vm.createContext({ console, Math, Set, Map, Symbol, URLSearchParams, location: { search: '' },
  Phaser: { Scene: class {}, BlendModes: { ADD: 1 } }, Sfx: { play() {} }, SPR: { canvas() {} } });
const run = code => vm.runInContext(code, ctx);
for (const file of ['config', 'util', 'data']) run(fs.readFileSync(path.join(__dirname, '../js/' + file + '.js'), 'utf8'));
run('let ENEMY_UID=1; const FOREST_BOSS={name:"Forest"},FOREST_ENEMY_IDS=[],FOREST_EVENTS=[],CATACOMB_ENEMY_IDS=[],CATACOMB_EVENTS=[];');
for (const file of ['boss', 'catacombs-boss', 'stages', 'player', 'finale', 'game']) run(fs.readFileSync(path.join(__dirname, '../js/' + file + '.js'), 'utf8'));

// Load Phaser's real Fade effect without booting its DOM-dependent entry point.
const phaserSource=fs.readFileSync(path.join(__dirname,'../js/phaser.min.js'),'utf8');
const fadeSource=phaserSource.replace(/i\(85454\)\}\)\(\)\)\);$/, 'i(5020)})()));');
assert.notEqual(fadeSource,phaserSource,'the bundled Phaser entry point must be located');
const phaserContext=vm.createContext({module:{exports:{}},exports:{}});
vm.runInContext(fadeSource,phaserContext);
const FadeEffect=phaserContext.module.exports;

function display(x=0,y=0) {
  const data={x,y,alpha:1,scaleX:1,scaleY:1,rotation:0,visible:true,tint:null,destroyed:false,lines:0,
    anims:{pause(){},resume(){},stop(){},isPlaying:true}};
  const proxy=new Proxy(data,{get(t,k){
    if(k in t)return t[k];
    return (...args)=>{
      if(k==='setPosition'){t.x=args[0];t.y=args[1];}
      if(k==='setAlpha')t.alpha=args[0];
      if(k==='setScale'){t.scaleX=args[0];t.scaleY=args[1]??args[0];}
      if(k==='setVisible')t.visible=args[0];
      if(k==='setRotation')t.rotation=args[0];
      if(k==='setAngle')t.rotation=args[0]*Math.PI/180;
      if(k==='setTint')t.tint=args[0];
      if(k==='setText')t.text=args[0];
      if(k==='clearTint')t.tint=null;
      if(k==='destroy')t.destroyed=true;
      if(k==='lineTo')t.lines++;
      return proxy;
    };
  }});
  return proxy;
}
function fixture(stage='castle') {
  ctx.GamePortal={ready:new Promise(()=>{}),dialogOpen:false,user:{id:7},advanceRun:async()=>({stage:'catacombs'})};
  const g=run('new GameScene()'), tweens=[], scheduled=[];
  g.events=new EventEmitter();
  g.create(); // Exercise the production shutdown registration before portal readiness.
  g.tweens={maxLag:500,lagSkip:33,setLagSmooth(maxLag=Infinity,lagSkip=0){this.maxLag=maxLag;this.lagSkip=lagSkip;},
    add(config){const tween={config,elapsed:0,active:true,stop(){this.active=false;},remove(){this.active=false;}};tweens.push(tween);return tween;}};
  let now=0;
  g.time={delayedCall(ms,fn){scheduled.push({at:now+ms,fn});},addEvent(){}};
  const camera={zoom:1,follow:null,center:{x:2000,y:2360},emit(){},flash(){},shake(){},fadeIn(){},
    fadeOut(duration,r,g,b){this.fades=(this.fades||0)+1;this.fadeEffect.start(true,duration,r,g,b,true);},
    stopFollow(){this.follow=null;},startFollow(target){this.follow=target;},setZoom(zoom){this.zoom=zoom;},zoomTo(zoom){this.zoom=zoom;},
    centerOn(x,y){this.center={x,y};},pan(x,y){this.centerOn(x,y);}};
  Object.defineProperty(camera,'worldView',{get(){const c=this.follow||this.center,w=1280/this.zoom,h=720/this.zoom;return {x:c.x-w/2,y:c.y-h/2,right:c.x+w/2,bottom:c.y+h/2,contains(x,y){return x>=this.x&&x<=this.right&&y>=this.y&&y<=this.bottom;}};}});
  camera.fadeEffect=new FadeEffect(camera);
  g.cameras={main:camera};
  g.add=Object.fromEntries(['graphics','image','sprite','tileSprite'].map(k=>[k,display]));g.make={graphics:()=>display()};
  const ui={visible:true,ready:true,scene:{setVisible(value){ui.visible=value;}}},overlay={caption:display()};
  let overlayActive=false;
  g.scene={isActive:key=>key==='FinaleOverlay'?overlayActive:true,get:key=>key==='UI'?ui:overlay,
    launch(key){if(key==='FinaleOverlay')overlayActive=true;},stop(key){if(key==='FinaleOverlay')overlayActive=false;},
    restart(data){g.restarts.push(data);}};
  g.restarts=[];g.ui=ui;g.overlay=overlay;
  g.input={keyboard:{resetKeys(){}}};g.joyG={clear(){}};
  g.stageId=stage;g.stage=run(`STAGES.${stage}`);g.charId='mage';g.difficultyId='medium';g.startStageId='forest';g.gameReady=true;
  g.difficulty={bossHpMul:1,bossDmgMul:1,projectileMul:1,scoreMul:1};
  ctx.fixtureGame=g;g.player=run('new Player(fixtureGame,CHARACTERS.mage,2000,2360)');
  Object.assign(g.player,{level:8,xp:29,kills:12,passives:{damage:2},relics:['glass_heart','twin_seal'],dashLevel:3,dashSmoke:true,
    loadout:{skin:'royal',startPower:'axes'},powers:[{def:{id:'radiant_beam'},level:8},{def:{id:'fire_hurricane'},level:1}]});
  camera.startFollow(g.player.sprite);
  g.enemyShots={clear(){},update(){}};g.pShots={update(){}};g.enemies={pool:[],killAllSilently(){},update(){}};g.gems={magnetAll(){},update(){},drop(){}};
  g.world={gate:{x:2000,y:500},gateOpen:false,hideBarrier(){this.hidden=true;},openCatacombStairs(){throw Error('Stairs must not open in the normal castle ending');},
    showBarrier(){},update(){},entry:{x:2000,startY:3820,endY:3600}};
  g.fx={ground:[],burst(){},ring(){},boom(){},number(){},update(){}};g.hazards=[];
  g.progression={consumed:new Set(['arrows']),completed:new Set(['fire_hurricane']),update(){}};
  Object.assign(g,{elapsedBefore:900,t:900,visualTime:900,totalKills:33,totalDamage:401,pendingLevels:2,isPractice:false,godMode:false,
    metaProfileKey:'user.7',metaRunId:'meta-fixture',runStart:Promise.resolve({run_id:'run-fixture',ranked:true,profile_key:'user.7'}),saveError:null});
  g.announce=()=>{};g.boss=run('new Boss(fixtureGame,2000,1830)');g.boss.invuln=false;
  g.tick=async ms=>{
    now+=ms;
    for(const tween of [...tweens])if(tween.active){
      tween.elapsed+=ms;
      if(tween.elapsed<(tween.config.duration||0)+(tween.config.delay||0))continue;
      for(const target of [].concat(tween.config.targets))for(const key of ['x','y','alpha','scaleX','scaleY','progress'])if(key in tween.config)target[key]=tween.config[key];
      tween.config.onUpdate?.();tween.active=false;tween.config.onComplete?.();
    }
    for(const event of [...scheduled])if(!event.done&&event.at<=now){event.done=true;event.fn();}
    await flush();
  };
  g.frame=async seconds=>{camera.fadeEffect.update(0,seconds*1000);g.update(0,seconds*1000);await flush();};
  return g;
}
async function flush(){for(let i=0;i<12;i++)await Promise.resolve();}
async function beginFall(g){g.damageEnemy(g.boss,g.boss.maxHp);await g.tick(2700);assert.ok(g.finale instanceof run('CastleFinale'),'CastleFinale must start after the knight death effects');return g.finale;}
async function finishFall(g){await beginFall(g);await g.frame(11);return g.castleVictory;}
const checks=[];const test=(name,fn)=>checks.push([name,fn]);

test('a long castle film frame reaches an opaque fade before advancing',async()=>{
  for(const steps of [[11],[9,2],[9.3,.8,.9]]){
    const g=fixture();await beginFall(g);
    let alphaAtRestart;
    const restart=g.scene.restart;g.scene.restart=data=>{alphaAtRestart=g.cameras.main.fadeEffect.alpha;restart(data);};
    for(const step of steps)await g.frame(step);
    assert.equal(g.restarts.length,1,'the film still ends at eleven seconds');
    assert.equal(alphaAtRestart,1,'the campaign must advance only after the fade is opaque');
    assert.equal(g.cameras.main.fadeEffect.isComplete,true);
  }
});
test('the castle fade catches up to film time when its start is crossed by a long frame',async()=>{
  const g=fixture();await beginFall(g);await g.frame(9);await g.frame(1.1);
  assert.ok(Math.abs(g.cameras.main.fadeEffect.alpha-.5)<1e-8,'10.1 seconds is halfway through the 9.4–10.8 fade');
  assert.equal(g.restarts.length,0);
});
test('a long soul film frame reaches the final fade before showing the campaign result',async()=>{
  for(const steps of [[9],[6,3],[6.5,1.4,1.1]]){
    const g=fixture('catacombs');g.setCinematic('soul-finale');g.ended=true;
    let completions=0,alphaAtEnd;
    ctx.finaleGame=g;
    g.finale=run('new SoulFinale(finaleGame,()=>{finaleGame.filmDone();})');
    g.filmDone=()=>{completions++;alphaAtEnd=g.cameras.main.fadeEffect.alpha;};
    for(const step of steps)await g.frame(step);
    assert.equal(completions,1);assert.equal(alphaAtEnd,1,'the result must cover a completed fade');
    g.finale.update(30);assert.equal(completions,1);
  }
});
test('the soul film survives a queued overlay shutdown and restores its initial caption on launch',()=>{
  const g=fixture('catacombs'),operations=[];
  ctx.mkText=(scene,x,y,text)=>{const caption=display(x,y);caption.text=text;return caption;};
  const overlay=run('new FinaleOverlayScene()');overlay.events=new EventEmitter();overlay.add={rectangle:display};
  overlay.create({caption:'arrival'});let active=true;
  const oldCaption=overlay.caption;
  oldCaption.setText=text=>{if(oldCaption.destroyed)throw TypeError("Cannot read properties of null (reading 'cut')");oldCaption.text=text;return oldCaption;};
  g.scene.get=key=>key==='UI'?g.ui:overlay;
  g.scene.isActive=key=>key==='FinaleOverlay'?active:true;
  g.scene.launch=(key,data)=>{if(key==='FinaleOverlay')operations.push(['start',data]);};
  g.scene.stop=key=>{if(key==='FinaleOverlay')operations.push(['stop']);};
  const drain=()=>{for(const [operation,data] of operations.splice(0)){
    if(active){overlay.caption?.destroy();overlay.events.emit('shutdown');active=false;}
    if(operation==='start'){overlay.create(data);active=true;}
  }};
  // Arrival completes, but ScenePlugin has not processed its queued stop when
  // the next boss dies. Its death effects then outlive the stopped overlay.
  g.setCinematic(null);g.setCinematic('necromancer-defeat','O ÚLTIMO SELO SE DESFAZ.');drain();
  assert.equal(oldCaption.destroyed,true);assert.equal(active,false);
  g.pShots.items=[];g.gems.items=[];g.player.powers=[];g.submitResult=()=>{};
  assert.doesNotThrow(()=>g.onBossDefeated(),'a delayed launch must not write to a destroyed Text');
  assert.ok(g.finale instanceof run('SoulFinale'));assert.equal(active,false);
  drain();
  assert.equal(active,true);assert.notEqual(overlay.caption,oldCaption);
  assert.equal(overlay.caption.text,'AS CORRENTES DO ARQUIDEMÔNIO CEDEM.','the queued create must preserve the opening caption');
  g.finale.update(4.1);assert.equal(overlay.caption.text,'NENHUMA ALMA PERTENCE À FORNALHA.');
});

test('fatal knight hit locks combat immediately, shows the old crack/lava/fall film, then advances exactly once',async()=>{
  const g=fixture(),advances=[];let victories=0;ctx.GamePortal.advanceRun=async(...args)=>{advances.push(args);return {stage:'catacombs'};};g.submitResult=()=>victories++;
  const hp=g.player.hp,xp=g.player.xp;
  g.damageEnemy(g.boss,g.boss.maxHp);const completed=g.castleVictory;
  assert.equal(g.cinematic,'castle-defeat');assert.equal(g.boss.alive,false);
  g.player.takeDamage(10000);g.player.gainXp(10000);g.onPlayerDeath();g.openLevelUp();g.onBossDefeated();
  assert.equal(g.player.hp,hp);assert.equal(g.player.xp,xp);assert.equal(g.ended,undefined);assert.equal(g.levelUpOpen,undefined);assert.equal(g.ui.visible,false);
  await g.tick(2699);assert.equal(g.finale,undefined);assert.equal(advances.length,0);
  await g.tick(1);assert.ok(g.finale instanceof run('CastleFinale'));assert.equal(g.cinematic,'castle-fall');
  await g.frame(3);assert.ok(g.finale.cracks.lines>0);assert.equal(g.finale.opening,0);
  await g.frame(3);assert.ok(g.finale.opening>0);assert.equal(g.finale.lava.visible,true);
  await g.frame(2);assert.ok(g.player.sprite.scaleX<1);assert.equal(g.player.shadow.visible,false);assert.equal(advances.length,0);
  const callback=g.finale.onComplete;
  await g.frame(3);callback?.();g.onBossDefeated();await flush();
  assert.equal(await completed,true);assert.equal(victories,0);assert.equal(g.restarts.length,1);assert.deepEqual(advances,[['run-fixture','catacombs']]);
  const {carry,stage}=g.restarts[0];assert.equal(stage,'catacombs');assert.equal(carry.elapsed,1800);assert.equal(g.t,900);
  assert.equal(carry.run.run_id,'run-fixture');assert.equal(carry.metaProfileKey,'user.7');assert.equal(carry.metaRunId,'meta-fixture');assert.equal(carry.startStageId,'forest');
  assert.equal(carry.kills,33);assert.equal(carry.damage,g.totalDamage);assert.equal(carry.pendingLevels,2);
  assert.deepEqual(JSON.parse(JSON.stringify(carry.player.powers)),[{id:'radiant_beam',level:8},{id:'fire_hurricane',level:1}]);
  assert.deepEqual(Array.from(carry.player.relics),['glass_heart','twin_seal']);assert.equal(carry.player.dashLevel,3);assert.equal(carry.player.dashSmoke,true);assert.equal(carry.player.loadout.skin,'royal');
  assert.equal(carry.consumed[0],'arrows');assert.equal(carry.completed[0],'fire_hurricane');assert.ok(!g.stageCleared);assert.ok(g.cameras.main.fades>=1);
});
test('automatic advancement cannot bypass the entrance guard with an external option or fabricated context',async()=>{
  const g=fixture();
  assert.equal(await g.enterNextStage({automatic:true,force:true}),false);assert.equal(g.restarts.length,0);
  assert.equal(typeof g.commitStageAdvance,'function');
  assert.equal(await g.commitStageAdvance({initialization:g.initialization,targetStage:'catacombs'}),false);assert.equal(g.restarts.length,0);
});
test('offline fall preserves identity/build and switches the continuing campaign to practice once',async()=>{
  const g=fixture();let calls=0,notices=0;ctx.GamePortal.advanceRun=async()=>{calls++;throw Error('offline');};ctx.GamePortal.notice=()=>notices++;
  assert.equal(await finishFall(g),true);const carry=g.restarts[0].carry;
  assert.equal(calls,1);assert.equal(notices,1);assert.equal(carry.practice,true);assert.ok(carry.saveError);assert.equal(carry.run.run_id,'run-fixture');assert.equal(carry.player.dashLevel,3);
});
test('a campaign already in offline practice continues without another network request',async()=>{
  const g=fixture();g.isPractice=true;g.saveError='previous offline failure';let calls=0;ctx.GamePortal.advanceRun=async()=>{calls++;};
  assert.equal(await finishFall(g),true);assert.equal(calls,0);assert.equal(g.restarts[0].carry.practice,true);assert.equal(g.restarts[0].carry.saveError,'previous offline failure');
});
test('guest fall credits only Inferno and never records castle victory',async()=>{
  const g=fixture(),credits=[];g.runStart=Promise.resolve(null);g.metaProfileKey='guest';
  ctx.GamePortal.recordGuestAdvance=(...args)=>credits.push(args);ctx.GamePortal.recordGuestVictory=()=>{throw Error('No castle victory');};
  assert.equal(await finishFall(g),true);assert.deepEqual(credits,[['catacombs','guest']]);
});
test('shutdown settles a pending fall advance and rejects late callbacks without touching the next run',async()=>{
  const g=fixture();let release,calls=0;ctx.GamePortal.advanceRun=()=>{calls++;return new Promise((resolve,reject)=>release=reject);};
  const film=await beginFall(g),callback=film.onComplete;await g.frame(11);assert.equal(calls,1);assert.equal(g.restarts.length,0);
  callback?.();g.onBossDefeated();assert.equal(calls,1);g.events.emit('shutdown');
  assert.equal(await g.castleVictory,false);assert.equal(g.cinematicWaits.size,0);assert.equal(film.onComplete,null);assert.equal(film.mask.destroyed,true);
  g.initialization=Symbol('next run');g.cinematic=null;const nextPlayer={marker:'next'};g.player=nextPlayer;
  callback?.();film.update(20);release(Error('late offline response'));await flush();
  assert.equal(g.restarts.length,0);assert.equal(g.player,nextPlayer);assert.equal(g.cinematic,null);
});
test('shutdown cancels both knight death wait and active lava film',async()=>{
  for(const duringFilm of [false,true]){
    const g=fixture();let calls=0;ctx.GamePortal.advanceRun=async()=>{calls++;};
    g.damageEnemy(g.boss,g.boss.maxHp);if(duringFilm){await g.tick(2700);await g.frame(6);}
    const film=g.finale;g.events.emit('shutdown');assert.equal(await g.castleVictory,false);assert.equal(g.cinematicWaits.size,0);
    g.initialization=Symbol();await g.tick(5000);film?.update(20);await flush();assert.equal(calls,0);assert.equal(g.restarts.length,0);
    if(film){assert.equal(film.complete,true);assert.equal(film.onComplete,null);}
    assert.equal(g.tweens.maxLag,500);assert.equal(g.tweens.lagSkip,33);
  }
});
test('shutdown also cancels an unresolved initial run identity at the end of the fall',async()=>{
  const g=fixture();let release;g.runStart=new Promise(resolve=>release=resolve);await beginFall(g);await g.frame(11);
  assert.equal(g.restarts.length,0);g.events.emit('shutdown');assert.equal(await g.castleVictory,false);
  g.initialization=Symbol();release({run_id:'too-late'});await flush();assert.equal(g.restarts.length,0);
});
test('Inferno arrival resets the fallen pose, shadow, camera and HUD while keeping its build',async()=>{
  const g=fixture('catacombs'),p=g.player;p.sprite.setAlpha(0).setScale(.06).setRotation(1.6).setTint(0xffaf6b);p.shadow.setVisible(false);
  g.cameras.main.stopFollow();g.cameras.main.setZoom(.6);g.ui.visible=false;const arrival=g.playStageArrival();
  assert.equal(p.sprite.alpha,1);assert.equal(p.sprite.scaleX,1);assert.equal(p.sprite.scaleY,1);assert.equal(p.sprite.rotation,0);assert.equal(p.sprite.tint,null);assert.equal(p.shadow.visible,true);
  assert.equal(g.cameras.main.zoom,1);assert.equal(g.cameras.main.follow,p.sprite);assert.equal(g.ui.visible,false);
  await g.tick(1250);assert.equal(await arrival,true);assert.equal(g.cinematic,null);assert.equal(g.ui.visible,true);assert.equal(p.invuln,2);assert.equal(p.y,3600);assert.equal(p.dashLevel,3);assert.equal(p.relics.length,2);
});
test('the natural 900-second Inferno boss trigger frames the arena and both unchanged actor positions',()=>{
  const g=fixture('catacombs');g.boss=null;g.bossStarted=false;g.bossTime=900;g.t=899.96;g.pendingLevels=0;
  g.drawJoystick=()=>{};g.readInput=()=>({x:0,y:0});g.player.update=()=>{};g.grid={clear(){},insert(){}};g.encounters={update(){}};g.updateHazards=()=>{};
  g.update(0,50);
  assert.equal(g.bossStarted,true);assert.equal(g.boss.data.name,'Arquidemônio das Cinzas');assert.equal(g.boss.x,2000);assert.equal(g.boss.y,1830);assert.equal(g.player.x,2000);assert.equal(g.player.y,2360);
  const camera=g.cameras.main;assert.equal(camera.follow,null);assert.equal(camera.zoom,.65);assert.equal(camera.center.x,2000);assert.equal(camera.center.y,2000);
  assert.ok(camera.worldView.contains(g.player.x,g.player.y));assert.ok(camera.worldView.contains(g.boss.x,g.boss.y));assert.ok(camera.worldView.contains(2000,1480));assert.ok(camera.worldView.contains(2000,2520));
});
test('a fatal hit stops the remaining combat and reward work in the same update',()=>{
  for(const fatalPhase of ['enemies','boss','enemyShots','hazards']){
    const g=fixture(),afterDeath=[];
    g.player.powers=[];g.player.invuln=0;g.bossStarted=true;g.pendingLevels=0;
    g.drawJoystick=()=>{};g.readInput=()=>({x:0,y:0});g.player.update=()=>{};g.grid={clear(){},insert(){}};
    const phase=name=>()=>{if(g.ended)afterDeath.push(name);if(name===fatalPhase)g.player.takeDamage(100000);};
    g.enemies.update=phase('enemies');g.encounters={update:phase('encounters')};g.boss.update=phase('boss');
    g.pShots.update=phase('pShots');g.enemyShots.update=phase('enemyShots');g.gems.update=phase('gems');
    g.updateHazards=phase('hazards');g.exploration={update:phase('exploration')};g.progression.update=phase('progression');
    g.update(0,16);
    assert.equal(g.player.dead,true);assert.equal(g.player.hp,0);
    assert.deepEqual(afterDeath,[],fatalPhase+' must end combat before another system runs');
  }
});
test('damage callbacks arriving after death cannot add enemy damage or kills to the result',()=>{
  const g=fixture();g.player.invuln=0;g.player.takeDamage(100000);
  const enemy={alive:true,hp:50,def:{},x:2000,y:2360,radius:10},before=g.totalDamage;
  g.damageEnemy(enemy,10);
  assert.equal(enemy.hp,50);assert.equal(g.totalDamage,before);
});
(async()=>{let failures=0;for(const [name,fn]of checks){try{await fn();console.log('OK: '+name);}catch(error){failures++;console.error('FAIL: '+name+'\n'+error.stack);}}if(failures)process.exitCode=1;else console.log(`Castle fall checks passed (${checks.length})`);})();
