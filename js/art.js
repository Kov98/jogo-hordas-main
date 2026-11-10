// Arte da partida: desenho em pixels, com paletas e contornos próprios para cada material.
function artShade(color, amount) {
  const n = parseInt(color.replace('#', ''), 16);
  return '#' + [16, 8, 0].map(shift => clamp(((n >> shift) & 255) + amount, 0, 255).toString(16).padStart(2, '0')).join('');
}

function drawRefinedHumanoid(P, f, o) {
  const b = f % 2, step = [0, 1, 0, -1][f % 4];
  const bone = o.rib || '#ded5bc', steel = o.trim || '#8191ab', cloth = o.body;
  P.shadow(12, 22, 15);
  if (o.cape) {
    P.r(5, 10 + b, 11, 10, artShade(o.cape, -20));
    P.r(5, 11 + b, 2, 8, o.cape); P.r(7, 18 + b, 7, 2, o.cape);
  }
  for (const [x, dy] of [[8, step], [13, -step]]) {
    P.r(x - 1, 17, 4, 5 + Math.min(0, dy), '#121724');
    P.r(x, 17, 2, 4, o.rib ? '#8c887e' : artShade(o.leg || cloth, 15));
    P.r(x, 20 + dy, 3, 2, o.rib ? bone : '#354252');
    P.p(x, 18, o.rib ? '#f0e6c9' : steel);
  }
  P.r(6, 10 + b, 12, 8, '#101520');
  P.r(7, 10 + b, 10, 7, cloth); P.r(7, 10 + b, 2, 6, artShade(cloth, 25));
  P.r(15, 11 + b, 2, 6, artShade(cloth, -12));
  if (o.rib) {
    P.r(11, 10 + b, 1, 7, '#b7ac94');
    for (let y = 11; y < 16; y += 2) { P.r(8, y + b, 3, 1, bone); P.r(12, y + b, 3, 1, bone); P.p(7, y + b, '#817c72'); }
    P.r(9, 17, 6, 1, '#aea38c'); P.p(10, 17, '#f4e5c4');
  } else {
    P.r(8, 11 + b, 6, 1, artShade(cloth, 36));
    P.r(11, 12 + b, 1, 4, artShade(cloth, 24));
    if (o.robe) { P.r(6, 16, 12, 5, cloth); P.r(7, 20, 10, 1, o.trim || steel); P.r(8, 16, 1, 4, artShade(cloth, 28)); P.r(15, 16, 1, 4, artShade(cloth, -20)); }
    P.r(7, 17, 10, 1, '#63503a'); P.r(11, 17, 2, 1, '#c5ab70');
  }
  const arm = o.rib ? bone : o.arm || cloth;
  P.r(4, 11 + b, 2, 5, artShade(arm, -25)); P.r(5, 11 + b, 1, 4, arm);
  P.r(17, 11 + b, 2, 5, artShade(arm, -25)); P.r(17, 11 + b, 1, 4, arm);
  P.r(4, 15 + b, 2, 2, arm); P.r(18, 15 + b, 2, 2, arm);
  if (o.shoulder) {
    for (const x of [4, 16]) { P.r(x, 9 + b, 4, 3, '#151a27'); P.r(x, 9 + b, 4, 1, artShade(o.shoulder, 35)); P.r(x, 10 + b, 3, 1, o.shoulder); }
  }
  const y = 3 + b;
  P.r(7, y, 10, 7, '#10141f');
  if (o.head === 'skull') {
    P.r(8, y, 8, 6, '#b0aa98'); P.r(8, y, 7, 1, '#fff0d0'); P.r(8, y + 1, 2, 2, '#e8dfc7');
    P.r(9, y + 2, 2, 2, '#24222a'); P.r(13, y + 2, 2, 2, '#24222a');
    P.p(10, y + 3, o.eye); P.p(13, y + 3, o.eye); P.p(12, y + 4, '#433c3d');
    P.r(9, y + 6, 6, 1, '#e7dcc1'); P.p(10, y + 5, '#e7dcc1'); P.p(13, y + 5, '#e7dcc1');
    P.p(11, y, '#8e8778');
    if (o.cap) { P.r(7, y - 1, 10, 2, o.cap); P.r(8, y - 1, 8, 1, artShade(o.cap, 40)); }
  } else if (o.head === 'helm') {
    P.r(7, y - 1, 10, 7, o.helm); P.r(8, y - 1, 8, 1, artShade(o.helm, 55));
    P.r(8, y, 2, 5, artShade(o.helm, 25)); P.r(15, y, 2, 5, artShade(o.helm, -12));
    P.r(8, y + 2, 8, 2, '#0c111b'); P.p(9, y + 2, o.eye); P.p(14, y + 2, o.eye);
    P.r(11, y, 2, 7, steel); P.p(11, y, '#d6d7d9'); P.r(8, y + 6, 8, 1, steel);
    if (o.plume) { P.r(10, y - 3, 3, 2, o.plume); P.r(12, y - 2, 3, 1, artShade(o.plume, 25)); }
  } else {
    P.r(7, y - 1, 10, 8, o.hood); P.r(9, y - 2, 6, 1, o.hood);
    P.r(8, y, 2, 5, artShade(o.hood, 32)); P.r(9, y + 1, 6, 5, '#11141e');
    P.p(10, y + 3, o.eye); P.p(14, y + 3, o.eye); P.r(9, y + 6, 6, 1, artShade(o.hood, 20));
  }
  if (o.scarf) { P.r(8, 10 + b, 7, 1, o.scarf); P.r(6, 10 + b, 2, 4, artShade(o.scarf, 22)); }
  if (o.shield) {
    P.r(1, 11 + b, 6, 7, '#b5a078'); P.r(2, 11 + b, 4, 7, o.shield);
    P.r(2, 18 + b, 4, 1, '#8c795c'); P.r(3, 12 + b, 1, 5, artShade(o.shield, 30));
    P.r(3, 14 + b, 2, 2, '#bdb9a0'); P.p(3, 14 + b, '#edf0d0');
  }
  // Armas com fio, guarda e empunhadura separados.
  const g = P.g; g.save(); g.translate(19, 15 + b);
  const wood = '#9f7847', metal = '#cbd8df';
  if (o.weapon === 'bow') {
    P.line(0, -10, 3, -6, wood); P.line(3, -6, 3, 0, wood); P.line(3, 0, 0, 4, wood); P.line(0, -10, 0, 4, '#dbd3ae'); P.r(-2, -3, 6, 1, '#e0d2ac');
  } else if (o.weapon === 'staff' || o.weapon === 'orbhand') {
    P.r(0, -8, 1, 13, wood); P.r(-1, -8, 3, 2, '#c9ac6e');
    P.disc(0, -10, 2, o.orb || '#b9a0ff'); P.p(-1, -11, '#f1fdff'); P.p(1, -8, '#a8d5df');
  } else if (o.weapon === 'cannon' || o.weapon === 'xbow') {
    P.r(-2, -4, 6, 3, '#2c3949'); P.r(-2, -4, 6, 1, '#acac9a'); P.r(3, -3, 1, 2, '#0e1522'); P.r(-1, -1, 2, 3, wood);
    if (o.weapon === 'xbow') P.line(1, -7, 1, 0, wood, 1);
  } else {
    P.r(0, -10, 2, 10, '#5c7185'); P.r(0, -9, 1, 8, metal); P.p(0, -10, '#faffeb');
    if (o.weapon === 'axe' || o.weapon === 'club') { P.r(-1, -10, 5, 3, '#929f9f'); P.r(3, -10, 1, 4, metal); }
    P.r(-2, 0, 6, 1, '#b69b61'); P.r(0, 1, 1, 3, wood); P.p(0, 4, '#c7b077');
  }
  g.restore();
}

