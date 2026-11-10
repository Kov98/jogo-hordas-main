// Real catalogs, director, AI and selection handlers run in an isolated VM.
// Regressions caught: forest IDs leaking, warning coordinates following the player,
// instant damage, missing stagger, fourth card offscreen or unreachable keyboard.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ctx = vm.createContext({ console, Phaser: { Scene: class {}, BlendModes: { ADD: 1 } },
  clamp: (v,a,b)=>Math.max(a,Math.min(b,v)), rand:(a,b)=>(a+b)/2,
  angleDiff:(a,b)=>a-b, Sfx:{play(){}}, menuBackdrop(){} });
for (const f of ['config','data','sprites','art','forest-enemies','enemies','scenes'])
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/'+f+'.js'),'utf8'),ctx,{filename:f+'.js'});
const run = code => vm.runInContext(code,ctx);
const checks = [];
function test(name, fn) { try { fn(); console.log('OK: '+name); } catch(e) { checks.push(name+': '+e.message); console.error('FAIL: '+name+': '+e.message); } }
test('fourteen forest creatures enter its director and remain absent from castle',()=>{
  assert.equal(run('FOREST_ENEMY_IDS.length'),14);
  assert.equal(run(`['forest_witch','forest_storm_mage'].every(id=>FOREST_ENEMY_IDS.includes(id)&&ENEMIES[id].stage==='forest'&&ENEMY_ART[id].frames===4)`),true);
  assert.equal(run(`new EnemyManager({add:{sprite:()=>({setVisible(){return this},setActive(){return this}})}}).ids.some(id=>id.startsWith('forest_'))`),false);
  for(const id of ['forest_witch','forest_storm_mage']) {
    assert.equal(run(`(()=>{const m=Object.create(EnemyManager.prototype);m.scene={difficulty:{id:'medium'}};m.ids=FOREST_ENEMY_IDS;m.counts={};m.weights=[];m.pickType(0);const before=m.weights[m.ids.indexOf('${id}')];m.pickType(500);return before===0&&m.weights[m.ids.indexOf('${id}')]>0})()`),true);
    assert.equal(run(`FOREST_EVENTS.some(ev=>ev.enemy==='${id}'||ev.list?.['${id}'])`),true);
  }
});
for (const [id, kind, delays] of [['forest_witch','dark',[1.5,1.5,1.5]],['forest_storm_mage','spark',[1.2,1.42,1.64]]]) {
  test(id+' announces fixed positions, damage scaling, stagger and cooldown',()=>{
    const result=run(`(()=>{
      if(!ENEMIES['${id}']) return null;
      const hazards=[],p={x:300,y:200};const sc={t:1,spawningEnabled:true,difficulty:{speedMul:1},fx:{burst(){}},addHazard:h=>hazards.push(h),world:{constrain(){}},grid:{query:()=>[]}};
      const m=Object.create(EnemyManager.prototype);m.scene=sc;m.tmpS=[];
      const e={def:ENEMIES['${id}'],x:0,y:200,state:'chase',atkCd:0,shellCd:0,contactCd:0,chargeCd:0,face:0,phase:0,strafe:1,kx:0,ky:0,slowUntil:0,sprite:{setFlipX(){}}};
      m.ai(e,.01,p,2);p.x=600;p.y=500;m.ai(e,.01,p,2);
      return {hazards,x:e.x,cd:e.shellCd};
    })()`);
    assert.ok(result,'creature exists');
    assert.equal(result.hazards.length,3,'one bounded three-zone attack during cooldown');
    assert.deepEqual(Array.from(result.hazards,h=>Number(h.delay.toFixed(2))),delays);
    assert.equal(result.hazards[0].x,300,'target stays where it was announced');
    assert.equal(result.hazards[0].y,200);
    assert.ok(result.hazards.every(h=>h.kind===kind&&h.dmg>20&&h.delay>=1.2));
    assert.ok(result.cd>3);
  });
}
test('four cards fit and left/right, four shortcuts, pointer and lastChar reach every hero',()=>{
  // Renderer boundary only: production SelectScene owns layout and input callbacks.
  run(`globalThis.objects=[];globalThis.handlers={};globalThis.saved={lastChar:'channeler'};
    function object(x,y,w,h,text){const o={x,y,width:w,height:h,text,handlers:{}};for(const key of ['setOrigin','setDepth','setTint','setBlendMode','setScale','setAlpha','setStrokeStyle','setInteractive','play'])o[key]=()=>o;o.on=(name,cb)=>{o.handlers[name]=cb;return o};objects.push(o);return o}
    globalThis.selectScene=new SelectScene();selectScene.cameras={main:{fadeIn(){},fadeOut(){},once(){}}};
    selectScene.registry={get:k=>saved[k],set:(k,v)=>saved[k]=v};selectScene.add={image:(x,y)=>object(x,y),sprite:(x,y)=>object(x,y),rectangle:(x,y,w,h)=>object(x,y,w,h),text:(x,y,text)=>object(x,y,0,0,text)};
    selectScene.input={keyboard:{on:(key,cb)=>handlers[key]=cb}};selectScene.events={once(){}};
    globalThis.window={addEventListener(){},removeEventListener(){}};menuBackdrop=()=>{};selectScene.create();`);
  assert.equal(run('selectScene.cards.length'),4);
  assert.equal(run('selectScene.ids[selectScene.sel]'),'channeler');
  const panels=run('selectScene.cards.map(c=>({x:c.panel.x,w:c.panel.width}))');
  for(let i=0;i<4;i++){assert.ok(panels[i].x-panels[i].w/2>=20);assert.ok(panels[i].x+panels[i].w/2<=1260);if(i)assert.ok(panels[i].x-panels[i].w/2>panels[i-1].x+panels[i-1].w/2);}
  run(`handlers['keydown-RIGHT']()`);assert.equal(run('selectScene.sel'),0);
  run(`handlers['keydown-LEFT']()`);assert.equal(run('selectScene.sel'),3);
  for(const [i,key] of ['ONE','TWO','THREE','FOUR'].entries()) {run(`selectScene.going=false;handlers['keydown-${key}']()`);assert.equal(run('saved.lastChar'),['vanguard','ranger','mage','channeler'][i]);}
  for(let i=0;i<4;i++){run(`selectScene.going=false;selectScene.cards[${i}].panel.handlers.pointerdown()`);assert.equal(run('selectScene.sel'),i);}
});
if(checks.length) { console.error(checks.length+' failing checks');process.exitCode=1; }
