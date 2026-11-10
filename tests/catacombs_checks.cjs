const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { EventEmitter } = require('node:events');
const ctx = vm.createContext({ console, Math, Set, Map, Symbol, URLSearchParams, location: { search: '' },
  Phaser: { Scene: class {}, BlendModes: { ADD: 1 } }, Sfx: { play() {} } });
function load(name) { const p = path.join(__dirname, '../js', name); if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: name }); }
for (const name of ['config.js','util.js','data.js']) load(name);
vm.runInContext('let ENEMY_UID=1; const ENEMY_ART = {}; const FOREST_ENEMY_IDS = ["forest_fixture"]; const FOREST_EVENTS = []; const FOREST_BOSS = {name:"Raízes"}; ENEMIES.forest_fixture={stage:"forest"};', ctx);
for (const name of ['map.js','catacombs-art.js','catacombs-enemies.js','boss.js','catacombs-boss.js','catacombs.js','stages.js','finale.js','game.js','selection.js']) load(name);
const run = code => vm.runInContext(code, ctx);
const checks = [];
function test(name, fn) { checks.push([name, fn]); }

test('three stage chain and exclusive ordinary/miniboss species', () => {
  assert.equal(run('resolveStage("castle").next'), 'catacombs');
  assert.equal(run('resolveStage("catacombs").number'), 3);
  assert.equal(run('STAGES.catacombs.next'), null);
  assert.equal(run('CATACOMB_ENEMY_IDS.length'), 6);
  assert.equal(run('STAGES.catacombs.minis.length'), 2);
  assert.equal(run('STAGES.castle.enemyIds.some(id => ENEMIES[id].stage && ENEMIES[id].stage !== "castle")'), false);
  assert.equal(run('[...CATACOMB_ENEMY_IDS,...STAGES.catacombs.minis].every(id => ENEMIES[id].stage === "catacombs" && ENEMY_ART[id].custom)'), true);
});

