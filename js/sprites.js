// ============================================================
//  SPRITES — pixel art desenhada por código (sem arquivos de imagem).
//  Cada sprite é desenhado numa grade pequena e ampliado com
//  pixels nítidos (k = tamanho do pixel). Gera texturas Phaser.
// ============================================================
const SPR = {};

function makePen(g, W, H) {
  return {
    W, H, g,
    r(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); },
    p(x, y, c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); },
    m(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); g.fillRect(W - x - w, y, w, h); },
    mp(x, y, c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); g.fillRect(W - 1 - x, y, 1, 1); },
    line(x0, y0, x1, y1, c, t) {
      t = t || 1; g.fillStyle = c;
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
      for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), t, t);
    },
    disc(cx, cy, rad, c) {
      g.fillStyle = c;
      for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++)
        if (x * x + y * y <= rad * rad + rad * 0.6) g.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
    },
    shadow(cx, y, w) {
      g.fillStyle = 'rgba(0,0,0,0.38)';
      g.fillRect(Math.round(cx - w / 2), y, w, 1);
      g.fillRect(Math.round(cx - w / 2) + 1, y + 1, w - 2, 1);
    },
  };
}

// Cria uma textura com `frames` quadros lado a lado. draw(P, frameIndex).
SPR.make = function (scene, key, w, h, frames, k, draw) {
  if (scene.textures.exists(key)) return;
  const c = document.createElement('canvas');
  c.width = w * k * frames; c.height = h * k;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  for (let f = 0; f < frames; f++) {
    g.save(); g.translate(f * w * k, 0); g.scale(k, k);
    g.beginPath(); g.rect(0, 0, w, h); g.clip();
    draw(makePen(g, w, h), f);
    g.restore();
  }
  const tex = scene.textures.addCanvas(key, c);
  if (frames > 1) for (let f = 0; f < frames; f++) tex.add(f, 0, f * w * k, 0, w * k, h * k);
};

// Textura por canvas livre (gradientes etc.)
SPR.canvas = function (scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  scene.textures.addCanvas(key, c);
};

// ---------------- Humanoides (esqueletos, cultistas, cavaleiros) ----------------
function drawWeapon(P, o, b) {
  const wood = '#6a4a28', steel = '#cfd6e4';
  switch (o.weapon) {
    case 'sword': P.r(13, 3 + b, 1, 7, steel); P.p(13, 3 + b, '#fff'); P.r(12, 10 + b, 3, 1, '#b48a3c'); P.p(13, 11 + b, 1, 1, wood); break;
    case 'axe': P.r(13, 3 + b, 1, 10, wood); P.r(11, 3 + b, 3, 3, '#9aa3b5'); P.p(11, 4 + b, '#e4eaf5'); break;
    case 'club': P.r(13, 4 + b, 2, 8, '#8a8070'); P.r(12, 3 + b, 4, 3, '#a89e8c'); break;
    case 'bow':
      P.line(13, 2 + b, 15, 5 + b, wood); P.line(15, 5 + b, 15, 9 + b, wood); P.line(15, 9 + b, 13, 12 + b, wood);
      P.line(13, 2 + b, 13, 12 + b, '#cfcfcf'); break;
    case 'xbow': P.r(10, 8 + b, 6, 1, wood); P.r(14, 6 + b, 1, 5, wood); P.p(12, 7 + b, '#ccc'); P.p(15, 8 + b, steel); break;
    case 'staff': P.r(13, 4 + b, 1, 10, wood); P.disc(13, 3 + b, 2, o.orb || '#6cf'); P.p(13, 2 + b, '#fff'); break;
    case 'orbhand': P.disc(13, 9 + b, 2, o.orb || '#c6f'); P.p(13, 8 + b, '#fff'); break;
    case 'scythe': P.r(14, 1 + b, 1, 13, wood); P.r(9, 0 + b, 6, 1, steel); P.r(8, 1 + b, 2, 2, steel); break;
    case 'cannon': P.r(9, 8 + b, 7, 3, '#3a3a44'); P.r(15, 8 + b, 1, 3, '#6a6a78'); P.r(9, 11 + b, 2, 2, wood); P.p(10, 9 + b, '#ff8a30'); break;
    case 'dagger': P.r(13, 8 + b, 1, 4, steel); P.r(12, 12 + b, 3, 1, '#b48a3c'); break;
  }
}

function humanoid(P, f, o) {
  const b = f ? 1 : 0;
  P.shadow(8, 14, 10);
  const leg = o.leg || o.body;
  P.r(5, 12, 2, 3, leg); P.r(9, 12, 2, 3, leg);
  if (f === 0) P.r(4, 14, 3, 1, leg); else P.r(9, 14, 3, 1, leg);
  if (o.robe) { P.r(4, 10 + b, 8, 4, o.body); P.p(5 + f, 14, o.body); P.p(9 - f, 14, o.body); }
  if (o.cape) P.r(4, 7 + b, 8, 7, o.cape);
  // tronco
  P.r(5, 7 + b, 6, 5, o.body);
  if (o.rib) { P.r(6, 8 + b, 4, 1, o.rib); P.r(6, 10 + b, 4, 1, o.rib); P.r(7, 7 + b, 2, 5, o.rib); }
  if (o.trim) P.r(5, 11 + b, 6, 1, o.trim);
  if (o.scarf) P.r(5, 7 + b, 6, 1, o.scarf);
  // braços
  P.r(3, 8 + b, 2, 4, o.arm || o.body); P.r(11, 8 + b, 2, 4, o.arm || o.body);
  if (o.shoulder) { P.r(3, 7 + b, 3, 2, o.shoulder); P.r(10, 7 + b, 3, 2, o.shoulder); }
  // cabeça
  const hy = 2 + b;
  if (o.head === 'skull') {
    P.r(5, hy, 6, 5, '#d8d2bd'); P.r(5, hy, 6, 1, '#efe9d4');
    P.r(6, hy + 2, 2, 2, '#14101a'); P.r(9, hy + 2, 2, 2, '#14101a');
    P.p(7, hy + 3, o.eye); P.p(9, hy + 3, o.eye);
    P.r(6, hy + 4, 4, 1, '#a39c86'); P.p(7, hy + 4, '#14101a'); P.p(9, hy + 4, '#14101a');
    if (o.cap) P.r(5, hy - 1, 6, 2, o.cap);
  } else if (o.head === 'hood') {
    P.r(4, hy - 1, 8, 6, o.hood); P.r(5, hy - 2, 6, 1, o.hood);
    P.r(6, hy + 1, 4, 3, '#0b0a10'); P.p(6, hy + 2, o.eye); P.p(9, hy + 2, o.eye);
  } else if (o.head === 'helm') {
    P.r(4, hy - 1, 8, 6, o.helm); P.r(5, hy, 2, 1, '#ffffff33'); P.r(4, hy - 1, 8, 1, o.trim || '#555b78');
    P.r(5, hy + 2, 6, 1, '#0b0a10'); P.p(6, hy + 2, o.eye); P.p(9, hy + 2, o.eye);
    if (o.plume) P.r(7, hy - 3, 2, 2, o.plume);
  }
  if (o.shield) { P.r(1, 7 + b, 4, 6, o.shield); P.r(1, 7 + b, 4, 1, '#c8b07a'); P.r(2, 9 + b, 2, 2, '#c8b07a'); }
  drawWeapon(P, o, b);
}

// ---------------- Criaturas ----------------
function drawBat(P, f, o) {
  const c = o.body, w = o.wing;
  P.shadow(8, 14, 6);
  if (f === 0) { P.m(1, 3, 5, 4, w); P.m(0, 2, 2, 2, w); P.m(2, 6, 3, 1, '#00000055'); }
  else { P.m(1, 6, 5, 4, w); P.m(0, 9, 2, 2, w); P.m(2, 6, 3, 1, '#00000055'); }
  P.r(6, 6, 4, 4, c); P.r(7, 4, 2, 2, c);
  P.mp(6, 3, c);
  P.p(7, 5, o.eye); P.p(8, 5, o.eye);
  P.p(7, 9, '#fff'); P.p(8, 9, '#fff');
}

function drawSpider(P, f, o) {
  P.shadow(8, 14, 10);
  for (let i = 0; i < 4; i++) {
    const dy = ((i + f) % 2);
    P.line(5, 7 + i * 2, 0, 5 + i * 2 + dy, o.leg, 1);
    P.line(10, 7 + i * 2, 15, 5 + i * 2 + dy, o.leg, 1);
  }
  P.r(4, 7, 8, 6, o.body); P.r(5, 6, 6, 1, o.body);
  P.r(6, 9, 4, 2, o.mark);
  P.r(6, 4, 4, 3, o.head);
  P.p(7, 5, o.eye); P.p(9, 5, o.eye); P.p(8, 4, o.eye);
  P.p(6, 7, '#fff'); P.p(10, 7, '#fff');
}

