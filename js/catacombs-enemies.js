// Legião da Fortaleza das Correntes; IDs antigos preservam partidas salvas.
const CATACOMB_ENEMY_IDS = Object.freeze([
  'crypt_ghost', 'crypt_bone_archer', 'crypt_crawler',
  'crypt_acolyte', 'crypt_sentinel', 'crypt_banshee',
]);
Object.assign(ENEMIES, {
  crypt_ghost: {stage:'catacombs',name:'Diabrete das Brasas',kind:'melee',hp:28,speed:75,dmg:8,radius:11,xp:3,from:0,weight:8,ghost:true},
  crypt_bone_archer: {stage:'catacombs',name:'Arqueiro Infernal',kind:'ranged',hp:42,speed:44,dmg:7,radius:12,xp:5,from:40,weight:5,keep:285,maxAlive:16,
    shot:{type:'bolt',cd:3.3,range:520,count:3,spread:.18,speed:190,tint:0xffb65a}},
  crypt_crawler: {stage:'catacombs',name:'Cão das Correntes',kind:'melee',hp:22,speed:106,dmg:7,radius:10,xp:2,from:15,weight:7,
    charge:{range:310,min:100,windup:.7,dur:.42,mul:2.7,cd:5,recover:.75,col:0xff8f42}},
  crypt_acolyte: {stage:'catacombs',name:'Cultista da Fornalha',kind:'caster',hp:95,speed:42,dmg:9,radius:13,xp:9,from:155,weight:3,maxAlive:5,keep:310,
    shell:{pattern:'curse',range:550,radius:40,delay:1.5,dmg:18,cd:6.6,col:0xff943f,kind:'fire'},
    summon:{type:'crypt_ghost',count:1,cd:12}},
  crypt_sentinel: {stage:'catacombs',name:'Sentinela de Obsidiana',kind:'melee',hp:185,speed:34,dmg:17,radius:19,xp:12,from:250,weight:2.5,maxAlive:9,kb:.2,shield:true,
    sweep:{range:125,windup:1,cd:5.1,half:.75,dmg:23,col:0xff9e50}},
  crypt_banshee: {stage:'catacombs',name:'Súcubo das Cinzas',kind:'ranged',hp:85,speed:58,dmg:10,radius:14,xp:10,from:330,weight:2.8,maxAlive:6,ghost:true,keep:250,
    shot:{type:'magic',cd:4.4,range:560,count:5,spread:.24,speed:160,tint:0xffbe76,slow:.65}},
  crypt_executioner: {stage:'catacombs',name:'Carrasco Acorrentado',kind:'melee',hp:1800,speed:60,dmg:23,radius:30,xp:0,from:Infinity,weight:0,kb:.1,
    sweep:{range:175,windup:1.05,cd:4,half:.85,dmg:29,col:0xffa253},
    charge:{range:580,min:160,windup:1.1,dur:.6,mul:4,cd:6.5,recover:1.2,col:0xffa253}},
  crypt_soulkeeper: {stage:'catacombs',name:'Carcereiro Infernal',kind:'summoner',hp:3100,speed:44,dmg:22,radius:31,xp:0,from:Infinity,weight:0,kb:.1,keep:280,
    shell:{pattern:'curse',range:690,radius:55,delay:1.45,dmg:25,cd:4.6,col:0xffa243,kind:'fire'},
    shot:{type:'dark',cd:4,range:650,count:5,spread:.22,speed:185,tint:0xffbc62},
    summon:{type:'crypt_ghost',count:2,cd:11}},
});
const CATACOMB_EVENTS = Object.freeze([
  {t:55,type:'swarm',enemy:'crypt_crawler',count:16,msg:'Os cães rompem suas correntes!'},
  {t:130,type:'pack',list:{crypt_ghost:14,crypt_bone_archer:5},msg:'A legião sai das fornalhas!'},
  {t:235,type:'ring',enemy:'crypt_bone_archer',count:12,msg:'Flechas em brasa cercam você!'},
  {t:380,type:'pack',list:{crypt_acolyte:3,crypt_sentinel:5,crypt_ghost:9},msg:'O culto alimenta a Grande Fornalha!'},
  {t:470,type:'swarm',enemy:'crypt_banshee',count:6,msg:'As asas das cinzas cobrem a fortaleza!'},
  {t:640,type:'pack',list:{crypt_sentinel:7,crypt_bone_archer:10,crypt_crawler:12},msg:'A guarda de obsidiana marcha contra você!'},
  {t:790,type:'pack',list:{crypt_acolyte:4,crypt_banshee:6,crypt_ghost:16},msg:'O Arquidemônio convoca sua última legião!'},
]);