function object() {
  const data = { anims: { stop() {}, pause() {}, resume() {}, setProgress() {}, isPlaying: true } };
  return new Proxy(data, { get(t,k) { if (k in t) return t[k]; return (...args) => { if (k==='setPosition') {t.x=args[0];t.y=args[1];} return data.proxy; }; } });
}
function display() { const o=object(); o.proxy=o; return o; }
function scene() {
  return { add: Object.fromEntries(['image','sprite','graphics','tileSprite','particles'].map(k=>[k,display])),
    make:{graphics:display},
    tweens:{ add:()=>({stop(){},remove(){}}),killTweensOf(){} }, events:new EventEmitter(),
    cameras:{main:{worldView:{x:0,y:0,right:4000,bottom:4000},shake(){},flash(){},pan(){},zoomTo(){},stopFollow(){},startFollow(){},fadeOut(){}}},
    difficulty:{bossHpMul:1,bossDmgMul:1,projectileMul:1,hpMul:1,dmgMul:1},
    fx:{ring(){},burst(){},boom(){},teleCircle(){},teleLine(){},teleCone(){},ground:[]},
    player:{x:2000,y:2250,radius:12,dead:false,takeDamage(){return true;}},
    addHazard(h){this.hazards.push(h);},hazards:[], enemyShots:{items:[],clear(){},fire(...args){this.items.push(args);return null;}},
    dmgScale:()=>1, announce(){}, t:500, spawningEnabled:true, bossStarted:false,
  };
}
ctx.SPR={canvas(){}, make(){}};
test('catacomb chambers, central arena, entry and corridors remain traversable', () => {
  assert.equal(run('typeof CatacombWorld'), 'function');
  ctx.fixtureScene=scene();
  run('this.world = new CatacombWorld(fixtureScene)');
  assert.ok(ctx.world.entry.startY > ctx.world.entry.endY);
  for (const radius of [12,24,40]) {
    for (let y=ctx.world.entry.startY;y>=ctx.world.entry.endY;y-=8) {
      const e={x:2000,y,radius}; ctx.world.constrain(e); assert.ok(Math.hypot(e.x-2000,e.y-y)<.01,'arrival corridor blocked');
    }
    for (const route of ctx.world.routes) for (let i=1;i<route.length;i++) {
      const from=route[i-1],to=route[i],steps=Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/12);
      for(let j=0;j<=steps;j++) { const p={x:from.x+(to.x-from.x)*j/steps,y:from.y+(to.y-from.y)*j/steps,radius}; const e={...p};ctx.world.constrain(e);assert.ok(Math.hypot(e.x-p.x,e.y-p.y)<.1,'chamber route blocked'); }
    }
  }
});
test('environment traps are capped, camera local, suspended during cinema and official boss', () => {
  assert.equal(run('typeof CatacombWorld'), 'function');
  const sc=scene(); ctx.fixtureScene=sc; run('this.world = new CatacombWorld(fixtureScene)');
  sc.player.x=ctx.world.traps[0].x;sc.player.y=ctx.world.traps[0].y;
  sc.cameras.main.worldView={x:sc.player.x-100,y:sc.player.y-100,right:sc.player.x+100,bottom:sc.player.y+100};
  for(let i=0;i<100;i++)ctx.world.update(.1,i*.1);
  assert.ok(sc.hazards.length>0); assert.ok(sc.hazards.length<=12,'traps exceed bounded live warnings');
  for(const h of sc.hazards)assert.ok(Math.hypot(h.x-sc.player.x,h.y-sc.player.y)<600);
  for(const flag of ['cinematic','bossStarted','ended','stageCleared']) { const n=sc.hazards.length;sc[flag]=true;ctx.world.update(100,100);assert.equal(sc.hazards.length,n,flag);sc[flag]=false; }
});
test('necromancer telegraphs seals, uses projectile pool and caps summoned souls', () => {
  assert.equal(run('typeof NecromancerBoss'), 'function');
  const sc=scene();ctx.fixtureScene=sc;
  sc.enemies={summoned:0,pool:[],spawn(id,x,y){const e={id,x,y,alive:true,uid:this.pool.length+1};this.pool.push(e);this.summoned++;return e;},kill(e){e.alive=false;this.summoned--;}};
  run('this.boss = new NecromancerBoss(fixtureScene,2000,1830)');
  ctx.boss.startBlast();assert.ok(sc.hazards.length>=3);assert.ok(sc.hazards.every(h=>h.delay>=.8&&h.dmg>0));
  ctx.boss.fireWave();assert.ok(sc.enemyShots.items.length>0&&sc.enemyShots.items.length<=24);
  for(let i=0;i<20;i++)ctx.boss.summonSouls();
  assert.ok(sc.enemies.pool.length>0&&sc.enemies.pool.length<=6);
});
function gameFixture(stage='castle') {
  ctx.fixtureScene=scene();
  const g=run('new GameScene()');Object.assign(g,ctx.fixtureScene);
  g.initialization=Symbol();g.cinematicWaits=new Set();g.stageId=stage;g.stage=run(`STAGES.${stage}`);g.charId='mage';g.difficultyId='medium';g.startStageId='forest';g.gameReady=true;
  g.world={gate:{x:2000,y:2000},gateOpen:true,isAtStageExit:()=>true,openCatacombStairs(){this.gateOpen=true;},hideBarrier(){},barrierTweens:[],barrierProps:[]};
  g.player={...g.player,maxHp:100,hp:70,baseSpeed:100,mods:{damage:1},powers:[],passives:{},level:8,xp:1,kills:12,sprite:display(),shadow:display()};
  g.scene={isActive:()=>true,get:()=>({scene:{setVisible(){}},caption:display()}),stop(){},launch(){},restart(data){g.restarted=data;}};
  g.input={keyboard:{resetKeys(){}}};g.runStart=Promise.resolve({run_id:'fixture',ranked:true});g.progression={consumed:new Set(['arrows']),completed:new Set(['plasma_storm'])};
  g.totalKills=31;g.totalDamage=400;g.elapsedBefore=900;g.t=900;g.pendingLevels=2;g.difficulty={scoreMul:1};
  g.cinematicTween=async config=>{Object.assign(config.targets,Object.fromEntries(['x','y'].filter(k=>k in config).map(k=>[k,config[k]])));return true;};g.cinematicDelay=async()=>true;g.setCinematic=function(state){this.cinematic=state;};
  return g;
}
test('castle fatal hit synchronously locks damage/menu before the fall without victory', async () => {
  const g=gameFixture();let victories=0;g.submitResult=()=>victories++;g.beginCastleVictory=()=>{g.cinematic='castle-defeat';return true;};
  g.onBossDefeated();assert.equal(g.cinematic,'castle-defeat');assert.equal(victories,0);assert.ok(!g.ended);
  const sc=scene();sc.stageId='castle';sc.initialization=Symbol();sc.beginCastleVictory=()=>{sc.cinematic='castle-defeat';};sc.beginBossDefeat=()=>{sc.cinematic='castle-defeat';};sc.time={addEvent(){},delayedCall(){}};sc.tweens={add(){}};
  ctx.fixtureScene=sc;run('this.knight = new Boss(fixtureScene,2000,1800)');ctx.knight.die();assert.equal(sc.cinematic,'castle-defeat');
});
test('death effects use current scene identity and cannot finish a newer run',()=>{
  const sc=scene(),callbacks=[];sc.stageId='catacombs';sc.initialization=Symbol();sc.beginBossDefeat=()=>{sc.cinematic='necromancer-defeat';};
  let ended=0;sc.onBossDefeated=()=>ended++;sc.time={addEvent:config=>callbacks.push(config.callback),delayedCall:(ms,fn)=>callbacks.push(fn)};sc.tweens={add(){}};
  ctx.fixtureScene=sc;run('this.deadBoss = new Boss(fixtureScene,2000,1800)');ctx.deadBoss.die();
  callbacks.forEach(fn=>fn());assert.equal(ended,1);sc.initialization=Symbol();callbacks.forEach(fn=>fn());assert.equal(ended,1);
});
test('second crossing advances explicit target once and carries build and totals', async () => {
  const advances=[];ctx.GamePortal={dialogOpen:false,user:{id:1},advanceRun:async(...args)=>advances.push(args)};
  const g=gameFixture();g.stageCleared=true;
  const first=g.enterNextStage();assert.equal(await g.enterNextStage(),false);assert.equal(await first,true);
  assert.deepEqual(advances,[['fixture','catacombs']]);assert.equal(g.restarted.stage,'catacombs');
  assert.equal(g.restarted.carry.player.level,8);assert.equal(g.restarted.carry.elapsed,1800);assert.equal(g.restarted.carry.completed[0],'plasma_storm');
});
test('first crossing retains legacy wrapper and sends castle target', async()=>{
  const advances=[];ctx.GamePortal={dialogOpen:false,user:{id:1},advanceRun:async(...args)=>advances.push(args)};
  const g=gameFixture('forest');g.stageCleared=true;g.world.isAtCastleDoor=()=>true;
  assert.equal(g.nearCastleGate(),true);assert.equal(await g.enterCastle(),true);assert.deepEqual(advances,[['fixture','castle']]);assert.equal(g.restarted.stage,'castle');
});
test('offline second crossing preserves the run and disables ranking only once',async()=>{
  let calls=0;ctx.GamePortal={dialogOpen:false,user:{id:1},notice(){},advanceRun:async()=>{calls++;throw Error('offline');}};
  const g=gameFixture();g.stageCleared=true;
  assert.equal(await g.enterNextStage(),true);assert.equal(g.restarted.stage,'catacombs');assert.equal(g.restarted.carry.run.run_id,'fixture');assert.equal(g.restarted.carry.practice,true);assert.ok(g.restarted.carry.saveError);assert.equal(calls,1);
});
test('guest second crossing credits the target stage and refuses menus/closed exits',async()=>{
  const credits=[];ctx.GamePortal={dialogOpen:false,user:null,recordGuestAdvance:s=>credits.push(s)};
  const g=gameFixture();g.stageCleared=true;g.runStart=Promise.resolve(null);g.metaProfileKey='guest';
  for(const flag of ['levelUpOpen','chestOpen','explorationOpen']){g[flag]=true;assert.equal(await g.enterNextStage(),false);g[flag]=false;}
  g.world.gateOpen=false;assert.equal(await g.enterNextStage(),false);g.world.gateOpen=true;
  assert.equal(await g.enterNextStage(),true);assert.deepEqual(credits,['catacombs']);
});
test('castle seal cinema runs the lava fall and automatically continues to Inferno',async()=>{
  const advances=[];ctx.GamePortal={dialogOpen:false,user:{id:1},advanceRun:async(...args)=>advances.push(args)};
  const g=gameFixture();let revealed=0;g.world.openCatacombStairs=function(){revealed++;};
  const transition=g.beginCastleVictory();for(let i=0;i<12;i++)await Promise.resolve();
  assert.ok(g.finale instanceof run('CastleFinale'));assert.equal(g.cinematic,'castle-fall');assert.equal(revealed,0);
  g.finale.update(11);assert.equal(await transition,true);assert.equal(g.restarted.stage,'catacombs');assert.deepEqual(advances,[['fixture','catacombs']]);assert.ok(!g.ended);assert.equal(g.stageCleared,undefined);
});
test('boss factory selects necromancer and routes its pre-fight healing through Player.heal',()=>{
  const g=gameFixture('catacombs');g.enemies={pool:[],killAllSilently(){}};g.gems={magnetAll(){}};g.world.showBarrier=()=>{};let healing;
  g.player.heal=n=>healing=n;g.difficulty={bossHpMul:1,bossDmgMul:1};
  g.startBossFight();assert.equal(healing,50);assert.equal(g.boss.data.name,'Arquidemônio das Cinzas');assert.equal(g.bossStarted,true);assert.equal(g.world.arenaLock,true);
});
test('difficulty selection preserves third stage',()=>{
  const selection=run('new DifficultyScene()');selection.init({char:'mage',stage:'catacombs'});assert.equal(selection.stageId,'catacombs');
});
test('shutdown while advancement is pending cannot restart a new scene', async () => {
  let release,started;const pending=new Promise(r=>started=r);ctx.GamePortal={dialogOpen:false,user:{id:1},advanceRun:()=>{started();return new Promise(r=>release=r);}};
  const g=gameFixture();g.stageCleared=true;const crossing=g.enterNextStage();await pending;g.initialization=Symbol();release({});assert.equal(await crossing,false);assert.equal(g.restarted,undefined);
});
test('shutdown settles pending network wait before its eventual response', async () => {
  const g=gameFixture();let stopped=false;
  assert.equal(typeof g.cinematicAwait,'function');
  const pending=g.cinematicAwait(new Promise(()=>{}));
  for(const cancel of [...g.cinematicWaits])cancel();
  const result=await Promise.race([pending,new Promise(r=>setTimeout(()=>r('still-pending'),40))]);
  assert.equal(result?.ok,false);assert.equal(g.cinematicWaits.size,0);
});
test('necromancer defeat alone submits campaign victory with final stage', () => {
  const g=gameFixture('catacombs');let stage;ctx.GamePortal={user:null,recordGuestVictory:s=>stage=s};g.isPractice=false;g.metaProfileKey='guest';
  g.pShots={items:[]};g.gems={items:[]};g.player.powers=[];g.submitResult=win=>assert.equal(win,true);
  ctx.NecromancerFinale=class{};
  // Override only display-heavy final renderer while executing the real victory branch.
  run('this.FinalRenderer = SoulFinale');ctx.finalGame=g;
  g.onBossDefeated();assert.equal(stage,'catacombs');assert.equal(g.ended,true);assert.ok(g.finale);
  let wins=0;g.showEnd=win=>{assert.equal(win,true);wins++;};g.finale.onComplete=()=>g.showEnd(true);
  g.finale.update(10);g.finale.update(10);assert.equal(wins,1);
});

(async()=>{let failed=0;for(const [name,fn]of checks){try{await fn();console.log('OK: '+name);}catch(e){failed++;console.error('FAIL: '+name+'\n'+e.stack);}}if(failed)process.exitCode=1;else console.log(`Catacombs checks passed (${checks.length})`);})();
