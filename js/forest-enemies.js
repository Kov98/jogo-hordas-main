// Criaturas da floresta noturna: silhuetas e animações próprias, no mesmo pool.
const FOREST_ENEMY_IDS = Object.freeze([
  'forest_wolf', 'forest_spider', 'forest_wisp', 'forest_bandit',
  'forest_rootling', 'forest_moth', 'forest_druid', 'forest_stalker',
  'forest_boar', 'forest_snake', 'forest_raven', 'forest_sentinel',
  'forest_witch', 'forest_storm_mage',
]);

Object.assign(ENEMIES, {
  forest_witch: {
    stage:'forest', name:'Bruxa da Névoa', kind:'caster', hp:70, speed:49, dmg:8, radius:13, xp:8, from:185, weight:2.8, maxAlive:5, keep:300,
    shell:{pattern:'curse',range:520,radius:43,delay:1.5,dmg:15,cd:6.4,col:0xc48aff,kind:'dark'},
  },
  forest_storm_mage: {
    stage:'forest', name:'Mago da Tempestade', kind:'caster', hp:92, speed:46, dmg:9, radius:14, xp:10, from:310, weight:2.3, maxAlive:4, keep:320,
    shell:{pattern:'storm',range:560,radius:35,delay:1.2,dmg:17,cd:6.8,col:0x8feaff,kind:'spark'},
  },
  forest_wolf: {
    stage:'forest', name:'Lobo da Penumbra', kind:'melee', hp:18, speed:88, dmg:6, radius:12, xp:1, from:0, weight:8,
    charge:{range:290,min:95,windup:.55,dur:.4,mul:2.7,cd:4.2,recover:.55,col:0xb2c9aa},
  },
  forest_spider: {
    stage:'forest', name:'Aranha do Brejo', kind:'melee', hp:24, speed:70, dmg:7, radius:12, xp:3, from:40, weight:5, maxAlive:18, poison:true,
    shell:{range:280,radius:40,delay:1.3,dmg:11,cd:5.4,col:0xa1c865,kind:'bone'},
  },
  forest_wisp: {
    stage:'forest', name:'Fogo Errante', kind:'ranged', hp:23, speed:46, dmg:3, radius:11, xp:4, from:75, weight:4, ghost:true, keep:260,
    shot:{type:'magic',cd:3.2,range:440,count:1,speed:145,tint:0x98efc7,slow:.5},
  },
  forest_bandit: {
    stage:'forest', name:'Saqueador Perdido', kind:'melee', hp:38, speed:62, dmg:10, radius:13, xp:4, from:95, weight:5,
    sweep:{range:95,windup:.7,cd:4.4,half:.6,dmg:13,col:0xd9b57e},
  },
  forest_rootling: {
    stage:'forest', name:'Raiz Retorcida', kind:'melee', hp:105, speed:34, dmg:12, radius:18, xp:7, from:150, weight:3.5, maxAlive:14, kb:.3,
    shell:{range:230,radius:46,delay:1.45,dmg:14,cd:6.2,col:0xb5b97c,kind:'bone'},
  },
  forest_moth: {
    stage:'forest', name:'Mariposa Fúnebre', kind:'flyer', hp:10, speed:105, dmg:5, radius:10, xp:2, from:20, weight:6, fly:true,
  },
  forest_druid: {
    stage:'forest', name:'Druida Corrompido', kind:'summoner', hp:94, speed:43, dmg:5, radius:14, xp:11, from:230, weight:2.5, maxAlive:4, keep:300,
    shot:{type:'dark',cd:4,range:480,count:3,spread:.25,speed:155,tint:0xa9ce80},
    summon:{type:'forest_rootling',count:1,cd:9},
  },
  forest_stalker: {
    stage:'forest', name:'Espreitador dos Galhos', kind:'melee', hp:145, speed:77, dmg:17, radius:17, xp:12, from:340, weight:2.5, maxAlive:8, kb:.45, ambush:true,
    charge:{range:510,min:120,windup:.85,dur:.55,mul:4,cd:5.2,recover:.95,col:0xc7c2a1},
  },
  forest_boar: {
    stage:'forest', name:'Javali Musgoso', kind:'melee', hp:65, speed:64, dmg:12, radius:15, xp:6, from:70, weight:4, maxAlive:10, kb:.45,
    charge:{range:360,min:110,windup:.85,dur:.55,mul:3.4,cd:5.5,recover:.9,col:0xd0bd8b},
  },
  forest_snake: {
    stage:'forest', name:'Serpente do Lodo', kind:'ranged', hp:28, speed:54, dmg:6, radius:10, xp:4, from:115, weight:4, maxAlive:14, keep:175, poison:true,
    shot:{type:'magic',cd:3.8,range:330,count:1,speed:175,tint:0xb2cf72,slow:1.1},
  },
  forest_raven: {
    stage:'forest', name:'Corvo das Ruínas', kind:'flyer', hp:17, speed:100, dmg:4, radius:10, xp:3, from:35, weight:4.5, maxAlive:16, fly:true,
    shot:{type:'bolt',cd:4.6,range:320,count:3,spread:.18,speed:185,tint:0xb0c2d4},
  },
  forest_sentinel: {
    stage:'forest', name:'Sentinela de Espinhos', kind:'melee', hp:175, speed:31, dmg:16, radius:18, xp:13, from:280, weight:2, maxAlive:5, kb:.2,
    sweep:{range:125,windup:1.05,cd:5.6,half:.8,dmg:20,col:0xb8cf9e},
  },
  forest_matriarch: {
    stage:'forest', name:'Matriarca do Brejo', kind:'caster', hp:1300, speed:55, dmg:20, radius:30, xp:0, from:Infinity, weight:0, keep:220, kb:.15, poison:true,
    shell:{range:680,radius:70,delay:1.35,dmg:22,cd:3.2,col:0xc3d170,kind:'bone'},
    shot:{type:'magic',cd:3.5,range:620,count:3,spread:.28,speed:170,tint:0xb6d780,slow:.7},
    summon:{type:'forest_spider',count:2,cd:11},
  },
  forest_huntsman: {
    stage:'forest', name:'Caçador Sem Sepultura', kind:'melee', hp:2700, speed:68, dmg:26, radius:31, xp:0, from:Infinity, weight:0, kb:.1,
    shot:{type:'bolt',cd:3.9,range:680,count:3,spread:.22,speed:240,tint:0xdcc49a},
    sweep:{range:160,windup:.95,cd:4.5,half:.7,dmg:27,col:0xdac39b},
    charge:{range:620,min:150,windup:1,dur:.65,mul:4,cd:6,recover:1.1,col:0xdac39b},
  },
});

