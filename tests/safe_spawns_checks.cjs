// Real campaign collision geometry and spawn callers; rendering is the only stub.
// Guards against wall projection teleporting hordes/events/minis onto the player.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const failures=[];
function test(name,fn){try{fn();console.log('OK: '+name);}catch(e){failures.push(name);console.error('FAIL: '+name+': '+e.message);}}
function display(){const data={scaleY:1,anims:{setProgress(){}}};const obj=new Proxy(data,{get(t,k){if(k in t)return t[k];return(...args)=>{if(k==='setPosition'){t.x=args[0];t.y=args[1];}return obj;};}});return obj;}
function fixture(stage='catacombs'){
  const ctx=vm.createContext({console,Math:Object.create(Math),Phaser:{BlendModes:{ADD:1}},Sfx:{play(){}}});
  const read=id=>fs.readFileSync(path.join(__dirname,'../js/'+id+'.js'),'utf8');
  for(const id of ['config','util','data','sprites','forest-enemies','catacombs-enemies','enemies','encounters','map','forest','catacombs'])vm.runInContext(read(id),ctx,{filename:id+'.js'});
  vm.runInContext('SPR.canvas=()=>{};this.Manager=EnemyManager;this.Director=EncounterDirector;this.Worlds={castle:World,forest:ForestWorld,catacombs:CatacombWorld};this.defs=ENEMIES;this.config=CONFIG;',ctx);
  const sc={stageId:stage,stage:{enemyIds:[stage==='catacombs'?'crypt_crawler':stage==='forest'?'forest_wolf':'skel_warrior'],events:[],minis:stage==='catacombs'?['crypt_executioner','crypt_soulkeeper']:stage==='forest'?['forest_matriarch','forest_huntsman']:['storm_warden','crypt_lord']},
    add:Object.fromEntries(['image','sprite','graphics','tileSprite','particles'].map(id=>[id,display])),tweens:{add:()=>({stop(){},remove(){}})},
    cameras:{main:{worldView:{x:0,y:0,right:4000,bottom:4000}}},player:{x:700,y:700,radius:12},
    difficulty:{id:'medium',hpMul:1,spawnMul:1,capMul:1},t:0,spawningEnabled:true,announce(){},fx:{burst(){},ring(){}},gems:{drop:()=>true},
  };
  sc.world=new ctx.Worlds[stage](sc);sc.enemies=new ctx.Manager(sc);sc.encounters=new ctx.Director(sc);
  return{ctx,sc,defs:ctx.defs};
}
function distance(sc,e){return Math.hypot(e.x-sc.player.x,e.y-sc.player.y);}
function assertSafe(sc){
  const live=sc.enemies.pool.filter(e=>e.alive);
  for(const e of live){assert.ok(distance(sc,e)>480,`${e.id} projected to only ${distance(sc,e)} px`);const probe={x:e.x,y:e.y,radius:e.radius,def:e.def,ghost:e.ghost};sc.world.constrain(probe);assert.ok(Math.hypot(probe.x-e.x,probe.y-e.y)<.01,'spawn position is stable before its first AI tick');}
  return live;
}
test('species-radius projection rejects the Catacomb west-wall contact spawn',()=>{
  const{ctx,sc}=fixture();ctx.Math.random=()=>.5;
  const original={x:190,y:700,radius:30};sc.world.constrain(original);assert.equal(original.x,690);assert.equal(distance(sc,original),10);
  const p=sc.enemies.spawnPoint(620,780,'crypt_executioner');assert.equal(p,null,'all westward candidates project too close and must defer');assert.equal(sc.enemies.alive,0);
});
test('normal director does not publish unsafe projected positions or jitter them into a wall',()=>{
  const{ctx,sc}=fixture();ctx.Math.random=()=>.5;sc.enemies.acc=1;sc.enemies.director(0);assertSafe(sc);
  let i=0;const rolls=[0,.5,.25,.75];ctx.Math.random=()=>rolls[i++%rolls.length];sc.enemies.acc=5;sc.enemies.director(0);assert.ok(assertSafe(sc).length>0,'safe directions still spawn a normal horde');
});
test('ring, swarm and mixed packs validate every final species position',()=>{
  for(const type of ['ring','swarm','pack']){
    const{ctx,sc}=fixture();ctx.Math.random=()=>.5;
    sc.enemies.runEvent({type,enemy:'crypt_crawler',count:12,list:{crypt_crawler:3,crypt_sentinel:3},msg:'fixture'});
    const live=assertSafe(sc);if(type==='ring')assert.ok(live.length>0,'safe portions of an event ring remain populated');
  }
});
test('due minis defer unsafe projection, then use their actual radius without displacing an enemy',()=>{
  const{ctx,sc}=fixture();ctx.Math.random=()=>.5;for(let i=0;i<sc.enemies.pool.length;i++)sc.enemies.spawn('crypt_crawler',1100,1100,1,false,true);const before=sc.enemies.alive;sc.t=300;sc.encounters.update(.016);assert.equal(sc.encounters.spawned[0],false);assert.equal(sc.enemies.alive,before,'unsafe mini must not evict an ordinary enemy');sc.enemies.killAllSilently();
  ctx.Math.random=()=>0;sc.encounters.update(.016);assert.equal(sc.encounters.spawned[0],true);const live=assertSafe(sc);assert.equal(live.length,1);assert.equal(live[0].radius,30);assert.equal(live[0].isMiniBoss,true);
});
test('direct intentional summons keep requested coordinates and ordinary reservations',()=>{
  const{sc}=fixture();const e=sc.enemies.spawn('crypt_ghost',710,700,1,true);assert.ok(e);assert.equal(e.x,710);assert.equal(e.y,700);assert.equal(sc.enemies.summoned,1);
});
test('forest and castle directors and events retain safe reachable spawns',()=>{
  for(const stage of ['forest','castle']){
    const{ctx,sc,defs}=fixture(stage);const id=sc.stage.enemyIds[0];assert.ok(defs[id],id+' exists');sc.player.x=2000;sc.player.y=3000;
    let i=0;const rolls=[0,.125,.25,.375,.5,.625,.75,.875];ctx.Math.random=()=>rolls[i++%rolls.length];sc.enemies.acc=10;sc.enemies.director(0);assert.ok(assertSafe(sc).length>0,stage+' retains normal spawning');
    sc.enemies.runEvent({type:'ring',enemy:id,count:12,msg:'fixture'});sc.enemies.runEvent({type:'swarm',enemy:id,count:8,msg:'fixture'});sc.enemies.runEvent({type:'pack',list:{[id]:8},msg:'fixture'});assertSafe(sc);
  }
});
if(failures.length){console.error(failures.length+' failing checks');process.exitCode=1;}
