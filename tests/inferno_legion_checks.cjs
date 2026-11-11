// Real Inferno catalog, art, spawn director and attacks in a lightweight VM.
// Catches missing species, cross-stage leaks, early unlocks, lost telegraphs,
// unsupported texture keys and sprite geometry clipped by its own frame.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ctx=vm.createContext({console,Math:Object.create(Math),Phaser:{Scene:class{},BlendModes:{ADD:1}},Sfx:{play(){}}});
for(const id of ['config','util','data','difficulty','sprites','forest-enemies','catacombs-enemies','enemies','fx','boss','forest-boss','catacombs-boss','stages'])
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/'+id+'.js'),'utf8'),ctx,{filename:id+'.js'});
const run=code=>vm.runInContext(code,ctx),failures=[];
const additions=['inferno_ember_bat','inferno_chain_lancer','inferno_pyromancer','inferno_furnace_golem','inferno_ash_reaper'];
function test(name,fn){try{fn();console.log('OK: '+name);}catch(e){failures.push(name);console.error('FAIL: '+name+'\n'+e.stack);}}
function display(){const o={x:0,y:0,scaleX:1,scaleY:1,anims:{}};for(const k of ['setVisible','setActive','clearTint','play','setFlipX','setAlpha','setRotation','setDepth','setTintFill'])o[k]=()=>o;o.setTexture=(key,frame)=>{o.key=key;o.frame=frame;return o};o.setPosition=(x,y)=>{o.x=x;o.y=y;return o};o.setScale=s=>{o.scaleX=o.scaleY=s;return o};return o;}
function fixture(difficulty='medium'){
  const hazards=[],lines=[],corpses=[];
  const sc={stage:run('STAGES.catacombs'),difficulty:run(`DIFFICULTIES.${difficulty}`),stageHpMul:1.4,t:600,spawningEnabled:false,
    player:{x:300,y:0,radius:12,dead:false,takeDamage(){return true},kills:0,gainXp(){}},totalKills:0,
    fx:{ring(){},burst(){},teleLine(...args){lines.push(args)},corpse:e=>corpses.push(e.id)},
    add:{sprite:display},hazards,addHazard:h=>hazards.push(h),world:{constrain(){},outside:()=>false},
    grid:{query:()=>[]},dmgScale:()=>1,gems:{drop:()=>true},cameras:{main:{shake(){}}},enemyShots:{fire(){throw Error('new Inferno species must not allocate extra projectile streams')}}};
  ctx.sc=sc;const manager=run('new EnemyManager(sc)');sc.enemies=manager;return{sc,manager,hazards,lines,corpses};
}

test('all eleven Inferno species enter only its director, preserving both scheduled minis',()=>{
  const{manager}=fixture();assert.equal(manager.ids.length,11);
  for(const id of additions)assert.ok(manager.ids.includes(id),id+' is a random ordinary arrival');
  assert.deepEqual(Array.from(run('STAGES.catacombs.minis')),['crypt_executioner','crypt_soulkeeper']);
  assert.equal(run(`STAGES.castle.enemyIds.some(id=>id.startsWith('inferno_'))`),false);
  assert.equal(run(`STAGES.forest.enemyIds.some(id=>id.startsWith('inferno_'))`),false);
});

test('five arrivals unlock progressively before the boss and respect director species limits on every difficulty',()=>{
  for(const difficulty of ['easy','medium','hard','hardcore']){
    const{manager}=fixture(difficulty),div=difficulty==='hardcore'?2.5:difficulty==='hard'?1.3:1;
    for(const[id,second]of [['inferno_ember_bat',65],['inferno_chain_lancer',130],['inferno_pyromancer',220],['inferno_furnace_golem',410],['inferno_ash_reaper',565]]){
      const index=manager.ids.indexOf(id);assert.ok(index>=0,id+' exists');
      manager.pickType(second/div-.01);assert.equal(manager.weights[index],0,id+' cannot arrive early');
      manager.pickType(second/div+.01);assert.ok(manager.weights[index]>0,id+' unlocks');
      const definition=run(`ENEMIES['${id}']`);assert.ok(definition.maxAlive>0&&definition.maxAlive<=18);
      manager.counts[id]=definition.maxAlive;manager.pickType(899);assert.equal(manager.weights[index],0,id+' stops at its live cap');
    }
  }
});

test('mixed Inferno events remain sorted, modest and introduce every new role before 14 minutes',()=>{
  const events=run('CATACOMB_EVENTS');assert.equal(events.length,9);
  let prev=-1;for(const event of events){assert.ok(event.t>prev);prev=event.t;assert.ok((event.count||Object.values(event.list).reduce((a,b)=>a+b,0))<=29);}
  for(const id of additions)assert.ok(events.some(ev=>ev.t<840&&(ev.enemy===id||ev.list?.[id])),id+' participates in a scripted formation');
});

test('pyromancer marks one fixed fire circle with difficulty damage scaling and a cooldown',()=>{
  const{sc,manager,hazards}=fixture('hard');sc.spawningEnabled=true;
  const e=manager.spawn('inferno_pyromancer',0,0,1);assert.ok(e);e.shellCd=0;
  manager.ai(e,.01,sc.player,2.8);assert.equal(hazards.length,1);
  const h=hazards[0];assert.equal(h.shape,'circle');assert.equal(h.kind,'fire');assert.equal(h.x,300);assert.equal(h.y,0);
  assert.ok(h.delay>=1.25);assert.ok(Math.abs(h.dmg-47.6)<.000001);
  sc.player.x=410;manager.ai(e,.01,sc.player,2.8);assert.equal(hazards.length,1);assert.equal(h.x,300);assert.ok(e.shellCd>6);
});