const FOREST_EVENTS = Object.freeze([
  {t:50,type:'swarm',enemy:'forest_moth',count:16,msg:'As mariposas cobrem a lua!'},
  {t:85,type:'pack',list:{forest_boar:5,forest_wolf:6},msg:'A terra treme entre as raízes!'},
  {t:120,type:'pack',list:{forest_wolf:12,forest_bandit:4},msg:'Uivos entre as árvores!'},
  {t:175,type:'ring',enemy:'forest_snake',count:12,msg:'Sibilos surgem do lodo!'},
  {t:195,type:'ring',enemy:'forest_spider',count:18,msg:'O brejo se move ao seu redor!'},
  {t:235,type:'pack',list:{forest_witch:3,forest_wisp:5},msg:'Selos violetas rompem a névoa!'},
  {t:270,type:'pack',list:{forest_rootling:8,forest_wisp:6},msg:'As raízes despertam!'},
  {t:375,type:'pack',list:{forest_druid:2,forest_bandit:8,forest_wolf:8},msg:'O círculo dos druidas se fecha!'},
  {t:405,type:'pack',list:{forest_storm_mage:3,forest_raven:6},msg:'A tempestade encontrou seu caminho!'},
  {t:420,type:'swarm',enemy:'forest_raven',count:16,msg:'Os corvos encontraram sua trilha!'},
  {t:465,type:'swarm',enemy:'forest_stalker',count:8,msg:'Algo caça nas sombras!'},
  {t:560,type:'ring',enemy:'forest_moth',count:24,msg:'Uma nuvem de asas fúnebres!'},
  {t:675,type:'pack',list:{forest_rootling:10,forest_druid:2,forest_spider:10},msg:'A floresta defende seu coração!'},
  {t:735,type:'pack',list:{forest_sentinel:4,forest_rootling:6},msg:'As sentinelas abandonam as ruínas!'},
  {t:790,type:'pack',list:{forest_stalker:6,forest_wolf:14,forest_wisp:6},msg:'A última caçada começou!'},
]);