function drawHorseKnight(P, f) {
  const bone = '#d0c9b2', dk = '#6b6552', arm = '#2a2d3c';
  P.shadow(10, 15, 16);
  const a = f ? 1 : 0;
  // pernas do cavalo esquelético
  P.r(3 + a, 11, 1, 4, bone); P.r(6 - a, 11, 1, 4, bone);
  P.r(12 - a, 11, 1, 4, bone); P.r(15 + a - 1, 11, 1, 4, bone);
  P.r(3 + a, 14, 2, 1, dk); P.r(6 - a, 14, 2, 1, dk); P.r(12 - a, 14, 2, 1, dk); P.r(14 + a, 14, 2, 1, dk);
  // corpo
  P.r(3, 7, 12, 4, bone); P.r(3, 8, 12, 1, dk); P.r(3, 10, 12, 1, dk);
  P.r(1, 8, 3, 2, dk); // cauda
  // pescoço e cabeça
  P.r(14, 5, 3, 4, bone); P.r(16, 4, 4, 3, bone); P.r(18, 6, 2, 2, bone);
  P.p(17, 5, '#ff5030'); P.r(13, 4, 2, 2, '#7a2bd6'); P.p(12, 5, '#b070ff');
  // cavaleiro
  P.r(7, 3, 5, 5, arm); P.r(7, 3, 5, 1, '#555b78');
  P.r(7, 0, 5, 4, '#34384a'); P.r(8, 2, 3, 1, '#0b0a10'); P.p(8, 2, '#ff3030'); P.p(10, 2, '#ff3030');
  P.r(9, -1 + 1, 1, 1, '#d23a3a'); P.r(9, 0, 1, 1, '#d23a3a');
  // lança
  P.r(10, 5, 10, 1, '#8a6a3a'); P.r(18, 4, 2, 3, '#cfd6e4');
}

function drawGhost(P, f, o) {
  const c = o.body, c2 = o.edge;
  P.r(4, 1, 8, 5, c); P.r(5, 0, 6, 1, c); P.r(3, 5, 10, 6, c);
  P.r(3, 5, 1, 6, c2); P.r(12, 5, 1, 6, c2);
  for (let x = 3; x < 13; x++) { const h = ((x + f) % 3 === 0) ? 3 : 2; P.r(x, 11, 1, h, c); }
  P.r(1, 6 + f, 2, 3, c2); P.r(13, 7 - f, 2, 3, c2);
  P.r(5, 3, 2, 3, '#0a1a28'); P.r(9, 3, 2, 3, '#0a1a28');
  P.p(6, 4, o.eye); P.p(10, 4, o.eye);
  P.r(7, 7, 2, 1, '#0a1a28');
}

function drawGolem(P, f, o) {
  const a = f ? 1 : 0;
  P.shadow(8, 15, 12);
  P.r(4, 11, 3, 4, o.rock2); P.r(9, 11, 3, 4, o.rock2);
  P.r(3, 5, 10, 7, o.rock); P.r(3, 5, 10, 1, o.hl);
  P.r(0, 5 + a, 3, 7, o.rock2); P.r(13, 6 - a, 3, 6, o.rock2);
  P.r(0, 11 + a, 3, 2, o.rock); P.r(13, 12 - a, 3, 2, o.rock);
  P.r(5, 1, 6, 4, o.rock); P.r(5, 1, 6, 1, o.hl);
  P.p(6, 3, o.eye); P.p(9, 3, o.eye);
  P.r(7, 8, 2, 2, o.core); P.p(8, 7, o.core);
  P.line(4, 6, 6, 9, o.rock2); P.line(11, 7, 9, 10, o.rock2);
  P.p(4, 5, o.moss); P.p(12, 5, o.moss); P.p(2, 7, o.moss);
}

function drawFloatSkull(P, f, o) {
  P.r(3, 1 + f, 2, 3, o.fire); P.r(11, 1 + (1 - f), 2, 3, o.fire); P.r(7, 0 + f, 2, 2, o.fire);
  P.r(4, 3, 8, 7, '#d8d2bd'); P.r(4, 3, 8, 1, '#efe9d4'); P.r(5, 10, 6, 2, '#bdb6a0');
  P.r(5, 5, 2, 3, '#14101a'); P.r(9, 5, 2, 3, '#14101a');
  P.p(6, 6, o.eye); P.p(9, 6, o.eye);
  P.p(8, 8, '#14101a'); P.r(6, 11, 1, 1, '#14101a'); P.r(8, 11, 1, 1, '#14101a'); P.r(10, 11, 1, 1, '#14101a');
}

function drawReaper(P, f, o) {
  P.r(4, 5, 8, 9, o.robe); P.r(3, 8, 10, 6, o.robe);
  for (let x = 3; x < 13; x++) P.r(x, 14, 1, ((x + f) % 2) + 1, o.robe);
  P.r(4, 1, 8, 6, o.robe); P.r(5, 0, 6, 1, o.robe);
  P.r(5, 2, 6, 4, '#0c0a10');
  P.r(6, 3, 1, 1, o.eye); P.r(9, 3, 1, 1, o.eye); P.r(7, 5, 2, 1, '#d8d2bd');
  P.r(2, 8 + f, 2, 3, '#d8d2bd');
  P.r(14, 0, 1, 15, '#6a4a28'); P.r(8, 0, 7, 1, '#d6deec'); P.r(7, 1, 2, 3, '#d6deec'); P.r(13, 8 + f, 3, 2, '#d8d2bd');
}

function drawGargoyle(P, f, o) {
  P.shadow(8, 15, 8);
  if (f === 0) { P.m(0, 2, 5, 6, o.wing); P.m(0, 2, 5, 1, o.hl); }
  else { P.m(0, 6, 5, 6, o.wing); P.m(0, 6, 5, 1, o.hl); }
  P.r(5, 6, 6, 6, o.stone); P.r(5, 6, 6, 1, o.hl);
  P.r(5, 2, 6, 4, o.stone); P.r(5, 2, 6, 1, o.hl);
  P.r(4, 0, 1, 3, o.horn); P.r(11, 0, 1, 3, o.horn);
  P.p(6, 4, o.eye); P.p(9, 4, o.eye); P.r(7, 5, 2, 1, '#14101a');
  P.r(5, 12, 2, 3, o.stone); P.r(9, 12, 2, 3, o.stone);
  P.r(11, 13, 3, 1, o.stone);
}

function drawBeast(P, f, o) {
  P.shadow(10, 13, 14);
  const fl = f ? 15 : 12, bl = f ? 7 : 4;
  P.r(fl, 10, 2, 3, o.fur2); P.r(bl, 10, 2, 3, o.fur2);
  P.r(fl - 3, 10, 2, 3, o.fur); P.r(bl + 3, 10, 2, 3, o.fur);
  P.r(4, 4, 11, 6, o.fur); P.r(4, 4, 11, 1, o.fur2);
  P.r(5, 2, 1, 2, o.spike); P.r(8, 1, 1, 3, o.spike); P.r(11, 2, 1, 2, o.spike);
  P.r(14, 3, 5, 5, o.fur); P.r(18, 5, 2, 2, o.fur); P.r(14, 1, 2, 2, o.fur2);
  P.p(17, 4, o.eye); P.p(18, 4, o.eye); P.p(19, 7, '#fff'); P.p(17, 7, '#fff');
  P.r(1, 4 + f, 3, 1, o.fur);
}