function drawChanneler(P, f) {
  const b=f%2, step=[0,1,0,-1][f], ink='#101e29', charcoal='#303c49', edge='#627583', cyan='#79e7f2';
  P.shadow(12,22,16);
  P.r(5,9+b,13,11,ink);P.r(6,10+b,11,9,charcoal);P.line(6,10+b,6+step,20,cyan);P.line(16,10+b,17-step,20,'#387b8b');
  for(const [x,dy] of [[8,step],[13,-step]]) {P.r(x,17,3,4,ink);P.r(x,20+dy,4,2,edge);P.r(x,20+dy,3,1,cyan);}
  P.r(7,9+b,10,8,charcoal);P.r(8,10+b,2,6,edge);P.r(14,10+b,2,6,'#1c2b39');
  P.line(10,10+b,12,13+b,cyan);P.line(14,10+b,12,13+b,cyan);P.r(11,13+b,2,3,'#bafaff');P.r(7,17,10,1,'#4d7d89');
  P.r(7,3+b,10,7,ink);P.r(8,4+b,8,5,'#bf9b84');P.r(8,3+b,8,2,charcoal);P.r(8,4+b,2,2,edge);P.p(10,6+b,'#1b3546');P.p(14,6+b,cyan);
  // Open collar and a plasma focus held forward, instead of a staff or hat.
  P.r(6,9+b,3,3,edge);P.r(15,9+b,3,3,'#456473');P.r(4,11+b,3,5,charcoal);P.r(4,15+b,2,2,'#d9b297');
  P.line(17,12+b,20,14+b,charcoal,3);P.r(19,14+b,3,2,'#c8b29f');
  P.disc(21,11+b,3,'#23617b');P.disc(21,11+b,2,cyan);P.r(20,10+b,2,2,'#edffff');
  P.line(19,8+b,18,7+b,cyan);P.p(23,8+f,cyan);P.p(19-f%2,17+b,'#aff7ff');
}

