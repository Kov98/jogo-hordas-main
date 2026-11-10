const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const ctx=vm.createContext({FOREST_BOSS:{name:'forest'},BOSS:{name:'castle'},CATACOMB_BOSS:{name:'catacombs'},
  FOREST_ENEMY_IDS:[],FOREST_EVENTS:[],CATACOMB_ENEMY_IDS:[],CATACOMB_EVENTS:[],CONFIG:{xpNeeded:n=>n*10}});
for(const file of ['data','stages'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/'+file+'.js'),'utf8'),ctx);
const result=vm.runInContext(`(()=>{
 const p={maxHp:120,baseSpeed:160,mods:{damage:1.24,speed:1,rate:1,range:1,area:1},level:8,xp:25,passives:{damage:2},kills:90,
  powers:[{def:POWERS.fire_hurricane,level:1},{def:POWERS.plasma,level:5}],relics:['glass_heart','twin_seal'],
  loadout:{skin:'royal',startPower:'axes'},dashLevel:3,dashSmoke:true};
 const saved=capturePlayerState(p), order=[];
 const restored={relics:[],addRelic(id){if(this.relics.includes(id)||!RELICS[id])return false;this.relics.push(id);order.push('relic');return true;},
  addPower(id){order.push(this.relics.length===2?'power-after-relics':'too-early');return {level:1,maxed:false,levelUp(){this.level++;}};}};
 restorePlayerState(restored,saved);
 return {saved,restored,order};
})()`,ctx);
assert.deepEqual(Array.from(result.saved.relics||[]),['glass_heart','twin_seal'],'snapshot must capture relic IDs');
assert.equal(result.saved.loadout.skin,'royal');
assert.deepEqual(Array.from(result.restored.relics),['glass_heart','twin_seal']);
assert.equal(result.restored.mods.damage,1.24,'derived relics must not change saved passive modifiers');
assert(!result.order.includes('too-early'),'restore relics before constructing powers');
assert.equal(result.restored.hp,result.restored.maxHp,'stage entry restores health once');
assert.equal(result.restored.loadout.startPower,'axes');
console.log('OK: carry/checkpoint saves relics and loadout; restores before powers without multiplying passive stats');
ctx.Phaser={Scene:class{}};ctx.Sfx={play(){}};ctx.SoulFinale=class{};
let guestCredits=0;
ctx.GamePortal={user:null,recordGuestVictory(){guestCredits++;}};
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/game.js'),'utf8'),ctx);
const victoryFixture=profile=>({metaProfileKey:profile,stageId:'catacombs',stage:{next:null},
  setCinematic(){},enemyShots:{clear(){}},hazards:[],fx:{ground:[]},pShots:{items:[]},gems:{items:[]},player:{powers:[]},
  isPractice:false,submitResult(){},scene:{get(){return {scene:{setVisible(){}}};}},showEnd(){}});
ctx.victory=victoryFixture('user.9');
vm.runInContext('GameScene.prototype.onBossDefeated.call(victory)',ctx);
assert.equal(guestCredits,0,'logging out of an account run must not grant guest campaign progress');
ctx.victory=victoryFixture('guest');
vm.runInContext('GameScene.prototype.onBossDefeated.call(victory)',ctx);
assert.equal(guestCredits,1);
console.log('OK: campaign victory credits the originating guest profile, never an account that logged out');
ctx.URLSearchParams=URLSearchParams;ctx.location={search:''};ctx.resolveDifficulty=id=>({id:id||'medium'});
ctx.GamePortal={user:{id:1},ready:Promise.resolve(),canPlayStage:()=>true,settings:{},
  beginRun:async()=>{ctx.GamePortal.user={id:2};return {run_id:'account-two',ranked:true,stage:'forest',profile_key:'user.2'};}};
ctx.MetaProgress={profileKey:()=>ctx.GamePortal.user?'user.'+ctx.GamePortal.user.id:'guest'};
const scene=vm.runInContext('new GameScene()',ctx);
Object.assign(scene,{stageId:'forest',charId:'vanguard',difficultyId:'medium',events:{once(){}},buildScene(){}});
scene.create().then(()=>{
  assert.equal(scene.metaProfileKey,'user.2','profile must match the run created after session refresh');
  console.log('OK: new-run identity is captured after session refresh, alongside the actual request');
}).catch(error=>{console.error(error);process.exitCode=1;});