function drawForestWolf(P, frame) {
  const step=[0,1,0,-1][frame], bob=frame%2;
  const ink='#111e25', fur='#64717b', shade='#394b59', light='#a2afb1';
  P.shadow(12,21,21);
  // Cauda, quatro patas e dorso baixo deixam o quadrúpede legível.
  P.line(5,13+bob,1,9+bob,ink,3); P.line(5,13+bob,1,10+bob,shade,2);
  for(const [x,off] of [[5,-step],[10,step],[15,step],[19,-step]]) {
    P.r(x+off,15,2,5,ink); P.r(x+off,16,1,4,shade); P.r(x+off-1,20,3,1,light);
  }
  P.r(4,10+bob,15,7,ink); P.r(5,10+bob,13,5,fur); P.r(5,14+bob,12,2,shade);
  P.r(6,9+bob,7,1,light); P.r(7,11+bob,6,1,light); P.r(9,13+bob,5,1,shade);
  P.r(16,7+bob,5,8,ink); P.r(17,8+bob,4,5,fur); P.r(19,11+bob,4,3,ink); P.r(20,11+bob,3,2,light);
  P.line(16,8+bob,16,3+bob,ink,2); P.line(19,8+bob,20,4+bob,ink,2);
  P.p(17,5+bob,'#9b7974'); P.p(20,6+bob,'#9b7974'); P.p(20,9+bob,'#e4e9a0');
  P.r(19,13+bob,3,1,'#18232b'); P.p(20,14+bob,'#e4e7cf'); P.p(22,11+bob,'#111c24');
  P.p(4,12+bob,light); P.p(15,10+bob,light);
}

function drawForestSpider(P, frame) {
  const step=[0,1,0,-1][frame], ink='#101d20', shell='#384c40', hi='#85956b';
  P.shadow(12,21,19);
  for(let i=0;i<4;i++) {
    const y=9+i*3, foot=5+i*5+(i%2?step:-step);
    for(const side of [-1,1]) {
      const root=12+side*4, knee=12+side*(8+i%2), end=12+side*11;
      P.line(root,y,knee,y-3,ink,2); P.line(knee,y-3,end,Math.min(21,foot),ink,2);
      P.line(root,y,knee,y-3,hi); P.line(knee,y-2,end,Math.min(21,foot),shell);
    }
  }
  P.disc(12,13,6,ink); P.disc(12,12,5,shell); P.disc(11,10,3,'#5a704f');
  P.r(10,10,4,1,hi); P.r(11,12,2,3,'#a7c773'); P.p(12,15,'#c7d689');
  P.r(8,5,8,5,ink); P.r(9,5,6,4,shell); P.p(10,6,'#e2de9b'); P.p(13,6,'#e2de9b');
  P.p(11,5,'#e2de9b'); P.p(14,7,'#c1c990'); P.line(9,9,8,11,'#c8c5a1'); P.line(14,9,15,11,'#c8c5a1');
}

function drawForestWisp(P, frame) {
  const bob=[0,-1,0,1][frame], ink='#22484f', edge='#447b78', glow='#8ccbb4', core='#d5f4cd';
  // Chama assimétrica, sem robe ou cabeça humana.
  P.shadow(12,22,10); P.line(11,16+bob,7+(frame%2),21,ink,2); P.line(12,17+bob,15,20,edge);
  P.line(9,8+bob,8+(frame%2)*2,2,edge,2); P.line(13,7+bob,17,3+bob,ink,2); P.p(18,2+bob,glow);
  P.disc(12,12+bob,6,ink); P.disc(12,11+bob,5,edge); P.disc(11,11+bob,3,glow);
  P.r(10,8+bob,3,6,core); P.r(9,10+bob,5,2,core); P.p(10,8+bob,'#f4ffe9');
  P.p(15,13+bob,glow); P.p(5,11+frame,'#6aa398'); P.p(19,15-frame,glow);
  P.line(6,17+bob,4,19,edge); P.p(3,20,glow);
}

function drawForestBandit(P, frame) {
  const step=[0,1,0,-1][frame], bob=frame%2, ink='#161c24', coat='#725b4a', skin='#b5a38a';
  P.shadow(12,22,15);
  for(const [x,off] of [[8,step],[13,-step]]) { P.r(x,16,3,5,ink); P.r(x,18,2,2,'#4e5147'); P.r(x-1,20+off,4,2,'#293338'); }
  P.r(6,10+bob,12,8,ink); P.r(7,10+bob,10,7,coat); P.r(8,11+bob,2,5,'#9a7b55');
  P.r(11,10+bob,2,7,'#343b3a'); P.line(8,10+bob,15,16+bob,'#b39b73'); P.r(7,16+bob,10,2,'#383c35'); P.p(12,16+bob,'#cbb385');
  P.r(5,11+bob,2,6,ink); P.r(5,12+bob,1,4,coat); P.r(5,16+bob,2,2,skin);
  P.r(17,11+bob,2,5,ink); P.r(17,12+bob,1,3,coat); P.r(18,15+bob,2,2,skin);
  P.r(8,4+bob,8,6,ink); P.r(9,5+bob,6,4,skin); P.r(8,3+bob,8,3,'#323b39'); P.r(9,3+bob,6,1,'#586153');
  P.r(9,9+bob,6,2,'#563f35'); P.p(10,7+bob,ink); P.p(14,7+bob,ink); P.p(14,5+bob,'#795747');
  P.r(7,10+bob,10,1,'#894d45'); P.r(6,10+bob,2,4,'#894d45');
  // Machado curto de lenhador e bolsa na cintura, sem capuz.
  P.r(20,8+bob,1,13,'#936e45'); P.r(19,6+bob,4,5,'#344550'); P.r(21,6+bob,2,4,'#a3b0ad'); P.r(22,7+bob,1,3,'#d6dac1');
  P.r(7,17+bob,3,3,'#98794f'); P.p(8,17+bob,'#c5a76f');
}