function drawRefinedHero(P, f, id) {
  const b = f % 2, step = [0, 1, 0, -1][f % 4];
  const mage = id === 'mage', ranger = id === 'ranger';
  const cloth = mage ? '#7043a9' : ranger ? '#3e795e' : '#476680';
  const light = mage ? '#ad7ce0' : ranger ? '#8bb489' : '#a5c4d6';
  const dark = mage ? '#392653' : ranger ? '#203f39' : '#263b54';
  P.shadow(12, 22, 15);
  P.r(5, 10 + b, 13, 10, mage ? '#45315f' : ranger ? '#244b43' : '#7d3544');
  P.r(5, 11 + b, 2, 8, mage ? '#8c65b6' : ranger ? '#608568' : '#b45d5b');
  for (const [x, dy] of [[8, step], [13, -step]]) {
    P.r(x, 17, 3, 4, dark); P.r(x, 20 + dy, 4, 2, '#1a2230'); P.r(x, 20 + dy, 3, 1, '#8f8171');
  }
  P.r(6, 9 + b, 12, 9, '#141e2c'); P.r(7, 9 + b, 10, 8, cloth);
  P.r(7, 10 + b, 2, 6, light); P.r(15, 10 + b, 2, 6, dark);
  if (mage) {
    P.r(6, 16, 12, 5, cloth); P.r(8, 16, 1, 4, light); P.r(15, 16, 1, 4, dark);
    P.r(6, 20, 12, 1, '#c7ac6b'); P.p(10, 19, '#eedca4'); P.p(13, 19, '#eedca4');
  } else { P.r(9, 10 + b, 6, 1, light); P.r(10, 11 + b, 1, 5, artShade(cloth, 27)); }
  P.r(7, 17, 10, 1, '#8c683e'); P.r(11, 17, 2, 1, '#f1d493');
  for (const x of [4, 17]) { P.r(x, 10 + b, 3, 4, dark); P.r(x, 10 + b, 3, 1, light); P.r(x, 14 + b, 2, 2, '#eac49b'); }
  P.r(8, 4 + b, 8, 6, '#573f3a'); P.r(8, 4 + b, 7, 5, '#dbab86');
  P.r(8, 4 + b, 2, 3, '#f6d6ae'); P.p(10, 6 + b, '#253343'); P.p(14, 6 + b, '#253343'); P.r(11, 8 + b, 2, 1, '#b07d62');
  if (mage) {
    P.r(8, 9 + b, 7, 1, '#e3e0cd'); P.r(10, 10 + b, 4, 2, '#c3c5bf'); P.p(12, 12 + b, '#ece7d6');
    P.r(5, 3 + b, 14, 2, '#34264c'); P.r(6, 3 + b, 12, 1, '#a17ad1');
    P.r(8, 1 + b, 8, 2, '#6c4c99'); P.r(10, b, 5, 1, '#8862b5'); P.p(13, 2 + b, '#f0ce7e');
    P.r(20, 6 + b, 1, 15, '#785a39'); P.r(19, 7 + b, 3, 2, '#c5ad71');
    P.disc(20, 4 + b, 2, '#4aaecb'); P.r(19, 3 + b, 2, 2, '#b6f6ec'); P.p(19, 3 + b, '#ffffff');
    P.p(4, 5 + (f % 3), '#aedee8');
  } else if (ranger) {
    P.r(7, 2 + b, 11, 4, '#345c4b'); P.r(9, 1 + b, 7, 1, '#518361');
    P.r(7, 3 + b, 2, 6, '#8eb483'); P.r(15, 4 + b, 2, 5, '#244338');
    P.r(8, 9 + b, 8, 1, '#b1a76a'); P.r(6, 10 + b, 2, 3, '#6c915e');
    P.r(17, 7 + b, 2, 8, '#8c643e'); P.p(17, 5 + b, '#e6dcc0'); P.p(18, 4 + b, '#e6dcc0');
    P.line(3, 6 + b, 1, 10 + b, '#b99c64'); P.line(1, 10 + b, 1, 16 + b, '#b99c64'); P.line(1, 16 + b, 3, 20 + b, '#b99c64'); P.line(3, 6 + b, 3, 20 + b, '#d2d5bb');
  } else {
    P.r(7, 2 + b, 11, 5, '#5b7c96'); P.r(8, 2 + b, 9, 1, '#d3e1df');
    P.r(8, 3 + b, 2, 3, '#99bed0'); P.r(16, 3 + b, 2, 5, '#344b69');
    P.r(11, 3 + b, 1, 4, '#c2d7db'); P.r(7, 7 + b, 2, 2, '#84a0b2'); P.r(16, 7 + b, 2, 2, '#84a0b2');
    P.r(11, b, 3, 2, '#c16662'); P.r(12, b, 3, 1, '#f19a7b');
    P.r(20, 3 + b, 2, 12, '#7995ac'); P.r(20, 3 + b, 1, 11, '#f5f4da');
    P.r(18, 15 + b, 6, 1, '#d2b77d'); P.r(20, 16 + b, 1, 4, '#825b39');
    P.r(3, 12 + b, 4, 6, '#718d9d'); P.r(3, 12 + b, 4, 1, '#d3c894'); P.p(4, 14 + b, '#e9dca1');
  }
}