test('lancer warns before moving along its captured charge direction and recovers',()=>{
  const{sc,manager,lines}=fixture();const e=manager.spawn('inferno_chain_lancer',0,0,1);assert.ok(e);e.chargeCd=0;
  manager.ai(e,.01,sc.player,1);assert.equal(e.state,'windup');assert.equal(lines.length,1);assert.ok(lines[0][5]>=.85);
  const warningX=e.x;sc.player.x=0;sc.player.y=300;
  manager.ai(e,.45,sc.player,1);assert.equal(e.state,'windup');assert.equal(e.x,warningX);
  manager.ai(e,.5,sc.player,1);assert.equal(e.state,'charge');
  manager.ai(e,.2,sc.player,1);assert.ok(e.x>warningX+20);assert.equal(e.y,0,'charge does not track dodging player');
  manager.ai(e,.5,sc.player,1);assert.equal(e.state,'recover');assert.ok(e.chargeCd>4);
});

test('golem and reaper stop to announce bounded cones with distinct reach and mobility',()=>{
  for(const[id,reach,minWarning]of [['inferno_furnace_golem',150,1.1],['inferno_ash_reaper',175,.75]]){
    const{sc,manager,hazards}=fixture();sc.player.x=90;const e=manager.spawn(id,0,0,1);assert.ok(e);e.atkCd=0;
    manager.ai(e,.01,sc.player,2);assert.equal(e.state,'cast');assert.equal(hazards.length,1);
    assert.equal(hazards[0].shape,'cone');assert.equal(hazards[0].r,reach);assert.ok(hazards[0].delay>=minWarning);assert.ok(hazards[0].dmg>=38);
    const x=e.x;manager.ai(e,.1,sc.player,2);assert.equal(e.x,x,'movement pauses during announced sweep');assert.equal(hazards.length,1);
  }
  assert.ok(run('ENEMIES.inferno_furnace_golem.shield && ENEMIES.inferno_furnace_golem.kb < .2'));
  assert.ok(run('ENEMIES.inferno_ash_reaper.speed > ENEMIES.inferno_furnace_golem.speed * 2'));
});

test('new ordinary creatures keep the shared pool, difficulty HP, silent cleanup and death keys',()=>{
  const{sc,manager,corpses,hazards}=fixture('hard');assert.equal(manager.pool.length,240);
  for(const id of additions){const e=manager.spawn(id,0,0,1.5);assert.ok(e);assert.equal(e.sprite.key,'e_'+id);assert.equal(e.maxHp,e.def.hp*1.5*1.5*1.4);manager.kill(e);assert.equal(corpses.at(-1),id);}
  sc.spawningEnabled=true;manager.director=()=>{};manager.update(.1);assert.equal(hazards.length,0,'dead creatures cannot begin an attack');
  sc.spawningEnabled=false;for(let i=0;i<245;i++)manager.spawn('inferno_ember_bat',0,0,1);
  assert.equal(manager.alive,238,'ordinary enemies retain two mini-boss reservations');manager.killAllSilently();assert.equal(manager.alive,0);assert.equal(corpses.length,5);
});

// Rasterize using the real pixel pen into tiny arrays; no browser/canvas packages.
function raster(art,frame){const pixels=new Map(),clipped=[];const g={fillStyle:'#000',fillRect(x,y,w,h){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){if(xx<0||yy<0||xx>=art.w||yy>=art.h)clipped.push([xx,yy]);else pixels.set(xx+','+yy,this.fillStyle);}}};ctx.rasterGraphics=g;ctx.rasterWidth=art.w;ctx.rasterHeight=art.h;const pen=run('makePen(rasterGraphics,rasterWidth,rasterHeight)');art.fn(pen,frame);return{pixels,clipped};}
test('five distinct silhouettes animate inside their frame with a bounded texture budget',()=>{
  const silhouettes=new Set();let bytes=0;
  for(const id of additions){const art=run(`ENEMY_ART['${id}']`);assert.ok(art,id+' has art');assert.equal(art.frames,4);assert.ok(art.custom);const frames=new Set();
    for(let f=0;f<4;f++){const image=raster(art,f);assert.equal(image.clipped.length,0,id+' frame '+f+' draws inside its texture');assert.ok(image.pixels.size>100);frames.add(JSON.stringify([...image.pixels]));if(f===0)silhouettes.add([...image.pixels].filter(([,c])=>!c.startsWith('rgba')).map(([p])=>p).sort().join('|'));}
    assert.ok(frames.size>=3,id+' has walking, wing or robe motion');bytes+=art.w*art.h*art.k*art.k*4*4;
  }
  assert.equal(silhouettes.size,5,'silhouettes differ independently of their palettes');assert.ok(bytes<=300000,'new texture sheets stay below 300 KB raw RGBA');
});
test('corpse renderer accepts each new generated texture key',()=>{
  const fx=Object.create(run('FX.prototype'));fx.corpses=additions.map(display);
  for(const id of additions)fx.corpse({id,x:10,y:20,sprite:{scaleX:1,flipX:false}});
  assert.deepEqual(fx.corpses.map(s=>s.key),additions.map(id=>'e_'+id));assert.ok(fx.corpses.every(s=>s.live));
});
if(failures.length){console.error(failures.length+' failing checks');process.exitCode=1;}else console.log('Inferno legion checks passed (9)');