function drawCryptCreature(P, frame, kind) {
  const bob=frame%2,step=[0,1,0,-1][frame%4];
  const ink='#160e1b',iron='#38313f',edge='#80707a',skin='#ba4536',shade='#692a31';
  const fire='#ff7131',gold='#ffce73',hot='#fff1b3',horn='#c3a18d';
  // Small open links, painted into the sprite: no extra display objects.
  const link=(x,y)=>{P.r(x,y,3,3,ink);P.p(x+1,y,edge);P.p(x,y+1,edge);P.p(x+2,y+1,'#a99487');P.p(x+1,y+2,edge);};
  const flame=(x,y)=>{P.r(x,y+2,3,3,fire);P.p(x+1,y,fire);P.r(x+1,y+2,1,3,gold);P.p(x+1,y+3,hot);};
  P.shadow(12,22,kind==='crawler'?22:18);
  if(kind==='crawler') {
    // Four-legged furnace hound: plated back, collar and a long fanged muzzle.
    P.line(4,13+bob,1,8-bob,ink,2);P.p(1,7-bob,fire);
    for(const [x,s]of [[4,step],[8,-step],[15,-step],[18,step]]){
      P.line(x,15,x-1+s,20,ink,3);P.line(x,16,x-1+s,20,shade);P.r(x-2+s,21,3,1,horn);
    }
    P.r(3,11+bob,16,7,ink);P.r(4,12+bob,13,5,skin);P.r(5,11+bob,10,3,iron);
    for(let x=5;x<15;x+=4){P.line(x,10+bob,x+1,7+bob,ink,2);P.p(x+1,8+bob,edge);P.p(x+1,13+bob,fire);}
    P.r(16,9+bob,6,7,ink);P.r(17,10+bob,5,4,shade);P.r(19,13+bob,5,3,ink);P.r(20,13+bob,3,1,skin);
    P.line(17,10+bob,16,6+bob,horn);P.line(20,10+bob,21,7+bob,horn);P.r(19,10+bob,2,1,gold);
    P.p(20,15+bob,hot);P.p(22,15+bob,hot);link(14,13+bob);link(12,16+bob);return;
  }
  if(kind==='ghost') {
    // A crouching imp, with swept horns, hooked tail and little bat wings.
    P.line(7,12+bob,2,8-bob,ink,3);P.line(2,8-bob,3,15,shade,2);
    P.line(17,12+bob,21,8-bob,ink,3);P.line(21,8-bob,20,15,shade,2);
    P.line(16,17+bob,21,19-step,skin,2);P.line(21,19-step,22,16-step,skin);P.p(22,15-step,gold);
    P.r(7,11+bob,11,8,ink);P.r(8,12+bob,8,5,skin);P.r(10,14+bob,4,3,fire);
    P.line(8,17,6+step,20,skin,2);P.line(15,17,17-step,20,skin,2);P.r(5+step,21,4,1,horn);P.r(16-step,21,4,1,horn);
    P.r(6,5+bob,13,8,ink);P.r(7,6+bob,11,5,skin);P.r(8,5+bob,8,1,fire);
    P.line(7,6+bob,4,3+bob,ink,3);P.line(4,3+bob,5,1+bob,horn);P.line(17,6+bob,20,3+bob,ink,3);P.line(20,3+bob,19,1+bob,horn);
    P.r(8,8+bob,3,1,gold);P.r(14,8+bob,3,1,gold);P.r(10,11+bob,5,1,ink);P.p(10,11+bob,hot);P.p(14,11+bob,hot);
    P.line(7,13+bob,4,17+bob,skin,2);P.line(17,13+bob,20,16+bob,skin,2);P.p(3,18+bob,horn);P.p(21,17+bob,horn);return;
  }
  if(kind==='banshee') {
    // Armored ash-wing demon: covered torso, greaves and a forked tail.
    for(const s of [-1,1]){
      const root=12+s*4,tip=12+s*9;
      P.line(root,13+bob,tip,5+bob,ink,3);P.line(tip,5+bob,tip-s,16-bob,ink,2);
      P.line(root,13+bob,tip-s,12-bob,shade,3);P.line(tip,5+bob,root,13+bob,edge);
      P.p(tip,4+bob,horn);P.line(root,14+bob,tip-s*2,18-bob,skin);
    }
    P.r(9,10+bob,7,8,ink);P.r(10,11+bob,5,5,iron);P.r(10,12+bob,4,1,fire);P.r(11,15+bob,3,2,edge);
    P.line(10,18,8+step,21,iron,2);P.line(14,18,16-step,21,iron,2);P.p(8+step,22,horn);P.p(17-step,22,horn);
    P.line(12,18+bob,18+step,21,skin);P.line(18+step,21,20+step,19,fire);
    P.r(8,4+bob,9,6,ink);P.r(9,5+bob,7,4,skin);P.r(10,7+bob,5,1,gold);
    P.line(8,5+bob,6,1+bob,horn);P.line(16,5+bob,18,1+bob,horn);P.r(11,2+bob,3,3,iron);P.p(12,bob,fire);
    P.line(9,12+bob,6,16+bob,edge);P.line(16,12+bob,18,15+bob,edge);flame(18,12+bob);return;
  }
  if(kind==='acolyte') {
    // Furnace priest: sealed horned mask, heavy robe and a swinging censer.
    P.r(7,10+bob,11,10,ink);P.r(8,11+bob,8,8,'#81323b');P.r(6+step,20,13,2,ink);
    P.r(9,12+bob,2,8,fire);P.r(15,12+bob,1,8,'#b75c48');P.r(11,15+bob,4,2,iron);P.p(12,15+bob,gold);
    P.line(8,12+bob,4,15+bob,iron,3);P.line(17,12+bob,20,13+bob,iron,2);
    P.r(7,4+bob,11,7,ink);P.r(9,5+bob,7,5,iron);P.r(10,7+bob,5,1,gold);P.r(11,9+bob,3,1,fire);
    P.line(8,5+bob,6,2+bob,horn);P.line(16,5+bob,18,2+bob,horn);P.r(10,3+bob,5,1,'#a8503c');
    link(3,14+bob);link(3+step,17+bob);P.r(2+step,20,6,2,iron);P.r(3+step,19,4,2,fire);P.p(4+step,19,hot);
    flame(19,7+bob);return;
  }
  if(kind==='archer') {
    // Lean armored marksman and a hooked, ember-strung longbow.
    P.r(7,10+bob,9,9,ink);P.r(8,11+bob,7,6,iron);P.line(8,12+bob,13,16+bob,edge);P.p(12,14+bob,fire);
    P.line(9,18,6+step,21,shade,2);P.line(14,18,15-step,21,shade,2);P.r(5+step,22,4,1,horn);P.r(14-step,22,4,1,horn);
    P.line(6,12+bob,4,18+bob,skin,2);P.line(15,12+bob,19,13+bob,skin,2);
    P.r(6,4+bob,10,6,ink);P.r(7,5+bob,8,4,iron);P.r(8,7+bob,6,1,gold);P.r(9,9+bob,4,1,skin);
    P.line(7,5+bob,4,2+bob,horn);P.line(14,5+bob,17,2+bob,horn);P.p(10,4+bob,edge);
    P.line(20,4+bob,22,8+bob,ink,2);P.line(22,8+bob,22,16+bob,ink,2);P.line(22,16+bob,20,20+bob,ink,2);
    P.line(20,5+bob,22,10+bob,edge);P.line(22,14+bob,20,19+bob,edge);P.line(20,5+bob,20,19+bob,fire);
    P.line(13,13+bob,23,13+bob,horn);P.p(22,12+bob,hot);P.p(23,13+bob,fire);return;
  }
  // The three heavy demons have squat armor and separate equipment silhouettes.
  const keeper=kind==='keeper',executioner=kind==='executioner';
  P.r(5,10+bob,15,10,ink);P.r(6,11+bob,13,7,iron);P.r(7,11+bob,3,6,edge);P.r(15,12+bob,3,6,'#25212e');
  P.r(7,18,4,4,iron);P.r(14,18,4,4,iron);P.r(6+step,22,6,1,horn);P.r(13-step,22,6,1,horn);
  P.r(7,4+bob,12,7,ink);P.r(8,5+bob,10,5,iron);P.r(9,7+bob,8,1,ink);P.p(10,7+bob,gold);P.p(15,7+bob,gold);P.r(11,9+bob,4,1,fire);
  P.line(8,5+bob,5,2+bob,ink,3);P.line(5,2+bob,6,bob,horn);P.line(17,5+bob,20,2+bob,ink,3);P.line(20,2+bob,19,bob,horn);
  P.r(3,9+bob,5,4,ink);P.r(18,9+bob,5,4,ink);P.line(4,10+bob,3,7+bob,horn);P.line(21,10+bob,22,7+bob,horn);
  if(executioner){
    P.r(3,13+bob,4,6,skin);P.r(18,13+bob,4,5,skin);P.r(9,12+bob,8,4,shade);P.r(11,12+bob,4,3,fire);
    for(let i=0;i<4;i++)link(6+i*3,16+bob+(i%2));
    P.line(20,5+bob,20,22,edge,2);P.r(16,3+bob,8,5,ink);P.r(17,4+bob,6,3,iron);P.r(17,4+bob,1,3,gold);P.r(22,4+bob,1,3,fire);P.p(16,7+bob,horn);
  }else if(keeper){
    // An actual fire cage in the breastplate, plus iron keys and a brazier.
    P.r(9,11+bob,8,7,ink);P.r(10,12+bob,6,5,fire);P.r(11,13+bob,3,3,gold);
    for(const x of [10,13,16])P.r(x,11+bob,1,7,edge);P.r(9,11+bob,8,1,horn);P.r(9,17+bob,8,1,edge);
    link(3,12+bob);link(2+step,15+bob);P.r(2+step,18+bob,2,4,edge);P.r(3+step,20+bob,3,1,horn);
    P.line(21,8+bob,21,22,edge);P.r(18,7+bob,6,2,iron);flame(19,2+bob);
  }else{
    P.r(2,11+bob,7,10,ink);P.r(3,12+bob,5,7,iron);P.line(4,12+bob,4,17+bob,edge);P.line(4,17+bob,6,19+bob,edge);
    P.p(5,14+bob,fire);P.p(5,16+bob,gold);P.r(11,12+bob,5,4,shade);P.line(12,12+bob,15,15+bob,fire);
    P.line(21,5+bob,21,22,edge);P.r(20,3+bob,3,6,ink);P.line(21,3+bob,21,bob,horn);P.p(22,5+bob,fire);
  }
}
const cryptArt=(kind,k=2)=>({custom:true,frames:4,w:24,h:24,k,visualScale:1,fn:(P,f)=>drawCryptCreature(P,f,kind)});
Object.assign(ENEMY_ART,{
  crypt_ghost:cryptArt('ghost'),crypt_bone_archer:cryptArt('archer'),crypt_crawler:cryptArt('crawler'),
  crypt_acolyte:cryptArt('acolyte'),crypt_sentinel:cryptArt('sentinel',2.5),crypt_banshee:cryptArt('banshee'),
  crypt_executioner:cryptArt('executioner',4),crypt_soulkeeper:cryptArt('keeper',4),
});