// ---------------- Definição visual de cada inimigo ----------------
const ENEMY_ART = {
  skel_warrior:   { w: 16, h: 16, k: 3, fn: humanoid, o: { head: 'skull', body: '#2a2630', rib: '#d8d2bd', arm: '#d8d2bd', leg: '#d8d2bd', eye: '#ff4040', weapon: 'sword' } },
  skel_archer:    { w: 16, h: 16, k: 3, fn: humanoid, o: { head: 'skull', body: '#2a2630', rib: '#d8d2bd', arm: '#d8d2bd', leg: '#d8d2bd', eye: '#ffd040', weapon: 'bow', scarf: '#3a7a3a' } },
  skel_mage:      { w: 16, h: 16, k: 3, fn: humanoid, o: { head: 'skull', body: '#2b3a8a', arm: '#2b3a8a', robe: true, eye: '#60c0ff', weapon: 'staff', orb: '#60c0ff', trim: '#8aa0ff' } },
  dark_knight:    { w: 16, h: 16, k: 3, fn: humanoid, o: { head: 'helm', helm: '#34384a', trim: '#555b78', body: '#2a2d3c', arm: '#2a2d3c', leg: '#202230', eye: '#ff3030', weapon: 'sword', shoulder: '#555b78' } },
  skel_shield:    { w: 16, h: 16, k: 3, fn: humanoid, o: { head: 'skull', body: '#3a2a1c', rib: '#d8d2bd', arm: '#d8d2bd', leg: '#d8d2bd', eye: '#ff7030', weapon: 'sword', shield: '#6a4a2a' } },
  cultist:        { w: 16, h: 16, k: 3, fn: humanoid, o: { head: 'hood', hood: '#6a1a1a', body: '#521212', arm: '#521212', robe: true, eye: '#ffcc40', weapon: 'staff', orb: '#ff4a3a', trim: '#8a2a2a' } },
  cultist_thrower:{ w: 16, h: 16, k: 3, fn: humanoid, o: { head: 'hood', hood: '#5a2a6a', body: '#44205a', arm: '#44205a', robe: true, eye: '#ff80ff', weapon: 'orbhand', orb: '#d070ff', trim: '#7a40a0' } },
  bat:            { w: 16, h: 16, k: 3, fn: drawBat, o: { body: '#3a2a4a', wing: '#251a35', eye: '#ff4040' } },
  giant_bat:      { w: 16, h: 16, k: 4, fn: drawBat, o: { body: '#4a2540', wing: '#341a30', eye: '#ffb030' } },
  spider:         { w: 16, h: 16, k: 3, fn: drawSpider, o: { body: '#1d1a26', head: '#2a2535', leg: '#3a3448', mark: '#7a2bd6', eye: '#ff4040' } },
  giant_spider:   { w: 16, h: 16, k: 4, fn: drawSpider, o: { body: '#142218', head: '#1f3324', leg: '#2b4a32', mark: '#7aff5a', eye: '#ffe030' } },
  mounted_knight: { w: 20, h: 16, k: 4, fn: drawHorseKnight, o: {} },
  specter:        { w: 16, h: 16, k: 3, fn: drawGhost, o: { body: '#a9c8e0', edge: '#7fa4c4', eye: '#40f0ff' } },
  crossbowman:    { w: 16, h: 16, k: 3, fn: humanoid, o: { head: 'hood', hood: '#1c1a24', body: '#2a2a34', arm: '#2a2a34', leg: '#1c1a24', eye: '#ff3a3a', weapon: 'xbow', trim: '#555b78', shoulder: '#3a3a48' } },
  skel_fighter:   { w: 16, h: 16, k: 3, fn: humanoid, o: { head: 'skull', cap: '#4a4a56', body: '#5a3a22', rib: '#d8d2bd', arm: '#d8d2bd', leg: '#d8d2bd', eye: '#ffb030', weapon: 'axe', trim: '#8a5a30' } },
  stone_golem:    { w: 16, h: 16, k: 5, fn: drawGolem, o: { rock: '#6c6a76', rock2: '#4e4c58', hl: '#8f8d9a', eye: '#ffa030', core: '#ff7a1a', moss: '#4a7a3a' } },
  floating_skull: { w: 16, h: 16, k: 3, fn: drawFloatSkull, o: { fire: '#7a4bff', eye: '#b8f0ff' } },
  reaper:         { w: 16, h: 16, k: 4, fn: drawReaper, o: { robe: '#1a1428', eye: '#ff3a8a' } },
  giant_skeleton: { w: 16, h: 16, k: 5, fn: humanoid, o: { head: 'skull', body: '#2a2630', rib: '#e0dac4', arm: '#e0dac4', leg: '#e0dac4', eye: '#ff2a2a', weapon: 'club', shoulder: '#8a8070' } },
  elite_knight:   { w: 16, h: 16, k: 4, fn: humanoid, o: { head: 'helm', helm: '#3a3f55', trim: '#c8a640', body: '#2c3045', arm: '#2c3045', leg: '#22263a', eye: '#ff3030', weapon: 'sword', plume: '#d23a3a', shoulder: '#c8a640', cape: '#5a1a1a' } },
  gargoyle:       { w: 16, h: 16, k: 4, fn: drawGargoyle, o: { stone: '#76747e', wing: '#55535f', hl: '#9a98a4', horn: '#3a3844', eye: '#ff3030' } },
  necromancer:    { w: 16, h: 16, k: 4, fn: humanoid, o: { head: 'hood', hood: '#1f3a2a', body: '#183024', arm: '#183024', robe: true, eye: '#7aff7a', weapon: 'staff', orb: '#7aff7a', trim: '#4a9a6a' } },
  gunner:         { w: 16, h: 16, k: 4, fn: humanoid, o: { head: 'helm', helm: '#4a3a2a', trim: '#8a6a3a', body: '#3a2e22', arm: '#3a2e22', leg: '#2a2018', eye: '#ffa030', weapon: 'cannon', shoulder: '#8a6a3a' } },
  dark_beast:     { w: 20, h: 14, k: 4, fn: drawBeast, o: { fur: '#1a1620', fur2: '#2a2433', spike: '#7a1a3a', eye: '#ff2a4a' } },
};

// ---------------- Personagens jogáveis ----------------
function drawVanguard(P, f) {
  const b = f ? 1 : 0;
  P.shadow(8, 14, 10);
  P.r(3, 8 + b, 3, 6, '#a82a2a'); // capa
  P.r(5, 12, 2, 3, '#2a2d3c'); P.r(9, 12, 2, 3, '#2a2d3c');
  if (f === 0) P.r(4, 14, 3, 1, '#4a4f66'); else P.r(9, 14, 3, 1, '#4a4f66');
  P.r(4, 7 + b, 8, 5, '#5d74a3'); P.r(4, 7 + b, 8, 1, '#8fa3cc'); P.r(4, 11 + b, 8, 1, '#c8a640');
  P.r(7, 8 + b, 2, 3, '#7e94c2');
  P.r(2, 7 + b, 3, 3, '#8fa3cc'); P.r(11, 7 + b, 3, 3, '#8fa3cc');
  P.r(2, 10 + b, 2, 2, '#e0b890'); P.r(12, 10 + b, 2, 2, '#e0b890');
  P.r(4, 1 + b, 8, 6, '#7b8fb8'); P.r(4, 1 + b, 8, 1, '#aebfe0'); P.r(5, 2 + b, 1, 4, '#9bb0d8');
  P.r(6, 4 + b, 4, 2, '#e0b890'); P.p(6, 4 + b, '#222'); P.p(9, 4 + b, '#222');
  P.r(7, -1 + b + 1, 2, 1, '#d23a3a'); P.r(7, 0 + b, 2, 1, '#d23a3a'); P.r(6, 1 + b, 1, 1, '#d23a3a');
  // espada grande
  P.r(14, 1 + b, 1, 9, '#e6ecf7'); P.p(14, 1 + b, '#fff'); P.r(13, 10 + b, 3, 1, '#c8a640'); P.p(14, 11 + b, '#6a4a28');
}
function drawRanger(P, f) {
  const b = f ? 1 : 0;
  P.shadow(8, 14, 9);
  P.r(11, 5 + b, 2, 7, '#7a4a22'); P.p(11, 4 + b, '#ddd'); P.p(12, 4 + b, '#ddd'); P.p(12, 3 + b, '#ddd');
  P.r(5, 12, 2, 3, '#3a2a1a'); P.r(9, 12, 2, 3, '#3a2a1a');
  if (f === 0) P.r(4, 14, 3, 1, '#2a1a0e'); else P.r(9, 14, 3, 1, '#2a1a0e');
  P.r(5, 7 + b, 6, 5, '#4a9a52'); P.r(5, 11 + b, 6, 1, '#6b4a2a'); P.r(7, 7 + b, 2, 4, '#6b4a2a');
  P.r(4, 8 + b, 1, 4, '#4a9a52'); P.r(11, 8 + b, 1, 4, '#4a9a52');
  P.r(4, 11 + b, 1, 1, '#e8c29c'); P.r(11, 11 + b, 1, 1, '#e8c29c');
  P.r(4, 1 + b, 8, 6, '#3f8a4a'); P.r(5, 0 + b, 6, 1, '#3f8a4a'); P.r(7, -1 + b + 1, 2, 1, '#2f6a38');
  P.r(6, 3 + b, 4, 3, '#e8c29c'); P.p(6, 4 + b, '#222'); P.p(9, 4 + b, '#222');
  P.r(5, 6 + b, 6, 1, '#d8b04a');
  // arco
  P.line(2, 3 + b, 0, 6 + b, '#7a4a22'); P.line(0, 6 + b, 0, 10 + b, '#7a4a22'); P.line(0, 10 + b, 2, 13 + b, '#7a4a22');
  P.line(2, 3 + b, 2, 13 + b, '#d0d0d0');
}
function drawMage(P, f) {
  const b = f ? 1 : 0;
  P.shadow(8, 14, 10);
  P.r(4, 7 + b, 8, 7, '#7b3fd0'); P.r(3, 11 + b, 10, 3, '#7b3fd0'); P.r(3, 13, 10, 1, '#e0b040');
  P.r(7, 8 + b, 2, 6, '#9a5ff0'); P.r(4, 7 + b, 8, 1, '#a074f0');
  P.r(5 + f, 14, 2, 1, '#222'); P.r(9 - f, 14, 2, 1, '#222');
  P.r(2, 8 + b, 3, 3, '#6a32b8'); P.r(11, 8 + b, 3, 3, '#6a32b8');
  P.r(5, 4 + b, 6, 3, '#f0cfae'); P.p(6, 5 + b, '#223'); P.p(9, 5 + b, '#223');
  P.r(6, 7 + b, 4, 2, '#e8e8f0');
  P.r(3, 3 + b, 10, 1, '#5a2fa0'); P.r(5, 1 + b, 6, 2, '#6a38b8'); P.r(6, 0 + b, 4, 1, '#6a38b8'); P.p(8, 2 + b, '#ffd84a');
  // cajado com orbe
  P.r(14, 4 + b, 1, 10, '#7a5a2a'); P.disc(14, 3 + b, 2, '#5ff0ff'); P.p(14, 2 + b, '#ffffff');
  P.p(1, 2 + f, '#8ff'); P.p(12 + f, 0, '#c8a0ff'); P.p(0, 7 - f, '#c8a0ff');
}