function drawRefinedEnvironment(scene) {
  const make = (key, w, h, fn, k = 2) => SPR.make(scene, key, w, h, 1, k, fn);
  const slab = (P, x, y, w, h, color) => {
    P.r(x, y, w, h, '#101923'); P.r(x + 1, y + 1, w - 2, h - 2, color);
    P.r(x + 2, y + 1, w - 4, 1, artShade(color, 13)); P.r(x + 1, y + 2, 1, h - 4, artShade(color, 6));
    P.r(x + 2, y + h - 2, w - 3, 1, artShade(color, -8)); P.p(x + w - 2, y + 1, '#18212d');
  };
  for (const key of ['ground', 'path', 'wall']) {
    make(key, 128, 128, P => {
      const rng = mulberry32(key === 'ground' ? 831 : key === 'path' ? 623 : 542);
      const palette = key === 'ground' ? ['#211d29', '#1d1a25', '#25212e', '#1a1722', '#27222f'] : key === 'path' ? ['#302b39', '#2b2734', '#36303f', '#282431'] : ['#292431', '#241f2d', '#302939', '#221d29'];
      P.r(0, 0, 128, 128, '#100e18');
      const h = key === 'wall' ? 10 : 16, w = key === 'wall' ? 24 : key === 'ground' ? 32 : 16;
      for (let y = 0, row = 0; y < 128; y += h, row++) for (let x = -(row % 2) * (w / 2); x < 128; x += w) {
        const color = palette[Math.floor(rng() * palette.length)];
        if (key === 'wall') slab(P, x, y, w, h, color);
        else {
          P.r(x, y, w, h, '#13101c'); P.r(x + 1, y + 1, w - 1, h - 1, color);
          P.r(x + 2, y + 1, w - 3, 1, artShade(color, 8)); P.r(x + 1, y + 2, 1, h - 4, artShade(color, 4));
          P.r(x + w - 5, y + h - 2, 3, 1, artShade(color, -8));
        }
        if (rng() < 0.22) { const xx = x + 4 + Math.floor(rng() * (w - 7)); P.line(xx, y + 2, xx - 2, y + h - 3, artShade(color, -13)); P.p(xx + 1, y + 2, artShade(color, 12)); }
        if (rng() < 0.5) P.r(x + 3 + Math.floor(rng() * (w - 7)), y + 3, 2, 1, artShade(color, 7));
      }
    });
  }
  const stone = (P, x, y, w, h) => slab(P, x, y, w, h, '#667482');
  for (const [key, broken] of [['pillar', false], ['pillar_broken', true]]) make(key, 21, broken ? 27 : 39, P => {
    const base = broken ? 25 : 37;
    P.shadow(10, base, 20); stone(P, 2, base - 4, 17, 4); stone(P, 4, base - 6, 13, 2);
    const top = broken ? 10 : 5;
    P.r(6, top, 9, base - 6 - top, '#546373'); P.r(6, top, 2, base - 6 - top, '#9da8ab'); P.r(13, top, 2, base - 6 - top, '#344556');
    for (const x of [9, 12]) P.r(x, top, 1, base - top - 6, '#354a5a');
    if (broken) { P.r(6, 9, 5, 1, '#b6beb5'); P.r(7, 7, 3, 2, '#697a84'); P.r(12, 8, 3, 2, '#93a2a5'); }
    else { stone(P, 2, 2, 17, 4); P.r(4, 6, 13, 2, '#82909b'); P.p(4, 3, '#d1c9a7'); P.p(16, 3, '#d1c9a7'); }
    P.p(5, base - 3, '#637e59'); P.r(15, base - 2, 3, 1, '#4b6651');
  });
  for (let variant = 0; variant < 3; variant++) make('rock' + (variant + 1), [18, 14, 23][variant], [14, 11, 15][variant], P => {
    const w = P.W, h = P.H; P.shadow(w / 2, h - 2, w - 1);
    P.r(2, 5, w - 4, h - 7, '#3e4c59'); P.r(4, 2, w - 8, h - 4, '#697885');
    P.r(2, 5, 5, 2, '#91a0a4'); P.r(5, 2, w - 11, 2, '#a4ada8');
    P.r(w - 6, 5, 4, h - 7, '#334253'); P.line(7, 4, 9, h - 4, '#485969');
    P.p(5, 4, '#c0c0ad'); P.r(4, h - 4, 4, 1, '#526f54');
  });
  make('barrel', 15, 18, P => {
    P.shadow(7, 16, 14); P.r(2, 3, 11, 12, '#583f30'); P.r(3, 2, 9, 14, '#9d744b');
    for (const x of [4, 7, 10]) { P.r(x, 4, 1, 11, '#604b36'); P.r(x + 1, 4, 1, 10, '#b58d59'); }
    for (const y of [5, 12]) { P.r(2, y, 11, 2, '#3c4956'); P.r(3, y, 9, 1, '#94a09b'); P.p(4, y, '#d3cba7'); }
    P.r(4, 1, 7, 1, '#d2ad74'); P.r(3, 2, 9, 1, '#6b5036'); P.p(9, 3, '#453728');
  });
  for (const [key, round] of [['tomb1', true], ['tomb2', false]]) make(key, 18, 24, P => {
    P.shadow(9, 22, 17); stone(P, 2, 20, 14, 3);
    P.r(4, 6, 10, 14, '#697781'); P.r(4, 6, 2, 13, '#a0aaa8'); P.r(12, 6, 2, 13, '#435462');
    P.r(5, 4, 8, 2, '#97a29f'); if (round) P.r(7, 3, 4, 1, '#adb7af');
    P.r(8, 8, 2, 7, '#344955'); P.r(6, 10, 6, 2, '#344955'); P.r(9, 8, 1, 6, '#b5baab');
    P.r(6, 17, 6, 1, '#455763'); P.p(4, 18, '#70835f');
  });
  make('rubble', 21, 12, P => {
    P.shadow(10, 10, 20); stone(P, 1, 5, 7, 5); stone(P, 8, 2, 8, 8); stone(P, 15, 7, 5, 3);
    P.p(6, 3, '#c0b9a2'); P.r(11, 1, 3, 1, '#7f8a8f');
  });
  make('bones', 21, 12, P => {
    P.line(3, 8, 13, 6, '#807f75', 2); P.line(3, 7, 13, 5, '#c9c9ae');
    for (const x of [2, 12]) { P.r(x, 5, 2, 2, '#dedcc2'); P.r(x + 1, 8, 2, 2, '#c9c9ae'); }
    P.r(14, 1, 6, 5, '#b2b29d'); P.r(15, 1, 4, 1, '#ece4c7'); P.p(15, 3, '#293641'); P.p(18, 3, '#293641');
    P.r(15, 6, 4, 1, '#818b82'); P.p(16, 5, '#33434a');
  });
  for (let id = 1; id <= 3; id++) make('tree' + id, 30, 42, P => {
    P.shadow(15, 39, 24);
    P.r(13, 19, 5, 19, '#3c3831'); P.r(13, 21, 2, 17, '#6f5f48'); P.r(16, 20, 2, 18, '#262d2d');
    P.line(15, 35, 9, 39, '#655844', 2); P.line(17, 34, 22, 39, '#403c34', 2);
    const branches = [[15, 21, 5 + id, 9], [16, 24, 25 - id, 12], [15, 19, 16 + id, 3], [13, 29, 4, 23]];
    for (const [x, y, ex, ey] of branches) { P.line(x, y, ex, ey, '#2b3230', 3); P.line(x - 1, y, ex - 1, ey, '#75674d'); P.line(ex, ey, ex - 3, ey - 4, '#4f4b3b'); P.line(ex, ey, ex + 3, ey - 5, '#4f4b3b'); }
    P.r(12, 31, 2, 4, '#627654'); P.p(12, 30, '#859161'); P.r(18, 37, 4, 1, '#536a4e');
  });
  make('banner', 15, 39, P => {
    P.shadow(7, 37, 11); P.r(7, 1, 2, 36, '#5c5140'); P.r(7, 1, 1, 36, '#b09a67');
    P.disc(8, 1, 1, '#ddc38b'); P.r(1, 4, 13, 1, '#c9b17a');
    P.r(2, 5, 11, 18, '#642d41'); P.r(2, 5, 2, 18, '#a4545c'); P.r(11, 5, 2, 18, '#3c293b');
    P.r(3, 23, 4, 3, '#81374b'); P.r(9, 23, 3, 2, '#642d41');
    P.r(4, 6, 7, 1, '#b39a66'); P.r(7, 10, 2, 9, '#d7bc7d'); P.r(5, 13, 6, 2, '#d7bc7d'); P.p(7, 10, '#fff0bf');
    P.r(7, 36, 6, 1, '#403a34');
  });
  make('torch', 12, 27, P => {
    P.r(5, 12, 3, 13, '#4f4033'); P.r(5, 14, 1, 10, '#b18b52'); P.r(3, 24, 7, 2, '#3c4148');
    P.r(2, 9, 9, 4, '#414b56'); P.r(3, 9, 7, 1, '#a6a48a'); P.r(4, 7, 5, 3, '#6c5643');
  });
  SPR.make(scene, 'flame', 12, 15, 4, 2, (P, f) => {
    P.r(3, 6, 6, 7, '#b24824'); P.r(2 + f % 2, 5, 6, 6, '#ed7f2a');
    P.r(4, 3 + f % 2, 4, 8, '#ffb84b'); P.r(5, 7, 2, 5, '#fff1b1');
    P.r(5 + f % 2, 1, 2, 5, '#eea13d'); P.p(3 + f, f % 2, '#ffd77e');
  });
  for (let variant = 1; variant <= 3; variant++) make('ruin' + variant, [0, 54, 42, 66][variant], 30, P => {
    P.shadow(P.W / 2, 28, P.W - 1);
    const topAt = x => 5 + Math.floor(Math.abs(Math.sin(x * 0.14 + variant)) * 13);
    for (let x = 1; x < P.W - 1; x++) {
      const top = topAt(x);
      P.r(x, top, 1, 28 - top, '#536372'); P.p(x, top, '#9caaa8');
      for (let y = top + 1; y < 27; y++) {
        if (y % 5 === 2 || (x + Math.floor(y / 5) % 2 * 5) % 10 === 0) P.p(x, y, '#2c3d4b');
        else if ((x * 13 + y * 7) % 41 === 0) P.p(x, y, '#7f918f');
      }
    }
    P.r(1, 27, P.W - 2, 1, '#293b46');
    P.r(3, 24, 6, 2, '#65805e'); P.p(4, 23, '#96a77b');
    for (const x of [8, P.W - 12]) { P.r(x, topAt(x) + 2, 2, 7, '#263b48'); P.r(x + 2, topAt(x) + 3, 1, 6, '#a6ada0'); }
    P.r(P.W - 8, 26, 6, 2, '#76837e');
  });
  make('hall_gate', 96, 74, P => {
    P.shadow(48, 71, 92); P.r(6, 11, 84, 59, '#142332');
    P.r(21, 15, 54, 55, '#0a1320'); P.r(28, 7, 40, 10, '#0a1320'); P.r(35, 3, 26, 6, '#0a1320');
    for (const x of [13, 74]) { stone(P, x, 14, 10, 53); P.r(x + 2, 16, 2, 48, '#9da79f'); P.r(x + 8, 16, 2, 49, '#334553'); }
    for (let i = 0; i < 7; i++) { stone(P, 24 + i * 7, Math.abs(3 - i) * 3, 7, 7); }
    for (let x = 27; x < 71; x += 6) { P.r(x, 17, 5, 49, '#4b3f38'); P.r(x, 18, 1, 46, '#8f7958'); }
    for (const y of [28, 53]) { P.r(27, y, 44, 3, '#2d3d49'); P.r(28, y, 42, 1, '#96a3a3'); }
    P.r(47, 15, 2, 52, '#0a1520'); P.disc(43, 42, 2, '#b8a478'); P.disc(53, 42, 2, '#b8a478');
    stone(P, 8, 67, 80, 3); stone(P, 4, 70, 88, 3);
  });
  // Reflexos e manchas do chão têm bordas suaves, mantendo os objetos em pixels nítidos.
  for (const [key, color] of [['glow_cool', '142,194,230'], ['wet_floor', '132,174,186']]) SPR.canvas(scene, key, 128, 128, (g) => {
    const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(' + color + ',0.65)'); gradient.addColorStop(1, 'rgba(' + color + ',0)');
    g.fillStyle = gradient; g.fillRect(0, 0, 128, 128);
  });
  // Luz exclusiva das tochas da partida, com centro dourado e halo laranja.
  SPR.canvas(scene, 'dungeon_fire_glow', 128, 128, (g) => {
    const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,176,62,0.88)');
    gradient.addColorStop(0.3, 'rgba(255,130,28,0.4)');
    gradient.addColorStop(0.65, 'rgba(238,82,14,0.13)');
    gradient.addColorStop(1, 'rgba(215,60,8,0)');
    g.fillStyle = gradient; g.fillRect(0, 0, 128, 128);
  });
}

