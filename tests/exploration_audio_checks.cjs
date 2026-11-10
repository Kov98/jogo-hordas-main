// Production exploration, enemy lifecycle and audio graph run in a VM.
// Browser-only boundaries are represented by small DOM/WebAudio/Phaser doubles.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const failures = [];
function test(name, fn) { try { fn(); console.log('OK: ' + name); } catch (error) { failures.push(name); console.error('FAIL: ' + name + ': ' + error.message); } }
function visual() {
  const v = { x: 0, y: 0, scaleY: 1 };
  for (const key of ['setTexture','setPosition','setVisible','setActive','setDepth','setScale','setAlpha','setOrigin','setTint','clearTint','setFlipX','play','setBlendMode','setTintFill']) v[key] = function (...args) { if (key === 'setPosition') [v.x,v.y] = args; return v; };
  v.destroy = () => { v.destroyed = true; }; return v;
}
function domNode(tag) {
  return { tagName: tag.toUpperCase(), children: [], style: {}, isConnected: true, listeners: {}, append(...items) { this.children.push(...items); }, setAttribute() {}, addEventListener(k,f) { this.listeners[k]=f; }, removeEventListener(k) { delete this.listeners[k]; }, querySelector() { return null; }, focus() {} };
}
function fixture() {
  const win = new EventEmitter(), document = new EventEmitter(), events = [], audioNodes = [];
  win.addEventListener=win.on.bind(win); win.removeEventListener=win.off.bind(win);
  document.addEventListener=document.on.bind(document); document.removeEventListener=document.off.bind(document); document.createElement=domNode; document.body=domNode('body'); document.hidden=false;
  class Param { constructor() { this.value=0; } setValueAtTime(v) { this.value=v; } linearRampToValueAtTime(v) { this.value=v; } exponentialRampToValueAtTime(v) { this.value=v; } cancelScheduledValues() {} }
  class Node { constructor(type) { this.type=type; this.gain=new Param(); this.frequency=new Param(); this.Q=new Param(); this.playbackRate=new Param(); audioNodes.push(this); } connect() {} disconnect() { this.disconnected=true; } start() { this.started=true; } stop(when) { if (when === undefined) { this.stopped=true; this.onended?.(); } else this.stopTime=when; } }
  class AC { constructor() { this.currentTime=10; this.sampleRate=100; this.state='running'; this.destination={}; } createGain() { return new Node('gain'); } createOscillator() { return new Node('osc'); } createBufferSource() { return new Node('source'); } createBiquadFilter() { return new Node('filter'); } createBuffer(c,n) { return { getChannelData:()=>new Float32Array(n) }; } resume() {} }
  win.AudioContext=AC;
  const portal={dialogOpen:false,notice(){},openDialog() { portal.dialogOpen=true; const panel=domNode('section'); return {panel,body:domNode('div'),footer:domNode('footer'),close() { panel.isConnected=false; portal.dialogOpen=false; }}; }};
  const ctx=vm.createContext({ console, Math:Object.create(Math), window:win, document, performance:{now:()=>10000}, GamePortal:portal, MetaProgress:{record:(event,key)=>events.push({event,key})},
    Phaser:{Scene:class {},BlendModes:{ADD:1}}, CONFIG:{maxEnemies:8,maxEnemyShots:6,maxGems:6,world:{w:4000,h:4000,border:180},player:{invuln:1},spawn:{},healthDropChance:0},
    ENEMIES:{ordinary:{name:'Ordinary',stage:'forest',hp:20,speed:30,dmg:3,radius:12,xp:1,from:0,weight:1}},ENEMY_ART:{ordinary:{visualScale:1}},
    RELICS:Object.fromEntries(['twin_seal','blood_oath','glass_heart','restless_clock','pilgrim_chain','ashen_cup'].map(id=>[id,{id,name:id,desc:'benefit',drawback:'penalty'}])),
    rand:(a,b)=>(a+b)/2,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),angleDiff:(a,b)=>a-b });
  const read = id => fs.existsSync(path.join(__dirname,'../js/'+id+'.js')) ? fs.readFileSync(path.join(__dirname,'../js/'+id+'.js'),'utf8') : '';
  vm.runInContext(read('audio')+read('enemies')+read('exploration')+read('soundscape')+'\nthis.Exploration = typeof ExplorationSystem === "function" ? ExplorationSystem : null; this.AudioLandscape = typeof Soundscape === "function" ? Soundscape : null; this.SfxApi=Sfx; this.Manager=EnemyManager;',ctx);
  function scene(stage='forest') {
    const sc={stageId:stage,stage:{id:stage,enemyIds:['ordinary']},t:10,metaProfileKey:'user:initial',events:new EventEmitter(),game:{events:new EventEmitter()},fx:{burst(){},corpse(){},ring(){},teleLine(){},number(){}},totalKills:0,totalDamage:0,
      player:{x:2000,y:3000,radius:12,maxHp:100,hp:100,relics:[],kills:0,mods:{area:1},gainXp(){},takeDamage(d){this.hp-=d;return true;},addRelic(id){if(this.relics.length>=3||this.relics.includes(id))return false;this.relics.push(id);return true;}},
      difficulty:{hpMul:1,xpMul:1,healMul:1,dmgMul:1,speedMul:1},cameras:{main:{shake(){}}},grid:{query:()=>[]},
      world:{constrain(e){e.x=Math.max(220,Math.min(3780,e.x));e.y=Math.max(620,Math.min(3780,e.y));},solids:{query:()=>[]}},
      add:{image:visual,sprite:visual},announce(){},gems:{drop:()=>true},progression:{chests:[],dropChest(x,y){const c={x,y};this.chests.push(c);return c;}},hazards:[],addHazard(h){this.hazards.push(h);},dmgScale:()=>1,
      spawningEnabled:true,bossStarted:false,ended:false,gameReady:true};
    sc.ui={paused:false,lvlActive:false}; sc.scene={get:()=>sc.ui,isActive:()=>!sc.isPaused,isPaused:()=>!!sc.isPaused,pause(){sc.isPaused=true;sc.events.emit('pause');},resume(){sc.isPaused=false;sc.events.emit('resume');}};
    sc.enemies=new ctx.Manager(sc);return sc;
  }
  return {ctx,scene,portal,win,document,events,audioNodes};
}
test('altar cancellation is free; confirmation pays exact max-HP cost once and cannot kill',()=>{
  const f=fixture(); assert.ok(f.ctx.Exploration,'exploration module exists'); const sc=f.scene();const ex=sc.exploration=new f.ctx.Exploration(sc);const altar=ex.altars[0];Object.assign(sc.player,{x:altar.x,y:altar.y});
  assert.equal(ex.interact(),true);assert.equal(sc.explorationOpen,true);assert.equal(sc.isPaused,true);assert.equal(ex.offers.length,3);ex.cancelMenu();assert.equal(sc.player.hp,100);assert.equal(sc.player.relics.length,0);assert.equal(ex.capture().altars[0].used,false);
  ex.interact();const choice=ex.offers[0];assert.equal(ex.confirmRelic(choice),true);assert.equal(sc.player.hp,75);assert.equal(sc.player.relics.length,1);assert.equal(ex.confirmRelic(choice),false);assert.equal(ex.capture().altars[0].used,true);assert.equal(f.events.length,1);assert.equal(f.events[0].key,'user:initial');
  const a2=ex.altars[1];Object.assign(sc.player,{x:a2.x,y:a2.y,hp:25});ex.interact();assert.equal(sc.player.hp,25);assert.equal(sc.explorationOpen,false);assert.equal(sc.player.relics.length,1);
});
test('altar rechecks capacity, ownership, HP and other menus before charging',()=>{
  const f=fixture(); assert.ok(f.ctx.Exploration,'exploration module exists');const sc=f.scene();const ex=new f.ctx.Exploration(sc);Object.assign(sc.player,ex.altars[0]);
  sc.chestOpen=true;assert.equal(ex.interact(),false);sc.chestOpen=false;sc.player.relics=['twin_seal','blood_oath','glass_heart'];assert.equal(ex.interact(),true);assert.equal(sc.player.hp,100);assert.equal(sc.explorationOpen,false);
  sc.player.relics=[];ex.interact();const id=ex.offers[0];sc.player.relics.push(id);assert.equal(ex.confirmRelic(id),false);assert.equal(sc.player.hp,100);ex.cancelMenu();
  ex.interact();sc.player.hp=25;assert.equal(ex.confirmRelic(ex.offers[0]),false);assert.equal(sc.player.hp,25);ex.cancelMenu();
});
test('failed dialog creation releases its own pause and keeps the altar unconsumed',()=>{
  const f=fixture();const sc=f.scene();const ex=new f.ctx.Exploration(sc);Object.assign(sc.player,ex.altars[0]);f.portal.openDialog=()=>null;
  ex.interact();assert.equal(sc.explorationOpen,false);assert.equal(sc.isPaused,false);assert.equal(sc.player.hp,100);assert.equal(ex.capture().altars[0].used,false);
});
test('ambush uses a strict 35 percent threshold and the existing reserved-capacity pool',()=>{
  for(const [roll,want] of [[.349,6],[.35,0]]){
    const f=fixture();f.ctx.Math.random=()=>roll;const sc=f.scene();const ex=new f.ctx.Exploration(sc);Object.assign(sc.player,ex.altars[0]);ex.interact();ex.confirmRelic(ex.offers[0]);assert.equal(sc.enemies.alive,want);assert.equal(sc.player.hp,75);assert.ok(sc.enemies.alive<=8);
  }
});
test('a modal stacked over the altar blocks confirmation and closing never resumes that modal',()=>{
  const f=fixture();const sc=f.scene();const ex=new f.ctx.Exploration(sc);Object.assign(sc.player,ex.altars[0]);ex.interact();ex.dialog.panel.inert=true;assert.equal(ex.confirmRelic(ex.offers[0]),false);assert.equal(sc.player.hp,100);ex.dialog.panel.inert=false;
  sc.ui.paused=true;ex.cancelMenu();assert.equal(sc.isPaused,true);assert.equal(sc.player.hp,100);
});
test('symbols, pending full-pool summon and snapshots preserve unique optional rewards',()=>{
  const f=fixture();assert.ok(f.ctx.Exploration,'exploration module exists');const sc=f.scene();const ex=sc.exploration=new f.ctx.Exploration(sc);
  for(const s of ex.symbols){Object.assign(sc.player,{x:s.x,y:s.y});assert.equal(ex.interact(),true);ex.interact();}assert.equal(ex.getStatus().symbolsFound,3);
  for(let i=0;i<8;i++)sc.enemies.spawn('ordinary',1000+i*20,1000,1,false,true);
  Object.assign(sc.player,{x:ex.shrine.x,y:ex.shrine.y});ex.interact();assert.equal(ex.getStatus().secretState,'pending');assert.equal(sc.progression.chests.length,0);
  sc.enemies.kill(sc.enemies.pool[0],true);ex.update(.016);const boss=ex.encounter.enemy;assert.equal(boss.id,'forest_oathkeeper');assert.equal(boss.isBoss,true);assert.equal(boss.isMiniBoss,false);assert.ok(ex.getStatus().boss.hp>1000);
  sc.enemies.kill(boss,false);assert.equal(ex.getStatus().secretState,'defeated');assert.equal(sc.bossStarted,false);assert.equal(sc.ended,false);ex.onKill(boss);ex.update(.016);assert.equal(sc.progression.chests.length,1);assert.equal(f.events.filter(x=>x.event.type==='secret').length,1);assert.equal(f.events.find(x=>x.event.type==='secret').event.id,'forest-oathkeeper');
  const saved=ex.capture();ex.destroy();const restore=new f.ctx.Exploration(sc,saved);restore.update(.016);assert.equal(restore.getStatus().symbolsFound,3);assert.equal(sc.progression.chests.length,1);assert.equal(restore.getStatus().secretState,'defeated');
});
test('silent despawn, recycled UID and official boss cleanup never grant secret rewards',()=>{
  const f=fixture();assert.ok(f.ctx.Exploration,'exploration module exists');const sc=f.scene();const ex=sc.exploration=new f.ctx.Exploration(sc,{symbols:[true,true,true]});Object.assign(sc.player,{x:ex.shrine.x,y:ex.shrine.y});ex.interact();const e=ex.encounter.enemy;const oldUid=e.uid;
  sc.enemies.kill(e,true);const recycled=sc.enemies.spawn('ordinary',500,500,1,false,true);assert.equal(recycled,e);assert.notEqual(recycled.uid,oldUid);assert.equal(recycled.isExplorationBoss,false);ex.onKill(recycled);ex.update(.01);assert.notEqual(ex.getStatus().secretState,'defeated');assert.equal(sc.progression.chests.length,0);
  Object.assign(sc.player,{x:ex.shrine.x,y:ex.shrine.y});ex.interact();for(let i=0;i<16;i++)ex.update(.25);assert.ok(sc.hazards.length>0,'guardian creates announced hazards');ex.beforeBossFight();assert.equal(sc.hazards.length,0);assert.equal(ex.getStatus().boss,null);assert.equal(sc.progression.chests.length,0);assert.equal(f.events.length,0);
});
test('a won secret retries a full chest pool during the official fight without duplicating delivery',()=>{
  const f=fixture();const sc=f.scene();const ex=sc.exploration=new f.ctx.Exploration(sc,{symbols:[true,true,true]});Object.assign(sc.player,{x:ex.shrine.x,y:ex.shrine.y});ex.interact();let full=true;const drop=sc.progression.dropChest.bind(sc.progression);sc.progression.dropChest=(x,y)=>full?null:drop(x,y);
  sc.enemies.kill(ex.encounter.enemy,false);assert.equal(sc.progression.chests.length,0);ex.beforeBossFight();sc.bossStarted=true;full=false;ex.update(.1);ex.update(.1);assert.equal(sc.progression.chests.length,1);assert.equal(ex.capture().chestDelivered,true);
});
test('real player damage hurts and kills the pooled Guardian once without official-boss dispatch or knockback',()=>{
  const f=fixture();vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/game.js'),'utf8')+'\nthis.GameSceneApi=GameScene;',f.ctx);
  const sc=f.scene();const ex=sc.exploration=new f.ctx.Exploration(sc,{symbols:[true,true,true]});Object.assign(sc.player,{x:ex.shrine.x,y:ex.shrine.y});ex.interact();const e=ex.encounter.enemy;
  const damage=(amount)=>f.ctx.GameSceneApi.prototype.damageEnemy.call(sc,e,amount,{x:e.x-50,y:e.y,knock:500,kind:'slash'});
  damage(230);assert.equal(e.hp,2070);assert.equal(sc.totalDamage,230);assert.equal(e.kx,0);assert.equal(e.ky,0);assert.equal(ex.getStatus().secretState,'active');
  damage(10000);assert.equal(e.alive,false);assert.equal(sc.totalDamage,2300);assert.equal(sc.totalKills,1);assert.equal(ex.getStatus().secretState,'defeated');assert.equal(sc.progression.chests.length,1);damage(10000);assert.equal(sc.totalKills,1);assert.equal(f.events.filter(x=>x.event.type==='secret').length,1);assert.equal(sc.bossStarted,false);assert.equal(sc.ended,false);
});
test('random director excludes exploration-only, zero-weight and infinite-unlock entries',()=>{
  const f=fixture();assert.ok(f.ctx.Exploration,'exploration module exists');const sc=f.scene('castle');sc.stage.enemyIds=['forest_oathkeeper','ordinary'];const m=new f.ctx.Manager(sc);assert.equal(m.ids.includes('forest_oathkeeper'),false);assert.equal(m.pickType(0),'ordinary');
  f.ctx.ENEMIES.castle_ordinary={...f.ctx.ENEMIES.ordinary,stage:'castle'};f.ctx.ENEMIES.crypt_enemy={...f.ctx.ENEMIES.ordinary,stage:'catacombs'};sc.stage=null;const fallback=new f.ctx.Manager(sc);assert.deepEqual(Array.from(fallback.ids),['castle_ordinary']);
  fallback.ids=[];assert.equal(fallback.pickType(0),null);
});
test('mute lowers an already running master immediately and soundscape stays bounded',()=>{
  const f=fixture();assert.ok(f.ctx.AudioLandscape,'soundscape module exists');const sc=f.scene();const a=sc.soundscape=new f.ctx.AudioLandscape(sc);assert.equal(f.ctx.SfxApi.ctx,null,'no AudioContext before gesture');a.update(1);assert.equal(f.ctx.SfxApi.ctx,null);f.win.emit('pointerdown');a.update(.1);
  assert.equal(a.loops.length,2);for(let i=0;i<100;i++)a.update(.25);assert.ok(a.voices.size<=6);assert.ok(a.voices.size>0);const master=f.ctx.SfxApi.master;f.ctx.SfxApi.muted=true;assert.equal(master.gain.value,0);assert.equal(a.loops.length,0);assert.equal(a.voices.size,0);f.ctx.SfxApi.muted=false;a.update(.1);assert.equal(a.loops.length,2);a.destroy();
});
test('pause, blur, dialog and shutdown stop every continuous node without an update tick',()=>{
  const f=fixture();assert.ok(f.ctx.AudioLandscape,'soundscape module exists');const sc=f.scene();const a=sc.soundscape=new f.ctx.AudioLandscape(sc);f.win.emit('pointerdown');a.update(.1);sc.scene.pause();assert.equal(a.loops.length,0);assert.equal(f.ctx.SfxApi.master.gain.value,0);
  sc.scene.resume();a.update(.1);assert.equal(a.loops.length,2);sc.game.events.emit('blur');assert.equal(a.loops.length,0);sc.game.events.emit('focus');a.update(.1);assert.equal(a.loops.length,2);
  f.portal.dialogOpen=true;sc.events.emit('pause');assert.equal(a.loops.length,0);f.portal.dialogOpen=false;sc.events.emit('resume');a.update(.1);sc.events.emit('shutdown');assert.equal(a.loops.length,0);assert.equal(a.voices.size,0);a.update(20);assert.equal(a.loops.length,0);assert.ok(f.audioNodes.filter(n=>n.started).every(n=>n.stopped),'all sources stop on shutdown');
});
test('suspension also cuts playing SFX and missing WebAudio leaves exploration playable',()=>{
  const f=fixture();const sc=f.scene();const a=new f.ctx.AudioLandscape(sc);f.win.emit('pointerdown');f.ctx.SfxApi.play('boss');assert.ok(f.ctx.SfxApi.nodes.size>0);a.update(.1);sc.scene.pause();assert.equal(f.ctx.SfxApi.nodes.size,0);assert.ok(f.audioNodes.filter(n=>n.started).every(n=>n.stopped));a.destroy();
  const offline=fixture();delete offline.win.AudioContext;const sc2=offline.scene();const a2=new offline.ctx.AudioLandscape(sc2);offline.win.emit('pointerdown');a2.update(3);assert.equal(a2.loops.length,0);assert.equal(offline.ctx.SfxApi.ctx,null);const ex=new offline.ctx.Exploration(sc2);Object.assign(sc2.player,ex.altars[0]);assert.equal(ex.interact(),true);ex.cancelMenu();a2.destroy();
});
test('procedural exploration textures and custom guardian frames generate without external assets',()=>{
  const f=fixture(),drawn=[];const pen={r(){drawn.push(1);},p(){drawn.push(1);},line(){drawn.push(1);},disc(){drawn.push(1);},shadow(){drawn.push(1);}};const keys=[];
  f.ctx.SPR={make(sc,key,w,h,frames,k,draw){keys.push(key);for(let i=0;i<frames;i++){const before=drawn.length;draw(pen,i);assert.ok(drawn.length>before,'generated texture has visible drawing commands');}}};vm.runInContext('drawExplorationAssets({})',f.ctx);assert.equal(keys.length,5);assert.ok(keys.includes('exploration_shrine'));const art=f.ctx.ENEMY_ART.forest_oathkeeper;assert.equal(art.custom,true);for(let i=0;i<4;i++){const before=drawn.length;art.fn(pen,i);assert.ok(drawn.length>before,'each guardian animation frame is drawn');}
});
if(failures.length){console.error(failures.length+' failing checks');process.exitCode=1;}