function drawForestRootling(P, frame) {
  const step=[0,1,0,-1][frame], ink='#172426', bark='#665c45', ridge='#a5986b', moss='#71815b';
  P.shadow(12,22,22);
  for(const [x,off] of [[7,step],[14,-step]]) { P.line(x,16,x-2+off,22,ink,3); P.line(x,17,x-2+off,21,bark,2); P.line(x-2+off,21,x-5+off,22,ridge); }
  P.r(6,7,13,12,ink); P.r(7,7,11,10,bark); P.r(8,7,2,10,ridge); P.r(15,8,2,10,'#464b3d');
  P.line(12,8,11,12,'#393d32'); P.line(11,12,14,17,'#393d32'); P.line(8,15,12,15,'#baa775');
  P.line(7,10,3,15+step,ink,4); P.line(4,15+step,1,19+step,ink,3); P.line(7,10,3,15+step,bark,2); P.line(4,15+step,1,19+step,ridge);
  P.line(18,9,21,13-step,ink,3); P.line(21,13-step,22,19-step,bark,2); P.line(21,17-step,19,21-step,ridge);
  P.line(8,8,6,2,ink,3); P.line(7,5,3,3,bark,2); P.line(6,2,9,1,ridge);
  P.line(15,8,17,2,bark,3); P.line(17,4,21,1,ridge); P.line(17,4,16,0,ridge);
  P.r(9,10,7,3,'#242f2b'); P.p(10,11,'#d4e0a2'); P.p(14,11,'#d4e0a2'); P.r(11,15,3,2,'#242f2b');
  P.r(6,7,5,2,moss); P.r(16,7,4,2,moss); P.p(7,6,'#a5ac73'); P.p(17,16,moss);
}

function drawForestMoth(P, frame) {
  const wing=[0,2,4,2][frame], ink='#1d2830', edge='#8b897b', pale='#c2c0a0', dark='#646b68';
  P.shadow(12,22,11);
  for(const side of [-1,1]) {
    const g=P.g;g.save();if(side===-1){g.translate(24,0);g.scale(-1,1);}
    P.line(11,9,3+wing,3,ink,3); P.r(2+wing,4,9-wing,9,ink); P.r(3+wing,5,7-wing,7,edge);
    P.line(4+wing,5,10,10,pale,2); P.r(4+wing,10,5-wing,3,dark);
    P.line(11,12,5+wing,18,ink,3); P.r(5+wing,13,6-wing,6,edge); P.r(7+wing,14,3,3,pale);
    P.disc(6+wing/2,8,2,dark); P.p(6+wing/2,8,pale); P.p(4+wing,6,'#e3dfbe');
    g.restore();
  }
  P.r(10,7,4,12,ink); P.r(11,7,2,11,'#a19e83'); P.r(11,10,2,1,'#dad1ae'); P.r(11,14,2,1,'#565f5c');
  P.line(11,7,9,3,'#d8cfaa'); P.line(12,7,14,3,'#d8cfaa'); P.p(11,8,'#e6e9bf');
}