function drawRefinedCreature(P, f, art) {
  art.fn(P, f, art.o);
  const o = art.o;
  if (art.fn === drawBat) {
    const y = f ? 7 : 4;
    P.line(1, y, 5, y + 2, '#655779'); P.line(10, y + 2, 14, y, '#655779');
    P.p(6, 7, '#725570'); P.p(9, 7, '#281b37'); P.p(7, 4, '#af8e9a');
  } else if (art.fn === drawSpider) {
    P.r(5, 8, 2, 3, '#586071'); P.r(9, 11, 2, 1, '#101a26');
    P.p(5, 7, '#8b91a1'); P.p(10, 7, '#8b91a1');
    for (const x of [2, 13]) { P.p(x, 9 + f, '#797580'); P.p(x, 12 - f, '#606774'); }
    P.r(7, 9, 2, 2, o.mark);
  } else if (art.fn === drawGhost) {
    P.r(5, 1, 3, 1, '#e5f2e6'); P.r(4, 6, 1, 3, '#ccf2ed');
    P.p(10, 1, '#8dc5d7'); P.r(6, 10, 2, 1, '#d2f1ed'); P.p(8, 12, '#d2f1ed');
  } else if (art.fn === drawGolem) {
    P.r(3, 6, 1, 4, '#adb2ad'); P.r(5, 2, 2, 1, '#c0c4b5');
    P.line(10, 5, 8, 8, '#39434a'); P.line(7, 9, 5, 11, '#38434a');
    P.p(8, 7, '#ffd58c'); P.p(6, 9, o.core); P.r(1, 6, 2, 1, '#899583'); P.r(13, 7, 2, 1, '#899583');
  } else if (art.fn === drawFloatSkull) {
    P.r(4, 4, 2, 1, '#fff0d1'); P.p(12, 7, '#8f9c94'); P.p(7, 3, '#aaa794');
    P.p(4, 2 + f, '#d5b6ff'); P.p(12, 1 + f, '#c6b6ff');
  } else if (art.fn === drawReaper) {
    P.r(4, 7, 1, 5, '#4b435e'); P.r(6, 9, 1, 5, '#302c42');
    P.p(5, 1, '#706078'); P.r(9, 1, 2, 1, '#4f4266'); P.r(9, 0, 4, 1, '#faf0d6');
  } else if (art.fn === drawGargoyle) {
    P.p(5, 3, '#c4c4b7'); P.r(6, 7, 2, 1, '#bec1b7'); P.line(9, 7, 8, 10, '#3c4654');
    P.line(1, f ? 8 : 4, 4, f ? 10 : 6, '#8d929b'); P.line(11, f ? 10 : 6, 14, f ? 8 : 4, '#8d929b');
  } else if (art.fn === drawBeast) {
    P.r(5, 4, 5, 1, '#5b526a'); P.p(13, 5, '#75617b'); P.p(18, 3, '#a76a7c'); P.r(8, 8, 4, 1, '#393647');
  } else if (art.fn === drawHorseKnight) {
    P.r(7, 7, 5, 1, '#9a6e61'); P.p(7, 1, '#94a2ac'); P.p(4, 7, '#faf0d2'); P.p(16, 5, '#f2e9cd');
  }
}