// ---------------- Chefe: Cavaleiro Sombrio (32x32, 4 quadros) ----------------
function drawBoss(P, f) {
  const arm = '#17151f', armL = '#2b2838', armH = '#3d3a4f', red = '#ff2a2a', redD = '#a01818', blade = '#1c1822';
  const walk = f === 1 ? 1 : 0;
  P.shadow(16, 30, 22);
  // capa rasgada
  P.r(7, 10, 18, 17, '#2a0d14');
  for (let x = 7; x < 25; x++) P.r(x, 27, 1, 1 + ((x * 7 + f) % 3), '#2a0d14');
  // pernas
  P.r(10, 23, 5, 7, arm); P.r(17, 23, 5, 7, arm);
  P.r(9 + walk, 29, 7, 2, armL); P.r(16 - walk, 29, 7, 2, armL);
  P.r(10, 25, 5, 1, red); P.r(17, 25, 5, 1, red);
  // torso
  P.r(9, 11, 14, 13, arm); P.r(9, 11, 14, 2, armL); P.r(10, 13, 12, 1, armH);
  P.r(15, 14, 2, 6, red); P.r(13, 16, 6, 2, red); P.r(15, 15, 2, 4, '#ff8a6a');
  P.r(9, 22, 14, 2, armL); P.r(15, 22, 2, 2, red);
  // ombreiras com espinhos
  P.r(4, 10, 7, 6, armL); P.r(21, 10, 7, 6, armL);
  P.r(4, 10, 7, 1, armH); P.r(21, 10, 7, 1, armH);
  P.r(5, 7, 2, 3, arm); P.r(8, 8, 2, 2, arm); P.r(25, 7, 2, 3, arm); P.r(22, 8, 2, 2, arm);
  P.p(5, 7, red); P.p(26, 7, red);
  // elmo com chifres
  P.r(11, 2, 10, 10, arm); P.r(11, 2, 10, 2, armL); P.r(12, 4, 1, 6, armL);
  P.r(9, 0, 2, 5, '#0f0e16'); P.r(21, 0, 2, 5, '#0f0e16'); P.p(9, 0, redD); P.p(22, 0, redD);
  P.r(12, 6, 8, 2, red); P.r(13, 6, 6, 1, '#ff9a8a');
  P.r(13, 9, 6, 2, armL); P.r(15, 9, 2, 3, arm);
  P.r(14, 0, 4, 2, '#0f0e16'); P.p(15, 0, red); P.p(16, 0, red);
  // braço esquerdo (escudo de espinhos)
  P.r(4, 16, 4, 9, arm); P.r(4, 16, 4, 1, armH); P.r(3, 24, 5, 2, armL);
  // braço da espada + espada, depende do quadro
  if (f === 2) { // preparação: espada erguida
    P.r(22, 14, 5, 5, arm); P.r(24, 11, 3, 3, armL);
    P.line(26, 12, 30, 0, blade, 4); P.line(26, 12, 30, 0, red, 1); P.line(24, 12, 28, 12, redD, 2);
  } else if (f === 3) { // golpe: espada para frente/baixo
    P.r(21, 17, 5, 5, arm); P.r(25, 19, 3, 3, armL);
    P.line(26, 20, 31, 31, blade, 4); P.line(26, 20, 31, 31, red, 1); P.line(24, 21, 29, 19, redD, 2);
  } else { // repouso: espada ao lado
    P.r(22, 15, 4, 8, arm); P.r(23, 22, 3, 3, armL);
    P.r(25, 3, 4, 20, blade); P.r(25, 3, 1, 20, red); P.r(28, 5, 1, 17, '#ff5a5a');
    P.r(22, 22, 9, 2, redD); P.r(24, 24, 3, 3, armH);
  }
}