function drawForestDruid(P, frame) {
  const bob=frame%2, step=[0,1,0,-1][frame], ink='#15242a', bark='#534b3b', pale='#b2b897';
  P.shadow(12,22,17);
  // Corpo de galhos e manto de folhas rasgadas, com o rosto de madeira exposto.
  P.line(8,16,7+step,21,ink,3); P.line(14,16,15-step,21,ink,3); P.line(8,17,7+step,21,'#7f7556'); P.line(14,17,15-step,21,'#7f7556');
  P.r(6,10+bob,12,9,ink); P.r(7,10+bob,10,8,'#3b5549'); P.r(7,11+bob,2,7,'#64785b'); P.r(14,12+bob,3,7,'#293e38');
  for(const [x,y] of [[5,11],[7,17],[10,18],[15,18],[17,12]]) {P.r(x,y+bob,2,3,'#637652');P.p(x,y+bob,'#91996b');}
  P.r(9,4+bob,6,7,ink); P.r(10,4+bob,4,7,'#85836a'); P.r(10,5+bob,1,4,pale); P.r(11,7+bob,3,1,'#263d39'); P.p(11,7+bob,'#cde9a8'); P.p(13,7+bob,'#cde9a8');
  P.line(10,5+bob,7,1,bark,2); P.line(8,3,4,2,pale); P.line(8,3,8,0,pale);
  P.line(14,5+bob,17,1,bark,2); P.line(16,3,20,2,pale); P.line(17,1,18,0,pale);
  P.line(7,12+bob,3,15+bob,bark,2); P.p(3,15+bob,pale); P.line(17,12+bob,20,13+bob,bark,2);
  P.line(20,6+bob,20,22,'#8f835b',2); P.line(20,7+bob,17,5+bob,'#b6af79'); P.line(20,7+bob,23,3+bob,'#b6af79');
  P.disc(20,6+bob,2,'#536c50'); P.p(20,5+bob,'#d1e9aa'); P.p(19,7+bob,'#a9c28b');
  P.line(10,11+bob,13,17+bob,'#a29d73'); P.r(11,13+bob,3,2,'#d2d0a0');
}

function drawForestStalker(P, frame) {
  const step=[0,1,0,-1][frame], bob=frame%2, ink='#142129', fur='#45524e', hi='#859081', bone='#bbb99a';
  P.shadow(12,22,21);
  // Dorso curvado, braços longos e mandíbula animal, sem equipamento humano.
  P.line(8,14,5+step,20,ink,4); P.line(14,14,17-step,21,ink,4); P.line(8,14,5+step,20,fur,2); P.line(14,14,17-step,21,fur,2);
  P.r(5+step,20,4,2,bone); P.r(16-step,21,5,1,bone);
  P.r(6,8+bob,12,8,ink); P.r(7,8+bob,10,6,fur); P.line(8,8+bob,13,7+bob,hi,2); P.r(8,10+bob,2,3,hi);
  P.line(7,11+bob,2,16-step,ink,4); P.line(2,16-step,1,20-step,hi,2); P.p(0,21-step,bone); P.p(2,21-step,bone);
  P.line(16,11+bob,21,16+step,ink,3); P.line(21,16+step,22,20+step,fur,2); P.p(21,21+step,bone); P.p(23,21+step,bone);
  P.r(12,5+bob,7,6,ink); P.r(13,5+bob,5,5,hi); P.r(16,8+bob,5,3,ink); P.r(17,8+bob,4,1,bone); P.r(17,10+bob,3,1,bone); P.p(18,7+bob,'#e6dd9d');
  P.line(13,6+bob,10,2,bone,2); P.line(10,2,6,1,bone); P.line(10,2,11,0,bone);
  P.line(16,5+bob,18,1,hi,2); P.line(18,2,22,0,bone); P.p(13,12+bob,'#a5ac8a'); P.r(9,7+bob,2,1,'#738165');
}

function drawForestBoar(P, frame) {
  const step=[0,1,0,-1][frame], bob=frame%2, ink='#172324', hide='#655f4b', shade='#414a3b', moss='#89916a', ivory='#ddd4ad';
  P.shadow(12,22,22);
  P.line(4,13+bob,1,11+bob,ink,2);P.line(1,11+bob,2,9+bob,hide);
  for(const [x,off] of [[5,step],[9,-step],[15,step],[18,-step]]) {
    P.r(x+off,16,3,5,ink);P.r(x+off,17,2,3,shade);P.r(x+off,20,3,2,'#2c3331');
  }
  P.r(3,9+bob,16,10,ink);P.r(4,10+bob,14,8,hide);P.r(4,15+bob,13,3,shade);
  P.line(5,9+bob,15,8+bob,moss,2);P.r(6,11+bob,3,2,'#929278');P.r(11,12+bob,3,2,'#797b5b');
  for(const [x,y] of [[5,7],[8,6],[11,6],[14,7]]) P.line(x,y+bob,x+1,10+bob,ink,2);
  P.r(16,10+bob,6,8,ink);P.r(17,11+bob,5,6,hide);P.r(20,13+bob,4,4,'#9a8e71');
  P.r(17,8+bob,3,4,ink);P.p(18,9+bob,'#9e8b6d');P.p(20,12+bob,'#e5d799');
  P.r(22,14+bob,2,1,'#313c35');P.line(20,17+bob,23,16+bob,ivory,2);P.line(23,16+bob,23,12+bob,ivory);
  P.p(5,10+bob,moss);P.p(13,10+bob,'#b1ad7d');P.p(10,14+bob,shade);
}