function drawRefinedBoss(P, f) {
  drawBoss(P, f);
  for (const [x, y] of [[10, 12], [12, 14], [20, 14], [10, 20], [21, 20], [5, 11], [24, 11], [11, 3], [19, 3]]) {
    P.r(x, y, 2, 1, '#78818d'); P.p(x, y + 1, '#454d60');
  }
  P.r(12, 12, 8, 1, '#9b786a'); P.p(12, 22, '#d6ac6f'); P.p(20, 22, '#d6ac6f');
  P.r(8, 16, 1, 8, '#642936'); P.r(23, 16, 1, 8, '#642936');
  P.p(14, 6, '#fff1c7'); P.p(18, 6, '#fff1c7');
}

function drawRefinedGolem(P, f, o) {
  const step = [0, 1, 0, -1][f % 4];
  P.shadow(12, 22, 21);
  const block = (x, y, w, h, color) => {
    P.r(x, y, w, h, '#25313d'); P.r(x + 1, y, w - 2, h - 1, color);
    P.r(x + 1, y, w - 3, 1, '#a8b5ae'); P.r(x + w - 2, y + 1, 1, h - 2, '#4c5b63');
  };
  block(5, 16, 6, 6, o.rock2); block(13, 16 + step, 6, 6, o.rock2);
  block(4, 7, 16, 11, o.rock); block(0, 8 + step, 5, 11, o.rock2); block(19, 8 - step, 5, 11, o.rock2);
  block(7, 2, 10, 6, o.rock);
  P.r(8, 5, 3, 1, '#2b3540'); P.r(13, 5, 3, 1, '#2b3540'); P.p(9, 5, o.eye); P.p(14, 5, o.eye);
  P.r(9, 11, 6, 5, '#33434d'); P.disc(12, 13, 2, o.core); P.p(11, 12, '#fff4b5');
  for (const [x, y] of [[5, 8], [16, 10], [2, 11], [20, 13], [6, 18], [14, 19]]) {
    P.r(x, y, 2, 1, '#c0c3b5'); P.p(x + 1, y + 2, '#4d5c5f');
  }
  P.line(8, 9, 10, 12, '#40505a'); P.line(16, 9, 14, 12, '#44545d');
  P.r(5, 7, 3, 1, o.moss); P.r(18, 9, 2, 2, o.moss); P.p(20, 9, '#8ba574');
}