// ---------------- Projéteis e efeitos ----------------
function drawProjectiles(scene) {
  const M = (key, w, h, k, fn) => SPR.make(scene, key, w, h, 1, k, fn);
  M('sh_arrow', 8, 3, 3, (P) => { P.r(0, 1, 6, 1, '#b8a070'); P.r(6, 0, 2, 3, '#d8d8d8'); P.p(0, 0, '#c33'); P.p(0, 2, '#c33'); });
  M('sh_bolt', 9, 4, 3, (P) => { P.r(0, 1, 7, 2, '#4a3a28'); P.r(7, 0, 2, 4, '#e0e0e0'); P.p(0, 0, '#888'); P.p(0, 3, '#888'); });
  M('sh_magic', 8, 8, 3, (P) => { P.disc(4, 4, 3, '#7a4bff'); P.disc(4, 4, 2, '#b88aff'); P.p(4, 4, '#fff'); });
  M('sh_dark', 9, 9, 3, (P) => { P.disc(4, 4, 4, '#5a1a7a'); P.disc(4, 4, 3, '#c050ff'); P.disc(4, 4, 1, '#ffd0ff'); });
  M('sh_wave', 14, 22, 4, (P) => { // onda de energia do chefe (crescente)
    for (let y = 0; y < 22; y++) {
      const t = (y - 11) / 11, x = Math.round(10 - (1 - t * t) * 8);
      P.r(x, y, 14 - x, 1, '#2a0a14'); P.r(Math.max(0, x + 1), y, 3, 1, '#ff2a2a'); P.r(Math.max(0, x + 3), y, 2, 1, '#ff9a8a');
    }
  });
  M('p_arrow', 10, 3, 3, (P) => { P.r(0, 1, 8, 1, '#e0d8b0'); P.r(8, 0, 2, 3, '#ffffff'); P.p(0, 0, '#5c5'); P.p(0, 2, '#5c5'); });
  M('p_pierce', 16, 5, 3, (P) => { P.r(0, 2, 12, 1, '#60e8ff'); P.r(0, 1, 10, 3, '#2a9ad8'); P.r(10, 0, 6, 5, '#d8fbff'); P.r(14, 1, 2, 3, '#ffffff'); });
  M('p_fire', 12, 12, 3, (P) => { P.disc(6, 6, 5, '#d83a10'); P.disc(6, 6, 4, '#ff8a20'); P.disc(6, 6, 2, '#ffe070'); P.p(1, 5, '#d83a10'); P.p(0, 6, '#ff8a20'); });
  M('p_blade', 14, 14, 3, (P) => {
    P.line(2, 12, 11, 3, '#d9e2f2', 2); P.line(3, 12, 12, 3, '#ffffff', 1); P.line(1, 13, 4, 10, '#b48a3c', 2); P.p(12, 2, '#fff'); P.p(11, 1, '#9fc4ff');
  });
  M('p_orb', 12, 12, 3, (P) => { P.disc(6, 6, 5, '#2a60d8'); P.disc(6, 6, 4, '#5ab0ff'); P.disc(6, 6, 2, '#d8f4ff'); P.p(4, 4, '#fff'); });
  M('sweep', 40, 40, 4, (P) => { // arco do golpe giratório
    for (let a = 0; a < 270; a += 4) {
      const r = 17, x = Math.round(20 + Math.cos(a * Math.PI / 180) * r), y = Math.round(20 + Math.sin(a * Math.PI / 180) * r);
      P.r(x - 1, y - 1, 3, 3, a > 180 ? '#ffffff' : '#9bb4e8');
    }
    for (let a = 150; a < 270; a += 4) {
      const r = 14, x = Math.round(20 + Math.cos(a * Math.PI / 180) * r), y = Math.round(20 + Math.sin(a * Math.PI / 180) * r);
      P.r(x, y, 2, 2, '#e6f0ff');
    }
  });
  M('px', 2, 2, 2, (P) => { P.r(0, 0, 2, 2, '#ffffff'); });
  M('gem1', 6, 7, 2, (P) => { P.r(2, 0, 2, 1, '#8fe0ff'); P.r(1, 1, 4, 4, '#3a9ae8'); P.r(2, 5, 2, 1, '#2468b0'); P.p(2, 2, '#ffffff'); });
  M('gem2', 7, 8, 2, (P) => { P.r(2, 0, 3, 1, '#a8ffb8'); P.r(1, 1, 5, 5, '#36c25a'); P.r(2, 6, 3, 1, '#1f8a3c'); P.p(2, 2, '#ffffff'); });
  M('gem3', 9, 10, 2, (P) => { P.r(3, 0, 3, 1, '#ffb0e8'); P.r(1, 1, 7, 6, '#d03ac8'); P.r(2, 7, 5, 1, '#8a1f86'); P.r(3, 8, 3, 1, '#6a1566'); P.r(2, 2, 2, 2, '#ffffff'); });
  M('meat', 10, 8, 2, (P) => { P.r(2, 1, 7, 5, '#b8442a'); P.r(1, 2, 2, 3, '#b8442a'); P.r(3, 2, 4, 2, '#e07a58'); P.r(7, 2, 3, 3, '#f0e6d0'); P.p(9, 1, '#f0e6d0'); P.p(9, 5, '#f0e6d0'); });
  M('cursor', 8, 8, 2, (P) => { P.r(0, 0, 8, 2, '#fff'); });
  SPR.canvas(scene, 'shadow', 48, 16, (g, w, h) => { g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, 0, 0, 7); g.fill(); });
  SPR.canvas(scene, 'glow', 128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,200,120,0.85)'); gr.addColorStop(0.4, 'rgba(255,140,50,0.35)'); gr.addColorStop(1, 'rgba(255,100,20,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  SPR.canvas(scene, 'glow_red', 128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,60,60,0.8)'); gr.addColorStop(0.5, 'rgba(200,20,40,0.3)'); gr.addColorStop(1, 'rgba(200,20,40,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  SPR.canvas(scene, 'vignette', CONFIG.width, CONFIG.height, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, h * 0.32, w / 2, h / 2, h * 0.95);
    gr.addColorStop(0, 'rgba(6,4,12,0)'); gr.addColorStop(1, 'rgba(6,4,12,0.82)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}

// ---------------- Ícones (poderes e melhorias) ----------------
function drawIcons(scene) {
  const I = (key, fn) => SPR.make(scene, 'i_' + key, 16, 16, 1, 3, fn);
  I('slash', (P) => { for (let a = 200; a < 520; a += 14) { const r = 6, x = Math.round(8 + Math.cos(a * Math.PI / 180) * r), y = Math.round(8 + Math.sin(a * Math.PI / 180) * r); P.r(x - 1, y - 1, 3, 3, '#cfe0ff'); } P.r(7, 7, 2, 2, '#fff'); });
  I('arrows', (P) => { P.line(2, 13, 12, 3, '#e0d8b0', 1); P.r(11, 2, 3, 3, '#fff'); P.line(2, 13, 4, 11, '#5c5', 2); P.line(2, 9, 9, 2, '#b8a070', 1); });
  I('arcane', (P) => { P.disc(8, 8, 6, '#5a2fa0'); P.disc(8, 8, 4, '#9a6aff'); P.disc(8, 8, 2, '#e8dcff'); P.p(8, 1, '#fff'); P.p(8, 15, '#fff'); P.p(1, 8, '#fff'); P.p(15, 8, '#fff'); });
  I('blades', (P) => { P.line(3, 12, 12, 3, '#d9e2f2', 2); P.line(4, 3, 12, 11, '#9fb4d8', 2); P.disc(8, 8, 2, '#b48a3c'); });
  I('lightning', (P) => { P.line(9, 0, 5, 7, '#ffe85a', 2); P.line(5, 7, 10, 8, '#ffe85a', 2); P.line(10, 8, 6, 15, '#ffe85a', 2); P.line(9, 1, 6, 7, '#fff', 1); });
  I('fireball', (P) => { P.disc(9, 9, 5, '#d83a10'); P.disc(9, 9, 4, '#ff8a20'); P.disc(9, 9, 2, '#ffe070'); P.line(1, 2, 5, 6, '#ff8a20', 2); P.line(2, 7, 4, 8, '#d83a10', 2); });
  I('orbs', (P) => { P.disc(4, 8, 2, '#5ab0ff'); P.disc(12, 5, 2, '#5ab0ff'); P.disc(12, 11, 2, '#5ab0ff'); P.disc(8, 8, 1, '#fff'); });
  I('pierce', (P) => { P.r(1, 7, 11, 2, '#60e8ff'); P.r(11, 5, 4, 6, '#d8fbff'); P.r(13, 6, 3, 4, '#fff'); P.p(3, 5, '#2a9ad8'); P.p(3, 10, '#2a9ad8'); });
  I('burst', (P) => { for (let a = 0; a < 360; a += 10) { const r = 6, x = Math.round(8 + Math.cos(a * Math.PI / 180) * r), y = Math.round(8 + Math.sin(a * Math.PI / 180) * r); P.r(x, y, 2, 2, '#9ad8ff'); } P.disc(8, 8, 3, '#e6f6ff'); });
  I('heart', (P) => { P.disc(5, 6, 3, '#e03a4a'); P.disc(11, 6, 3, '#e03a4a'); P.r(3, 7, 10, 3, '#e03a4a'); P.r(5, 10, 6, 2, '#e03a4a'); P.r(7, 12, 2, 2, '#e03a4a'); P.p(4, 4, '#ffb0b8'); });
  I('sword', (P) => { P.line(3, 12, 12, 3, '#e6ecf7', 2); P.line(2, 9, 6, 13, '#c8a640', 2); P.p(13, 2, '#fff'); });
  I('boots', (P) => { P.r(4, 3, 5, 8, '#8a5a2a'); P.r(4, 9, 9, 4, '#8a5a2a'); P.r(4, 12, 9, 1, '#4a2a10'); P.r(4, 3, 5, 1, '#c8a640'); });
  I('clock', (P) => { P.disc(8, 8, 6, '#c8a640'); P.disc(8, 8, 5, '#2a2430'); P.r(8, 4, 1, 5, '#fff'); P.r(8, 8, 4, 1, '#fff'); });
  I('target', (P) => { P.disc(8, 8, 6, '#d8c0a0'); P.disc(8, 8, 4, '#2a2430'); P.disc(8, 8, 3, '#d83a3a'); P.disc(8, 8, 1, '#fff'); });
  I('area', (P) => { P.r(1, 1, 3, 1, '#9ad8ff'); P.r(1, 1, 1, 3, '#9ad8ff'); P.r(12, 14, 3, 1, '#9ad8ff'); P.r(14, 12, 1, 3, '#9ad8ff'); P.r(12, 1, 3, 1, '#9ad8ff'); P.r(14, 1, 1, 3, '#9ad8ff'); P.r(1, 14, 3, 1, '#9ad8ff'); P.r(1, 12, 1, 3, '#9ad8ff'); P.disc(8, 8, 3, '#e6f6ff'); });
  I('heal', (P) => { P.r(6, 2, 4, 3, '#d8c8a0'); P.r(4, 5, 8, 9, '#c83a4a'); P.r(7, 7, 2, 5, '#fff'); P.r(5, 9, 6, 1, '#fff'); });
}

// ---------------- Cenário ----------------
function drawProps(scene) {
  const rng = mulberry32(777);
  const M = (key, w, h, k, fn) => SPR.make(scene, key, w, h, 1, k, fn);
  // chão (tileável)
  M('ground', 32, 32, 4, (P) => {
    P.r(0, 0, 32, 32, '#1b1822');
    for (let row = 0; row < 4; row++) {
      const off = (row % 2) * 4;
      for (let col = -1; col < 5; col++) {
        const x = col * 8 + off, y = row * 8;
        const shade = ['#25212e', '#211d29', '#29242f', '#1e1a26'][Math.floor(rng() * 4)];
        P.r(x + 1, y + 1, 7, 7, shade);
        P.r(x + 1, y + 1, 7, 1, '#2d2837');
      }
    }
    for (let i = 0; i < 26; i++) P.p(Math.floor(rng() * 32), Math.floor(rng() * 32), rng() < 0.5 ? '#14111a' : '#302b3a');
  });
  M('path', 32, 32, 4, (P) => {
    P.r(0, 0, 32, 32, '#2a2632');
    for (let row = 0; row < 4; row++) {
      const off = (row % 2) * 4;
      for (let col = -1; col < 5; col++) {
        const x = col * 8 + off, y = row * 8;
        const shade = ['#3a3544', '#363140', '#403a4a', '#322d3c'][Math.floor(rng() * 4)];
        P.r(x + 1, y + 1, 7, 7, shade); P.r(x + 1, y + 1, 7, 1, '#4a4458');
      }
    }
    for (let i = 0; i < 18; i++) P.p(Math.floor(rng() * 32), Math.floor(rng() * 32), '#221e2a');
  });
  M('wall', 32, 32, 4, (P) => {
    P.r(0, 0, 32, 32, '#1a1620');
    for (let row = 0; row < 4; row++) {
      const off = (row % 2) * 8;
      for (let col = -1; col < 3; col++) {
        const x = col * 16 + off, y = row * 8;
        P.r(x + 1, y + 1, 15, 7, ['#2a2634', '#312c3c', '#272330'][Math.floor(rng() * 3)]);
        P.r(x + 1, y + 1, 15, 1, '#3c3748');
      }
    }
  });

  // árvores secas
  const tree = (key, lean) => M(key, 20, 28, 3, (P) => {
    P.shadow(10, 26, 12);
    P.r(9, 12, 3, 14, '#2e2018'); P.r(9, 12, 1, 14, '#3e2c20'); P.r(8, 24, 5, 2, '#2e2018');
    P.line(10, 14, 10 - 5 - lean, 6, '#2e2018', 2); P.line(10, 13, 10 + 6 + lean, 5, '#2e2018', 2);
    P.line(10 - 5 - lean, 6, 2, 3, '#2e2018', 1); P.line(10 - 5 - lean, 6, 6, 1, '#2e2018', 1);
    P.line(10 + 6 + lean, 5, 17, 2, '#2e2018', 1); P.line(10 + 6 + lean, 5, 14, 0, '#2e2018', 1);
    P.line(10, 16, 4, 14, '#2e2018', 1); P.line(11, 17, 16, 13, '#2e2018', 1);
    P.line(10, 12, 10, 4, '#2e2018', 2); P.line(10, 7, 7, 2, '#2e2018', 1); P.line(10, 8, 13, 3, '#2e2018', 1);
  });
  tree('tree1', 0); tree('tree2', 2); tree('tree3', -2);

  const rock = (key, w, h) => M(key, w, h, 3, (P) => {
    P.shadow(w / 2, h - 2, w - 2);
    P.r(1, 2, w - 2, h - 4, '#4a4854'); P.r(2, 1, w - 4, 1, '#5e5c6a'); P.r(1, 2, w - 2, 1, '#6a6876');
    P.r(1, h - 3, w - 2, 1, '#34323e'); P.p(3, 4, '#34323e'); P.p(w - 4, 5, '#34323e'); P.p(4, 3, '#7a7886');
  });
  rock('rock1', 12, 9); rock('rock2', 9, 7); rock('rock3', 15, 10);

  M('rubble', 14, 8, 3, (P) => {
    P.shadow(7, 6, 13);
    P.r(1, 3, 4, 3, '#4a4854'); P.r(5, 2, 5, 4, '#5a5864'); P.r(9, 4, 4, 2, '#3e3c48'); P.r(3, 1, 2, 2, '#6a6876'); P.r(7, 1, 2, 1, '#6a6876');
  });
  M('bones', 14, 8, 3, (P) => {
    P.r(2, 4, 8, 1, '#cfc8b0'); P.r(1, 3, 2, 1, '#cfc8b0'); P.r(1, 5, 2, 1, '#cfc8b0'); P.r(9, 3, 2, 1, '#cfc8b0'); P.r(9, 5, 2, 1, '#cfc8b0');
    P.r(8, 1, 4, 3, '#d8d2bd'); P.p(9, 2, '#14101a'); P.p(11, 2, '#14101a'); P.r(3, 6, 5, 1, '#b8b19a');
  });
  M('barrel', 10, 12, 3, (P) => {
    P.shadow(5, 10, 9);
    P.r(1, 1, 8, 9, '#5a3a22'); P.r(1, 3, 8, 1, '#2a2a30'); P.r(1, 7, 8, 1, '#2a2a30'); P.r(2, 1, 1, 9, '#7a5030'); P.r(2, 0, 6, 1, '#6a4a2a');
  });
  const tomb = (key, round) => M(key, 12, 16, 3, (P) => {
    P.shadow(6, 14, 11);
    P.r(2, 4, 8, 10, '#5a5864'); P.r(3, 3, 6, 1, '#5a5864'); if (round) { P.r(4, 2, 4, 1, '#5a5864'); }
    P.r(2, 4, 1, 10, '#6e6c7a'); P.r(5, 6, 2, 5, '#3a3844'); P.r(4, 8, 4, 1, '#3a3844'); P.r(1, 13, 10, 1, '#3a3844');
  });
  tomb('tomb1', true); tomb('tomb2', false);
  M('pillar', 14, 26, 3, (P) => {
    P.shadow(7, 24, 14);
    P.r(2, 22, 10, 3, '#4e4c58'); P.r(3, 3, 8, 19, '#5e5c6a'); P.r(3, 3, 2, 19, '#74727f'); P.r(9, 3, 2, 19, '#46444f');
    P.r(1, 1, 12, 3, '#6a6876'); P.r(1, 1, 12, 1, '#85838f');
    for (let y = 6; y < 20; y += 5) P.r(3, y, 8, 1, '#3e3c48');
  });
  M('pillar_broken', 14, 18, 3, (P) => {
    P.shadow(7, 16, 14);
    P.r(2, 14, 10, 3, '#4e4c58'); P.r(3, 6, 8, 8, '#5e5c6a'); P.r(3, 6, 2, 8, '#74727f'); P.r(9, 6, 2, 8, '#46444f');
    P.r(3, 5, 5, 1, '#5e5c6a'); P.r(4, 4, 3, 1, '#5e5c6a'); P.r(9, 5, 2, 1, '#46444f');
  });
  const ruin = (key, w, hs) => M(key, w, 20, 3, (P) => {
    P.shadow(w / 2, 18, w - 1);
    for (let x = 0; x < w; x++) {
      const h = hs[x % hs.length];
      P.r(x, 18 - h, 1, h, (x + h) % 3 ? '#4a4854' : '#3e3c48');
      P.r(x, 18 - h, 1, 1, '#6a6876');
    }
    for (let y = 8; y < 18; y += 4) P.r(0, y, w, 1, '#2e2c38');
  });
  ruin('ruin1', 36, [14, 14, 12, 11, 10, 12, 13, 14, 14, 9, 7, 6]);
  ruin('ruin2', 28, [8, 10, 12, 13, 14, 13, 11, 9, 7, 6]);
  ruin('ruin3', 44, [12, 12, 13, 14, 14, 14, 10, 8, 8, 12, 13, 14, 14, 11, 9]);
  M('banner', 10, 26, 3, (P) => {
    P.r(4, 0, 2, 26, '#3a2a1a'); P.r(0, 1, 10, 1, '#3a2a1a');
    P.r(1, 2, 8, 12, '#7a1a22'); P.r(1, 12, 3, 4, '#7a1a22'); P.r(6, 12, 3, 4, '#7a1a22'); P.r(4, 5, 2, 5, '#c8a640'); P.r(3, 7, 4, 1, '#c8a640');
  });
  M('tower', 36, 56, 3, (P) => {
    P.shadow(18, 53, 34);
    P.r(4, 18, 28, 36, '#3a3646'); P.r(4, 18, 5, 36, '#4a4658'); P.r(27, 18, 5, 36, '#2e2a38');
    for (let y = 22; y < 52; y += 6) for (let x = 5; x < 31; x += 7) P.r(x + ((y / 6) % 2 ? 3 : 0), y, 6, 1, '#2a2632');
    P.r(2, 12, 32, 7, '#4a4658'); P.r(2, 12, 32, 1, '#5e5a70');
    for (let x = 2; x < 34; x += 6) P.r(x, 8, 4, 5, '#4a4658');
    P.r(14, 28, 8, 12, '#0e0c14'); P.r(15, 27, 6, 1, '#0e0c14'); P.r(16, 29, 4, 6, '#c8741e'); P.r(17, 30, 2, 3, '#ffd070');
    P.r(14, 44, 8, 8, '#0e0c14');
  });
  M('torch', 8, 18, 3, (P) => { P.r(3, 8, 2, 9, '#3a2a1a'); P.r(1, 6, 6, 3, '#2a2a30'); P.r(2, 5, 4, 1, '#3a3a44'); });
  SPR.make(scene, 'flame', 8, 10, 2, 3, (P, f) => {
    P.r(2, 3 + f, 4, 5 - f, '#e8541a'); P.r(3, 1 + f, 2, 4, '#ff8a20'); P.r(3, 4, 2, 3, '#ffd070'); if (f) P.p(4, 0, '#ff8a20'); else P.p(3, 1, '#ff8a20');
  });
  // torre/castelo principal ao norte
  M('castle', 200, 90, 4, (P) => {
    P.shadow(100, 87, 196);
    const stone = (x, y, w, h, base, hi) => {
      P.r(x, y, w, h, base);
      for (let yy = y; yy < y + h; yy += 4) {
        for (let xx = x; xx < x + w; xx++) {
          if (yy + 3 < y + h) P.p(xx, yy + 3, '#333342');
          if ((xx - x + ((yy - y) % 8 ? 4 : 0)) % 8 === 0) P.r(xx, yy, 1, Math.min(3, y + h - yy), '#3d3b49');
          else if ((xx * 7 + yy * 13) % 29 === 0) P.p(xx, yy + 1, '#767384');
        }
      }
      P.r(x, y, w, 1, hi); P.r(x, y + 1, 1, h - 1, hi);
      P.r(x + w - 2, y + 1, 2, h - 1, '#393747');
    };
    const crenels = (x, y, w, color) => {
      P.r(x, y + 4, w, 3, '#82818c');
      for (let xx = x; xx < x + w; xx += 8) {
        P.r(xx, y, 5, 6, color); P.r(xx, y, 5, 1, '#aaa5b0'); P.r(xx + 4, y + 1, 1, 5, '#414050');
      }
      P.r(x, y + 7, w, 2, '#2d2b3b');
    };
    // Muralhas, fundação e contrafortes de pedra.
    stone(0, 43, 200, 44, '#575365', '#95919f');
    crenels(0, 36, 200, '#706b7c');
    for (const x of [2, 43, 64, 133, 154, 193]) {
      P.r(x, 47, 4, 35, '#797482'); P.r(x + 3, 47, 2, 35, '#454252');
      P.r(x - 1, 80, 7, 7, '#65606e'); P.r(x - 1, 80, 7, 1, '#96909a');
    }
    P.r(0, 84, 200, 3, '#44434e'); P.r(0, 84, 200, 1, '#8b8690');
    // Torre central, cornijas e aberturas defensivas.
    stone(70, 23, 60, 61, '#686171', '#a19aa4');
    crenels(69, 15, 62, '#847b89');
    for (let x = 72; x < 128; x += 7) { P.r(x, 24, 3, 3, '#393541'); P.p(x, 24, '#b1a6a9'); }
    P.r(71, 40, 58, 2, '#968b94'); P.r(71, 42, 58, 1, '#403846');
    // Torres com telhados de ardósia, arestas iluminadas e seteiras.
    for (const tx of [10, 162]) {
      stone(tx, 17, 28, 67, '#777080', '#ada5b1');
      P.r(tx - 2, 16, 32, 3, '#b1a8b2'); P.r(tx - 2, 19, 32, 2, '#393545');
      for (let row = 0; row < 16; row++) {
        const half = Math.floor(row * 1.08), cx = tx + 14;
        P.r(cx - half, row + 1, half * 2 + 1, 1, row % 3 ? '#3c4d68' : '#6b7b91');
        P.p(cx - half, row + 1, '#99a1b1');
        P.r(cx + Math.floor(half * 0.25), row + 1, Math.max(1, half - Math.floor(half * 0.25)), 1, '#2d354c');
      }
      P.r(tx + 13, 0, 2, 3, '#cfb875');
      for (const y of [42, 70]) { P.r(tx + 12, y, 3, 6, '#302e3e'); P.r(tx + 13, y, 1, 5, '#131521'); }
      P.r(tx - 1, 66, 30, 2, '#a199a3'); P.r(tx - 1, 68, 30, 1, '#484250');
      P.r(tx - 2, 82, 32, 5, '#625a6c'); P.r(tx - 2, 82, 32, 1, '#a39aa5');
    }
    // Molduras das janelas alinhadas às luzes animadas.
    const window = (x, y, w, h) => {
      P.r(x - 1, y - 2, w + 2, h + 4, '#938895'); P.r(x, y - 1, w, h + 2, '#282432');
      P.r(x + 1, y, w - 2, h, '#b56d29'); P.r(x + 2, y + 1, Math.max(1, w - 4), Math.max(1, h - 3), '#ffd486');
      P.r(x - 2, y + h + 1, w + 4, 1, '#b3a6a8');
    };
    for (const tx of [10, 162]) { window(tx + 10, 27, 8, 8); window(tx + 10, 52, 8, 8); }
    for (const wx of [45, 148]) window(wx, 57, 6, 6);
    for (const wx of [80, 112]) window(wx, 30, 6, 6);
    // Portão em arco, blocos de cantaria e grade de ferro.
    P.r(84, 53, 32, 31, '#aaa0a5'); P.r(87, 48, 26, 8, '#aaa0a5'); P.r(91, 44, 18, 5, '#aaa0a5');
    P.r(88, 54, 24, 31, '#14121d'); P.r(91, 49, 18, 6, '#14121d'); P.r(95, 47, 10, 3, '#14121d');
    for (let y = 55; y < 84; y += 6) { P.r(84, y, 4, 1, '#605762'); P.r(112, y, 4, 1, '#605762'); }
    P.r(98, 43, 4, 5, '#d0bfac');
    for (let x = 91; x <= 109; x += 3) { P.r(x, 54, 1, 30, '#6a6471'); P.r(x + 1, 54, 1, 30, '#292631'); }
    for (const y of [61, 73]) P.r(89, y, 22, 1, '#82757e');
    P.r(86, 85, 28, 2, '#a99e9e'); P.r(83, 87, 34, 2, '#716a72');
    // Estandartes bordados e brasão da fortaleza.
    for (const x of [57, 138]) {
      P.r(x - 2, 46, 11, 1, '#c8ac70'); P.r(x, 47, 7, 18, '#7b263b');
      P.r(x, 47, 1, 18, '#cba865'); P.r(x + 6, 47, 1, 18, '#3b1d30');
      P.r(x + 1, 65, 5, 2, '#7b263b'); P.r(x + 2, 67, 3, 1, '#7b263b');
      P.r(x + 3, 51, 1, 10, '#dcbd78'); P.r(x + 1, 54, 5, 1, '#dcbd78');
    }
    P.r(96, 25, 8, 12, '#5c2635'); P.r(97, 25, 6, 1, '#d9ba7c');
    P.r(98, 27, 4, 6, '#d1ad65'); P.r(99, 33, 2, 2, '#d1ad65');
    for (const x of [4, 47, 151, 193]) { P.p(x, 81, '#5a744f'); P.r(x + 1, 82, 3, 1, '#4e6546'); }
  });
  // arena do chefe
  SPR.make(scene, 'arena', 260, 260, 1, 4, (P) => {
    const cx = 130, cy = 130;
    for (let y = 0; y < 260; y++) for (let x = 0; x < 260; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > 130) continue;
      let c = ((x >> 3) + (y >> 3)) % 2 ? '#2a2632' : '#302b3a';
      if (d > 126) c = '#14101a';
      else if (d > 120) c = '#463a56';
      else if (d > 112) c = '#1c1822';
      else if (d > 68 && d < 71) c = '#5a1822';
      else if (d > 34 && d < 36) c = '#5a1822';
      if (((x * 13 + y * 7) % 17) === 0) c = '#1a1620';
      P.p(x, y, c);
    }
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      P.line(Math.round(cx + Math.cos(a) * 36), Math.round(cy + Math.sin(a) * 36), Math.round(cx + Math.cos(a) * 118), Math.round(cy + Math.sin(a) * 118), '#6a1c28', 1);
      P.disc(Math.round(cx + Math.cos(a) * 91), Math.round(cy + Math.sin(a) * 91), 3, '#7a1a26');
    }
    P.disc(cx, cy, 10, '#240c14'); P.disc(cx, cy, 6, '#7a1a26'); P.disc(cx, cy, 2, '#ff4a4a');
  });
}

// Aldeões exclusivos do cenário do menu: 24 combinações de roupa e ferramenta.
function drawMenuVillager(P, f, id) {
  const shirts = ['#c55b49', '#5a91a3', '#d0ab57', '#73965c', '#9677aa', '#cf8862', '#6caaa1', '#be7191'];
  const skin = ['#efc49b', '#c38e62', '#a96f50', '#e0ad80'][id % 4];
  const hair = ['#493426', '#a16a37', '#d3bf8c', '#696271'][Math.floor(id / 3) % 4];
  const attack = f >= 4, step = f % 4, bob = attack ? 0 : step % 2;
  P.shadow(9, 18, 10);
  P.r(6, 13, 3, 4 + (step === 1 ? 1 : 0), '#4b4340');
  P.r(10, 13, 3, 4 + (step === 3 ? 1 : 0), '#554d47');
  P.r(step === 1 ? 5 : 6, 17, 4, 1, '#332b29'); P.r(step === 3 ? 11 : 10, 17, 4, 1, '#332b29');
  P.r(6, 8 + bob, 7, 6, shirts[id % shirts.length]);
  P.r(6, 9 + bob, 1, 4, '#463e40'); P.r(7, 13, 5, 1, '#6b4a35'); P.p(10, 13, '#d9bd79');
  if (id % 3 === 1) { P.r(8, 9 + bob, 4, 4, '#c7ba91'); P.r(9, 8 + bob, 1, 2, '#c7ba91'); }
  if (id % 3 === 2) P.r(5, 8 + bob, 2, 6, '#73536a');
  P.r(7, 3 + bob, 6, 5, skin); P.r(7, 2 + bob, 6, 2, hair);
  P.r(6, 4 + bob, 2, 3, hair); P.p(12, 5 + bob, '#292d36');
  if (id % 4 === 0) { P.r(5, 3 + bob, 10, 1, '#ceb474'); P.r(8, 1 + bob, 5, 2, '#b99855'); }
  if (id % 4 === 1) { P.r(7, 1 + bob, 6, 2, '#704d40'); P.r(7, 3 + bob, 7, 1, '#ad8261'); }
  if (id % 4 === 2) P.r(8, 7 + bob, 4, 1, hair);
  if (id % 4 === 3) { P.r(6, 6 + bob, 2, 4, hair); P.r(8, 8 + bob, 5, 1, '#d2a668'); }
  P.r(4, 9 + bob, 2, 4, shirts[id % shirts.length]); P.r(4, 12 + bob, 2, 2, skin);
  P.r(13, 9 + bob, 2, 3, skin);
  const g = P.g;
  g.save(); g.translate(14, 11 + bob);
  g.rotate(attack ? [-1.1, -0.5, 0.85, 0.25][step] : 0.12);
  P.r(0, -6, 1, 11, '#9b7846'); P.p(0, 4, '#d2ae71');
  switch (id % 6) {
    case 0: // machado
      P.r(1, -6, 4, 3, '#b5c3cc'); P.r(4, -6, 1, 4, '#edf0da'); break;
    case 1: // espeto de três pontas
      P.r(-2, -5, 5, 1, '#abb9c1');
      for (const x of [-2, 0, 2]) P.r(x, -9, 1, 4, '#d0d6d2'); break;
    case 2: // pá
      P.r(-1, -7, 4, 4, '#9faeb3'); P.r(0, -3, 2, 1, '#d6dfd8'); P.r(-1, 3, 3, 1, '#cfb17d'); break;
    case 3: // martelo
      P.r(-2, -6, 6, 3, '#8a99a8'); P.r(-2, -6, 6, 1, '#d7dee0'); break;
    case 4: // picareta
      P.r(-3, -6, 7, 1, '#c4ccd1'); P.p(-4, -5, '#d6ded5'); P.p(4, -5, '#8499a8'); break;
    case 5: // enxada
      P.r(0, -6, 5, 2, '#a9bac4'); P.r(4, -6, 1, 4, '#dbe1d7'); break;
  }
  g.restore();
}

// ---------------- Geração de tudo + animações ----------------
SPR.generateAll = function (scene) {
  drawForestAssets(scene);
  drawForestBossAssets(scene);
  drawCatacombAssets(scene);
  drawExplorationAssets(scene);
  drawProgressionAssets(scene);
  drawDashAssets(scene);
  drawRefinedProjectiles(scene);
  drawProjectiles(scene);
  drawIcons(scene);
  drawRefinedEnvironment(scene);
  drawProps(scene);
  for (let id = 0; id < 24; id++) SPR.make(scene, 'menu_villager_' + id, 20, 20, 8, 2, (P, f) => drawMenuVillager(P, f, id));
  SPR.make(scene, 'menu_lantern', 5, 7, 1, 2, (P) => {
    P.r(1, 0, 3, 1, '#c3aa6c'); P.r(0, 1, 1, 2, '#77664c'); P.r(4, 1, 1, 2, '#77664c');
    P.r(0, 3, 5, 4, '#8d6d3a'); P.r(1, 3, 3, 3, '#ffe397'); P.p(2, 4, '#ffffff');
  });
  SPR.make(scene, 'menu_spark', 8, 8, 1, 2, (P) => {
    P.line(0, 0, 7, 7, '#ffd37b'); P.line(1, 7, 6, 1, '#ffe6ae'); P.r(3, 3, 2, 2, '#ffffff');
  });
  SPR.make(scene, 'c_vanguard', 24, 24, 4, 2, (P, f) => drawRefinedHero(P, f, 'vanguard'));
  SPR.make(scene, 'c_ranger', 24, 24, 4, 2, (P, f) => drawRefinedHero(P, f, 'ranger'));
  SPR.make(scene, 'c_mage', 24, 24, 4, 2, (P, f) => drawRefinedHero(P, f, 'mage'));
  SPR.make(scene, 'c_channeler', 24, 24, 4, 2, drawChanneler);
  SPR.make(scene, 'boss', 32, 32, 4, 4, drawRefinedBoss);
  for (const id of Object.keys(ENEMY_ART)) {
    const a = ENEMY_ART[id];
    if (a.custom) SPR.make(scene, 'e_' + id, a.w, a.h, a.frames || 4, a.k, a.fn);
    else if (a.fn === humanoid || a.fn === drawGolem) {
      a.visualScale = a.w * a.k / 48;
      SPR.make(scene, 'e_' + id, 24, 24, 4, 2, (P, f) => a.fn === humanoid ? drawRefinedHumanoid(P, f, a.o) : drawRefinedGolem(P, f, a.o));
    } else SPR.make(scene, 'e_' + id, a.w, a.h, 2, a.k, (P, f) => drawRefinedCreature(P, f, a));
  }
  const mkAnim = (key, tex, frames, rate) => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({ key, frames: frames.map((f) => ({ key: tex, frame: f })), frameRate: rate, repeat: -1 });
  };
  for (const id of Object.keys(CHARACTERS)) mkAnim('walk_' + id, 'c_' + id, [0, 1, 2, 3], 8);
  for (const id of Object.keys(ENEMY_ART)) mkAnim('walk_e_' + id, 'e_' + id, (ENEMY_ART[id].custom || ENEMY_ART[id].fn === humanoid || ENEMY_ART[id].fn === drawGolem) ? [0, 1, 2, 3] : [0, 1], 4 + Math.min(6, (ENEMIES[id].speed / 25)));
  mkAnim('boss_walk', 'boss', [0, 1], 4);
  mkAnim('flame', 'flame', [0, 1, 2, 3], 9);
};