function drawForestSnake(P, frame) {
  const sway=[0,1,0,-1][frame], ink='#182b2a', scale='#60775a', shade='#3e5746', belly='#b8bb7f', glint='#91a577';
  P.shadow(12,22,20);
  // Corpo sinuoso baixo e cabeça erguida, diferente dos quadrúpedes.
  const points=[[2,20],[7+sway,18],[13+sway,20],[18,17],[11-sway,14],[7,12],[12+sway,9],[18,9]];
  for(let i=1;i<points.length;i++) P.line(...points[i-1],...points[i],ink,5);
  for(let i=1;i<points.length;i++) P.line(...points[i-1],...points[i],scale,3);
  for(let i=1;i<points.length;i++) P.line(points[i-1][0],points[i-1][1]+2,points[i][0],points[i][1]+2,shade);
  P.line(8,19,14,20,belly);P.line(12,15,17,17,belly);P.line(8,12,13+sway,10,glint);
  for(const [x,y] of [[5,18],[9,19],[15,18],[10,13],[13,9]]) P.p(x+sway,y,'#c3c18b');
  P.r(16,5,6,6,ink);P.r(17,5,5,5,scale);P.r(18,9,4,1,belly);P.r(19,6,3,1,'#9aae74');
  P.p(20,7,'#e8d398');P.p(21,7,'#293e34');P.p(22,8,'#26392f');
  P.line(22,9,23,10+sway,'#b27e71');P.p(23,11+sway,'#d2a18b');
}

function drawForestRaven(P, frame) {
  const lift=[0,3,6,3][frame], bob=frame%2, ink='#15212e', feather='#35465c', blue='#657e90', edge='#9dafa8';
  P.shadow(12,22,10);
  for(const side of [-1,1]) {
    const ctx=P.g;ctx.save();if(side<0){ctx.translate(24,0);ctx.scale(-1,1);}
    P.line(12,12,3,3+lift,ink,4);P.line(12,11,4,3+lift,feather,2);
    P.line(6,6+lift,1,6+lift,ink,2);P.line(8,8+lift,2,10+lift,ink,2);
    P.line(10,10+lift,5,13+lift,ink,2);P.line(5,5+lift,10,10,blue);P.p(3,7+lift,edge);
    ctx.restore();
  }
  P.line(10,15+bob,8,20+bob,ink,3);P.line(12,15+bob,12,21+bob,feather,2);P.line(14,15+bob,16,20+bob,ink,2);
  P.r(9,9+bob,7,8,ink);P.r(10,9+bob,5,6,feather);P.r(11,11+bob,2,3,blue);
  P.r(12,5+bob,6,6,ink);P.r(13,5+bob,4,4,feather);P.line(17,8+bob,21,9+bob,'#a2ab9c',2);
  P.p(16,7+bob,'#d9e8c9');P.p(14,5+bob,blue);P.line(10,16+bob,9,18+bob,edge);P.line(14,16+bob,15,18+bob,edge);
}

function drawForestSentinel(P, frame) {
  const step=[0,1,0,-1][frame], bob=frame%2, ink='#162928', stone='#67756d', shade='#3e524c', light='#a0afa0', vine='#7c8f5d';
  P.shadow(12,22,22);
  for(const [x,off] of [[6,step],[14,-step]]) {
    P.r(x,16,4,5,ink);P.r(x+1,17,2,3,stone);P.r(x-1,21+Math.min(0,off),6,1,light);
  }
  P.r(4,8+bob,16,11,ink);P.r(5,9+bob,14,8,stone);P.r(6,10+bob,3,6,light);P.r(15,10+bob,3,8,shade);
  P.line(10,10+bob,13,13+bob,ink);P.line(13,13+bob,11,17+bob,ink);P.line(5,14+bob,18,14+bob,vine,2);
  P.r(8,3+bob,9,7,ink);P.r(9,3+bob,7,6,stone);P.r(9,4+bob,2,4,light);P.r(10,6+bob,6,2,shade);
  P.p(11,6+bob,'#dfebbb');P.p(14,6+bob,'#dfebbb');P.r(11,9+bob,3,1,ink);
  P.line(5,10+bob,1,6+bob,vine,2);P.line(8,9+bob,6,4+bob,light);P.line(18,10+bob,21,5+bob,vine,2);
  P.r(2,11+bob,3,7,ink);P.r(2,12+bob,2,4,shade);P.r(18,11+bob,3,5,ink);P.r(18,12+bob,2,4,stone);
  // Maça de raízes e pontas pálidas, presa à mão direita.
  P.line(21,8+bob,21,22,'#8b7855',2);P.r(19,4+bob,5,7,ink);P.r(20,5+bob,3,5,'#6c7953');
  P.line(20,5+bob,18,3+bob,light);P.line(22,6+bob,23,3+bob,light);P.line(20,9+bob,18,10+bob,vine);
  P.p(5,9+bob,vine);P.p(15,3+bob,vine);P.r(7,17+bob,3,2,'#879a67');
}