function drawRefinedProjectiles(scene) {
  const make = (key, w, h, fn) => SPR.make(scene, key, w, h, 1, 2, fn);
  for (const [key, dark] of [['p_arrow', false], ['sh_arrow', true], ['sh_bolt', true]]) make(key, 15, 5, P => {
    P.r(2, 2, 11, 1, '#ba9865'); P.r(4, 1, 8, 1, '#d0bd85');
    P.r(11, 1, 3, 3, '#8fabb8'); P.p(14, 2, '#fff8d1'); P.r(12, 2, 2, 1, '#e7eee1');
    P.r(0, 0, 3, 1, dark ? '#b37368' : '#8eb87b'); P.r(0, 4, 3, 1, dark ? '#b37368' : '#8eb87b'); P.p(1, 1, '#e5d4a8');
  });
  for (const [key, color, hi, w] of [['sh_magic', '#7753af', '#d7b9ff', 12], ['sh_dark', '#813d7c', '#ed98df', 14], ['p_fire', '#c7592b', '#ffe5a0', 18], ['p_orb', '#2e7caa', '#befff1', 18]]) make(key, w, w, P => {
    const r = Math.floor(w / 2) - 1, cx = Math.floor(w / 2);
    P.disc(cx, cx, r, artShade(color, -32)); P.disc(cx, cx, r - 1, color); P.disc(cx - 1, cx - 1, r - 3, hi);
    P.r(cx - 3, cx - 3, 3, 2, '#f7ffe6'); P.p(cx + 1, cx + 2, artShade(color, 30));
    if (key === 'p_fire') { P.r(0, cx, 4, 2, '#d97835'); P.p(2, cx - 3, '#ffcd75'); P.r(3, cx + 3, 2, 1, '#b64b30'); }
  });
  make('p_blade', 21, 21, P => {
    P.line(4, 16, 15, 5, '#344a65', 3); P.line(5, 16, 16, 5, '#a6c9d6', 2); P.line(5, 15, 15, 5, '#f4f7de');
    P.line(3, 12, 8, 17, '#c9ad71', 2); P.line(3, 18, 6, 15, '#865c37', 2); P.p(16, 4, '#ffffff');
  });
  make('p_pierce', 24, 8, P => {
    P.r(0, 3, 17, 2, '#467e9d'); P.r(6, 2, 13, 4, '#6fc5da'); P.r(11, 3, 11, 2, '#f0ffe1');
    P.r(18, 1, 4, 6, '#b7edf0'); P.r(21, 2, 2, 4, '#ffffff'); P.p(3, 2, '#bbfaf5'); P.p(7, 6, '#81d0e3');
  });
  for (const [key, body, hi] of [['gem1', '#3b94b3', '#a7f8e5'], ['gem2', '#3b9b72', '#c6f5a4'], ['gem3', '#a66ba3', '#f6c7ed']]) make(key, 7, 9, P => {
    P.r(2, 0, 3, 1, hi); P.r(1, 1, 5, 5, '#17344b'); P.r(2, 1, 3, 6, body);
    P.r(1, 2, 2, 3, hi); P.r(4, 3, 2, 2, artShade(body, -18)); P.r(3, 6, 1, 2, hi); P.p(2, 2, '#ffffff');
  });
}