function drawForestMatriarch(P, frame) {
  const step=[0,1,0,-1][frame], ink='#122523', shell='#52634c', scar='#a3a577', egg='#c8cf9a';
  P.shadow(12,22,23);
  for(let i=0;i<4;i++) for(const side of [-1,1]) {
    const x=12+side*5, knee=12+side*(9-i%2), foot=12+side*11, y=7+i*3, move=i%2?step:-step;
    P.line(x,y,knee,y-3,ink,2); P.line(knee,y-3,foot,9+i*4+move,ink,2);
    P.line(x,y,knee,y-3,scar); P.line(knee,y-3,foot,9+i*4+move,shell);
  }
  P.disc(12,12,7,ink); P.disc(12,11,6,shell); P.disc(10,10,4,'#74815b');
  for(const [x,y] of [[8,10],[12,8],[15,10],[10,13],[14,14]]) { P.disc(x,y,2,ink); P.disc(x,y,1,egg); P.p(x,y-1,'#e5dfac'); }
  P.line(8,16,10,19,scar,2); P.line(16,16,14,19,scar,2);
  P.r(8,3,8,5,ink); P.r(9,3,6,4,shell); P.r(10,4,4,1,'#e7d892'); P.p(9,5,'#e7d892'); P.p(14,5,'#e7d892');
  P.line(9,6,7,9,egg,2); P.line(14,6,16,9,egg,2); P.r(10,18,4,2,ink); P.p(11,19,'#a9c15d');
}

function drawForestHuntsman(P, frame) {
  const step=[0,1,0,-1][frame], bob=frame%2, ink='#142127', cloth='#4e6058', skin='#b3baa7', leather='#82664c';
  P.shadow(12,22,19);
  // Chapéu largo de feltro, aljava, arco comprido e cutelo de caça.
  P.r(3,5+bob,4,12,ink); P.r(4,6+bob,2,10,leather);
  for(const x of [3,5]) {P.line(x,3+bob,x+1,10+bob,'#b9b58e');P.p(x,3+bob,'#dedcc0');}
  P.r(6,10+bob,13,10,ink); P.r(7,10+bob,10,9,cloth); P.r(7,11+bob,2,7,'#7c8872'); P.r(15,11+bob,3,8,'#344b45');
  P.r(8,18,3,4,ink); P.r(13,18,3,4,ink); P.r(7,21+Math.min(0,step),5,1,leather); P.r(13,21+Math.min(0,-step),5,1,leather);
  P.line(8,10+bob,16,17+bob,leather,2); P.p(12,13+bob,'#cab287'); P.r(7,17+bob,11,1,leather); P.r(11,17+bob,2,1,'#d5c093');
  P.r(8,4+bob,8,7,ink); P.r(9,4+bob,6,6,skin); P.r(9,7+bob,6,1,'#32413b'); P.p(10,7+bob,'#d6dfaa'); P.p(14,7+bob,'#d6dfaa');
  P.r(10,9+bob,5,2,'#687565'); P.r(9,2+bob,7,3,'#364a45'); P.r(6,4+bob,14,2,ink); P.r(7,4+bob,12,1,'#85907a');
  P.line(15,3+bob,18,0,'#aaa589'); P.p(18,1,'#d1caa2');
  P.r(5,11+bob,3,6,cloth); P.r(5,16+bob,2,2,skin); P.r(17,11+bob,2,5,cloth); P.r(18,15+bob,2,2,skin);
  P.line(20,2+bob,23,7+bob,leather,2); P.line(23,7+bob,23,16+bob,leather); P.line(23,16+bob,20,21+bob,leather,2); P.line(20,2+bob,20,21+bob,'#d5d5b1');
  P.r(2,13+bob,1,8,leather); P.r(1,12+bob,3,5,'#86968e'); P.r(1,12+bob,1,5,'#d9dcca');
}

function drawForestWitch(P, frame) {
  const b=frame%2, sway=[0,1,0,-1][frame], ink='#1b1727', robe='#584064', hi='#a67db5', violet='#d9a2ff';
  P.shadow(12,22,18);
  // Crooked brim and high bent crown separate her from the woodland druid.
  P.line(8,7+b,12,1+b,ink,4);P.line(12,1+b,17,2+b,ink,2);
  P.line(9,6+b,12,2+b,robe,2);P.p(15,1+b,hi);
  P.r(3,7+b,16,2,ink);P.r(4,7+b,14,1,hi);P.p(8,6+b,violet);
  P.r(9,9+b,6,5,ink);P.r(10,9+b,4,4,'#acaaa0');P.p(11,10+b,violet);P.r(14,11+b,2,1,'#d0c1ac');
  P.line(8,10+b,6,16+b,'#aeb2a1',2);P.line(15,10+b,16,15+b,'#767b77',2);
  P.r(7,13+b,9,6,ink);P.r(8,13+b,7,5,robe);P.r(7,18,10,3,robe);
  P.line(8,14+b,6+sway,21,hi);P.line(14,15+b,17-sway,21,ink,2);
  P.r(8+sway,21,3,1,'#b49bc1');P.r(14-sway,21,3,1,'#b49bc1');
  P.line(8,14+b,4,17+b,robe,2);P.p(3,17+b,'#c8b9ac');P.line(15,14+b,19,15+b,hi,2);
  P.line(20,7+b,20,22,'#836249',2);P.line(20,8+b,17,5+b,'#b18abf');
  P.disc(20,6+b,3,'#38233e');P.disc(20,6+b,2,'#9b58bb');P.p(20,5+b,'#f0cfff');
  P.p(2,10+frame,violet);P.p(22,13-frame,hi);P.r(10,16+b,3,1,violet);
}

function drawForestStormMage(P, frame) {
  const b=frame%2, step=[0,1,0,-1][frame], ink='#11252e', cloth='#305563', edge='#7db6c6', cyan='#9df4ff';
  P.shadow(12,22,19);
  // Bare white hair, broad lightning pauldrons and a forked rod: no hat.
  P.line(7,4+b,5,1+b,'#afc9d2',2);P.line(10,3+b,9,b,'#e5f7f7',2);P.line(14,3+b,17,1+b,edge,2);
  P.r(7,3+b,10,6,ink);P.r(8,3+b,8,2,'#d3e9ea');P.r(9,5+b,6,4,'#829b9f');P.r(9,6+b,6,1,ink);P.p(10,6+b,cyan);P.p(14,6+b,cyan);
  P.r(5,10+b,14,9,ink);P.r(6,10+b,12,8,cloth);P.r(7,11+b,2,6,edge);P.r(15,11+b,2,7,'#223d4c');
  P.line(12,10+b,10,14+b,cyan);P.line(10,14+b,13,14+b,cyan);P.line(13,14+b,11,18+b,cyan);
  P.line(5,10+b,2,7+b,edge,3);P.line(17,10+b,20,7+b,edge,3);P.p(2,7+b,cyan);P.p(20,7+b,cyan);
  P.r(5,12+b,2,5,cloth);P.r(18,12+b,2,5,cloth);P.p(5,16+b,'#b8cbca');P.p(19,16+b,'#b8cbca');
  P.r(8,18,3,3,ink);P.r(13,18,3,3,ink);P.r(7+step,21,5,1,edge);P.r(13-step,21,5,1,edge);
  P.line(22,8+b,22,22,'#667b83');P.line(22,8+b,20,4+b,cyan);P.line(22,8+b,23,3+b,cyan);
  P.p(3+frame,3+b,cyan);P.p(21-frame,10+b,'#dffeff');
}

const forestArt = (fn, k=2) => ({custom:true,frames:4,w:24,h:24,k,visualScale:1,fn});
Object.assign(ENEMY_ART, {
  forest_wolf:forestArt(drawForestWolf), forest_spider:forestArt(drawForestSpider),
  forest_wisp:forestArt(drawForestWisp), forest_bandit:forestArt(drawForestBandit),
  forest_rootling:forestArt(drawForestRootling), forest_moth:forestArt(drawForestMoth),
  forest_druid:forestArt(drawForestDruid), forest_stalker:forestArt(drawForestStalker),
  forest_boar:forestArt(drawForestBoar), forest_snake:forestArt(drawForestSnake),
  forest_raven:forestArt(drawForestRaven), forest_sentinel:forestArt(drawForestSentinel),
  forest_witch:forestArt(drawForestWitch), forest_storm_mage:forestArt(drawForestStormMage),
  forest_matriarch:forestArt(drawForestMatriarch,4), forest_huntsman:forestArt(drawForestHuntsman,4),
});
