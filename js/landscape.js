// ============================================================
//  LANDSCAPE — paisagem em pixel art do menu e da seleção de herói.
//  Horizonte com morros, árvores e o castelo distante. Ciclo infinito:
//  dia (longo) → pôr do sol → noite → nascer do sol → dia.
//  À noite o castelo acende as janelas, uma por uma.
//
//  Tudo é desenhado numa tela lógica de 320x180 e ampliado 4x (pixel art de verdade).
//  Para testar um horário: ?hora=50 (segundos do ciclo) &fixo (congela o relógio).
// ============================================================
const LS = {
  W: 320, H: 180, SC: 4,
  loop: 84,                  // duração do ciclo completo (s)
  startOffset: 26,           // o menu abre perto do fim do dia, o pôr do sol vem logo
  castleLogicalX: 245,       // posição do castelo (px lógicos)
  // Pontos do ciclo: cor do céu (topo, meio, horizonte), tom aplicado ao cenário e quanto é "noite" (0..1)
  keys: [
    { t: 0,  top: 0x3d7fd0, mid: 0x76b4ee, hor: 0xc4e4f6, tint: 0xffffff, n: 0 },     // dia
    { t: 34, top: 0x3d7fd0, mid: 0x76b4ee, hor: 0xc4e4f6, tint: 0xffffff, n: 0 },     // fim do dia (dia dura mais)
    { t: 44, top: 0x40306e, mid: 0xd25a78, hor: 0xffa24a, tint: 0xffb48a, n: 0.30 },  // pôr do sol
    { t: 54, top: 0x070a1c, mid: 0x101a3c, hor: 0x1e2e58, tint: 0x5866a6, n: 1 },     // noite
    { t: 68, top: 0x070a1c, mid: 0x101a3c, hor: 0x1e2e58, tint: 0x5866a6, n: 1 },     // noite
    { t: 76, top: 0x34427e, mid: 0xdc8498, hor: 0xffc08a, tint: 0xffcfb0, n: 0.35 },  // nascer do sol
    { t: 84, top: 0x3d7fd0, mid: 0x76b4ee, hor: 0xc4e4f6, tint: 0xffffff, n: 0 },     // dia de novo
  ],
};

// Relógio global: continua de onde parou ao trocar entre menu e seleção.
const LS_PARAMS = new URLSearchParams(location.search);
LS.t0 = performance.now();
LS.offset = LS_PARAMS.has('hora') ? parseFloat(LS_PARAMS.get('hora')) : LS.startOffset;
LS.frozen = LS_PARAMS.has('fixo');
LS.clock = () => (LS.frozen ? LS.offset : LS.offset + (performance.now() - LS.t0) / 1000) % LS.loop;

const lsSmooth = (u) => u * u * (3 - 2 * u);
function lsLerpColor(a, b, u) {
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, u));
  const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, u));
  const bl = Math.round(lerp(a & 255, b & 255, u));
  return (r << 16) | (g << 8) | bl;
}
function lsSample(t) {
  const K = LS.keys;
  let i = 0;
  while (i < K.length - 2 && t >= K[i + 1].t) i++;
  const a = K[i], b = K[i + 1];
  const u = lsSmooth(clamp((t - a.t) / (b.t - a.t), 0, 1));
  return {
    top: lsLerpColor(a.top, b.top, u), mid: lsLerpColor(a.mid, b.mid, u), hor: lsLerpColor(a.hor, b.hor, u),
    tint: lsLerpColor(a.tint, b.tint, u), n: lerp(a.n, b.n, u),
  };
}

// ---------------------------------------------------------------- desenho dos sprites (uma vez)
function lsCanvas(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  draw(tex.getContext(), w, h);
  tex.refresh();
}
const lsPx = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

function lsPine(c, x, y, h, col, dark, hi) {
  const trunk = h > 24 ? 2 : 1;
  lsPx(c, x, y - Math.round(h * 0.62), trunk, Math.round(h * 0.62) + 1, '#48392a');
  if (h > 20) {
    lsPx(c, x, y - Math.round(h * 0.35), 1, Math.round(h * 0.35), '#796044');
    lsPx(c, x - 2, y, trunk + 4, 1, '#33442c');
  }
  const tiers = Math.max(3, Math.min(10, Math.round(h / 6)));
  for (let t = 0; t < tiers; t++) {
    const progress = t / (tiers - 1);
    const top = y - h + Math.round(progress * h * 0.69);
    const tierH = Math.max(3, Math.round(h * 0.23));
    const width = Math.max(2, Math.round(h * (0.045 + progress * 0.19)));
    for (let row = 0; row < tierH; row++) {
      const half = Math.max(0, Math.round(width * row / (tierH - 1)));
      const edge = row > tierH - 3;
      lsPx(c, x - half, top + row, half * 2 + 1, 1, edge ? dark : col);
      if (!edge && half > 1) {
        lsPx(c, x + Math.floor(half * 0.3), top + row, Math.max(1, Math.ceil(half * 0.7)), 1, dark);
        if ((row + t) % 3 !== 0) lsPx(c, x - half + 1, top + row, Math.max(1, Math.floor(half * 0.4)), 1, hi);
      }
      if (edge && half > 3 && (row + t) % 2 === 0) {
        lsPx(c, x - half - 1, top + row - 1, 2, 1, col);
        lsPx(c, x + half, top + row - 1, 2, 1, dark);
      }
    }
  }
}
function lsRound(c, x, y, h, col, dark, hi) {
  const r = Math.max(3, Math.round(h * 0.28));
  const cy = y - h + r + 2, trunk = h > 20 ? 3 : 1;
  lsPx(c, x, cy, trunk, y - cy + 1, '#4c3829');
  lsPx(c, x, cy + r, 1, Math.max(1, y - cy - r), '#8b6b44');
  for (let k = 0; k < r; k++) {
    lsPx(c, x - k, cy + r - k, 1, 1, '#55402c');
    lsPx(c, x + trunk + k, cy + r - k, 1, 1, '#3b3027');
  }
  // Copas formadas por grupos de folhas, com contorno irregular e volume.
  const clusters = [[-0.7, 0.5, 0.9], [0.8, 0.5, 0.95], [0, 0.6, 1], [-0.4, -0.1, 1], [0.5, -0.2, 0.9], [0, -0.6, 0.8]];
  clusters.forEach(([dx, dy, size], i) => {
    const radius = Math.max(2, Math.round(r * size));
    const cx = x + Math.round(dx * r), yy = cy + Math.round(dy * r);
    for (let row = -radius; row <= radius; row++) {
      const half = Math.round(Math.sqrt(radius * radius - row * row));
      const scallop = radius > 4 && (row + i) % 4 === 0 ? 1 : 0;
      lsPx(c, cx - half, yy + row, half * 2 + 1 - scallop, 1, row > radius * 0.35 ? dark : col);
      if (row < radius * 0.2 && half > 2) lsPx(c, cx - half + 1, yy + row, Math.max(1, Math.round(half * 0.55)), 1, hi);
      if (half > 3 && (row + i) % 3 === 0) lsPx(c, cx + half - 2, yy + row, 2, 1, dark);
    }
  });
  if (h > 20) lsPx(c, x - 2, y, trunk + 5, 1, '#344a2d');
}
function lsDead(c, x, y, h, col) {
  const w = h > 20 ? 2 : 1, top = y - Math.round(h * 0.72);
  lsPx(c, x, top, w, y - top + 1, col);
  const branch = (by, dir, len) => { for (let k = 1; k <= len; k++) lsPx(c, x + (dir > 0 ? w - 1 + k : -k), by - Math.floor(k * 0.9), 1, 1, col); };
  branch(y - Math.round(h * 0.30), -1, Math.round(h * 0.26));
  branch(y - Math.round(h * 0.45), 1, Math.round(h * 0.30));
  branch(y - Math.round(h * 0.60), -1, Math.round(h * 0.18));
  branch(top + 1, 1, Math.round(h * 0.16));
}
function lsHillTop(x, base, amp, seed) {
  return base - (Math.sin(x * 0.040 + seed) * amp + Math.sin(x * 0.105 + seed * 2.3) * amp * 0.5 + Math.sin(x * 0.019 + seed * 0.7) * amp * 0.9);
}
function lsHillLayer(scene, key, tops, col, edge, speck, trees) {
  lsCanvas(scene, key, LS.W, LS.H, (c) => {
    const rng = mulberry32(key.length * 97 + 11);
    for (let x = 0; x < LS.W; x++) {
      lsPx(c, x, tops[x], 1, LS.H - tops[x], col);
      lsPx(c, x, tops[x], 1, 2, edge);
    }
    for (let i = 0; i < 320; i++) {
      const x = (rng() * LS.W) | 0, y = tops[x] + 3 + ((rng() * (LS.H - tops[x] - 4)) | 0);
      if (y < LS.H) lsPx(c, x, y, 1, 1, speck);
    }
    // Relva, pedras e arbustos em pequenos grupos, sem cobrir as construções.
    if (key !== 'ls_hillA') {
      for (let i = 0; i < 90; i++) {
        const x = Math.floor(rng() * LS.W), y = tops[x] + 5 + Math.floor(rng() * 24);
        if (y >= LS.H) continue;
        if (i % 6 === 0) {
          lsPx(c, x, y, 3, 2, '#586b59'); lsPx(c, x, y, 2, 1, '#819080');
        } else {
          lsPx(c, x, y, 2, 1, speck);
          lsPx(c, x + 1, y - 2, 1, 2, edge);
          if (i % 3 === 0) lsPx(c, x - 1, y - 1, 1, 1, edge);
        }
      }
    }
    // Caminho sinuoso que desce do castelo pelas várias encostas.
    for (let y = 103; y < LS.H; y++) {
      const center = Math.round(245 - (y - 105) * 0.45 + Math.sin(y * 0.12) * 6);
      const half = Math.max(1, Math.round((y - 95) / 22));
      for (let x = center - half; x <= center + half; x++) {
        if (x < 0 || x >= LS.W || y < tops[x]) continue;
        lsPx(c, x, y, 1, 1, (x + y) % 5 === 0 ? '#a99c73' : '#7e8058');
      }
    }
    if (trees) trees(c, rng, tops);
  });
}

function lsGenerate(scene) {
  // ---- tops dos morros
  const topsA = [], topsB = [], topsC = [], topsD = [];
  for (let x = 0; x < LS.W; x++) {
    const bump = 20 * (1 - lsSmooth(clamp((Math.abs(x - LS.castleLogicalX) - 48) / 30, 0, 1)));
    topsA.push(Math.round(lsHillTop(x, 118, 5, 1.3) - bump));
    topsB.push(Math.round(lsHillTop(x, 130, 5, 3.1)));
    topsC.push(Math.round(lsHillTop(x, 145, 5, 6.2)));
    topsD.push(Math.round(lsHillTop(x, 161, 2, 9.4)));
  }
  LS.topsA = topsA;
  LS.topsB = topsB;
  LS.topsC = topsC;

  lsCanvas(scene, 'ls_mountains', LS.W, LS.H, (c) => {
    for (let x = 0; x < LS.W; x++) {
      const ridge = Math.round(94 + Math.sin(x * 0.034) * 9 + Math.abs(Math.sin(x * 0.061 + 2)) * 12);
      lsPx(c, x, ridge, 1, LS.H - ridge, '#86a6ba');
      lsPx(c, x, ridge, 1, 2, '#b6cbd4');
      if (Math.sin(x * 0.061 + 2) < 0) lsPx(c, x, ridge + 3, 1, 12, '#7899b0');
    }
  });
  // morros distantes (azulados) com pinheiros minúsculos
  lsHillLayer(scene, 'ls_hillA', topsA, '#5f8fae', '#86adc8', '#6d9ab8', (c, rng, tops) => {
    for (let x = 4; x < LS.W; x += 4 + ((rng() * 6) | 0)) {
      if (Math.abs(x - LS.castleLogicalX) < 54) continue;       // o castelo fica numa clareira
      lsPine(c, x, tops[x] + 1, 6 + ((rng() * 5) | 0), '#3f6f86', '#325a70', '#4f819a');
    }
  });
  // morros do meio
  lsHillLayer(scene, 'ls_hillB', topsB, '#3d7a56', '#5aa070', '#47885f', (c, rng, tops) => {
    for (let x = 3; x < LS.W; x += 6 + ((rng() * 8) | 0)) {
      if (x >= 48 && x <= 141) continue; // clareira para a vila
      const h = 9 + ((rng() * 7) | 0);
      if (rng() < 0.7) lsPine(c, x, tops[x] + 1, h, '#2c6446', '#22503a', '#3f8a5a');
      else lsRound(c, x, tops[x] + 1, h - 2, '#3a7a4a', '#2c6038', '#58a064');
    }
  });
  // Vila na clareira à esquerda: caminhos, casas, igreja e praça.
  const homes = [
    [55, 0, 12], [73, -1, 13], [111, 0, 14], [131, 1, 12],
    [61, 9, 14], [80, 10, 12], [115, 10, 13], [134, 12, 12],
    [55, 21, 12], [73, 23, 13], [94, 22, 14], [116, 22, 13],
  ].map(([x, offset, w], i) => ({ x, y: topsB[x] + offset, w, h: 8 + i % 3, i }));
  const churchX = 94, churchY = topsB[94] + 5;
  LS.villageWindows = homes.flatMap(({ x, y, w, h }) => {
    const left = x - Math.floor(w / 2);
    return [left + 3, left + w - 4].map(wx => ({ x: wx, y: y - h + 3.5 }));
  });
  LS.villageWindows.push({ x: churchX + 6, y: churchY - 8.5 });
  // Rota diante da vila: mantém os personagens abaixo das fachadas e telhados.
  LS.villageFrontY = Math.max(churchY, ...homes.map(home => home.y)) + 8;
  LS.villageDoorsteps = homes.map(({ x, y }) => ({ x, y: y + 1 }));
  lsCanvas(scene, 'ls_village', LS.W, LS.H, (c) => {
    const r = (x, y, w, h, color) => lsPx(c, x, y, w, h, color);
    // Ruas de terra e pequenas pedras acompanham a encosta.
    for (let x = 49; x < 143; x++) {
      r(x, topsB[x] + 8, 1, 4, '#a18b62');
      r(x, topsB[x] + 21, 1, 3, '#8f7e58');
      if (x % 4 === 0) r(x, topsB[x] + 9, 1, 1, '#c8b58a');
    }
    r(88, churchY + 1, 15, 16, '#ab9a76'); // praça da igreja
    // Cada fachada tem madeira, fundação, porta e janelas com caixilhos.
    const buildings = homes.map(home => ({ y: home.y, draw() {
      const { x, y, w, h, i } = home, left = x - Math.floor(w / 2);
      r(left - 1, y, w + 3, 2, '#34472e'); // sombra no gramado
      r(left, y - h, w, h, ['#ddc59a', '#c4ad87', '#e4d3b1'][i % 3]);
      r(left, y - 1, w, 2, '#77716b');
      for (const tx of [left, left + w - 1, x]) r(tx, y - h, 1, h, '#67503a');
      r(left, y - 4, w, 1, '#8d6d4c');
      // Telhado em degraus, com telhas claras alternadas.
      for (let row = 0; row < 6; row++) {
        r(left - 2 + row, y - h - row - 1, w + 4 - row * 2, 1,
          ['#9e513b', '#794035', '#ad6146'][(i + row) % 3]);
      }
      r(left + w - 4, y - h - 7, 2, 5, '#7a736b');
      r(left + w - 5, y - h - 8, 4, 1, '#a69b87');
      r(x - 1, y - 4, 3, 5, '#514034'); r(x, y - 2, 1, 1, '#caac61');
      for (const wx of [left + 2, left + w - 5]) {
        r(wx - 1, y - h + 2, 4, 4, '#73533a');
        r(wx, y - h + 2, 2, 3, '#b5d2cb');
      }
      if (i % 2 === 0) { // jardineira florida
        r(left + 1, y - 2, 3, 1, '#4f7540');
        r(left + 1, y - 3, 1, 1, '#da9775'); r(left + 3, y - 3, 1, 1, '#f0cc72');
      }
    }}));
    buildings.push({ y: churchY, draw() {
      const x = churchX, y = churchY;
      r(x - 7, y - 16, 16, 16, '#c7c3b3');
      r(x - 7, y - 1, 17, 2, '#777c78');
      for (let row = 0; row < 7; row++) r(x - 9 + row, y - 17 - row, 20 - 2 * row, 1, row % 2 ? '#4b596b' : '#657387');
      r(x - 3, y - 27, 7, 27, '#ded4b9'); // torre do sino
      r(x - 4, y - 28, 9, 2, '#9d9789');
      for (let row = 0; row < 6; row++) r(x - 5 + row, y - 29 - row, 11 - row * 2, 1, '#526075');
      r(x, y - 39, 1, 7, '#d3b568'); r(x - 2, y - 37, 5, 1, '#d3b568');
      r(x - 1, y - 25, 3, 5, '#3f4144'); // arco e sino
      r(x, y - 23, 1, 2, '#d7ac5c'); r(x - 1, y - 21, 3, 1, '#bd9049');
      r(x - 1, y - 17, 3, 3, '#8cadc1');
      r(x - 2, y - 5, 5, 6, '#685341'); r(x, y - 5, 1, 6, '#403b37');
      r(x + 5, y - 11, 2, 5, '#7396ab');
      r(x - 4, y + 1, 9, 1, '#b8b7a7'); // degraus
      r(x - 5, y + 2, 11, 1, '#8d9187');
    }});
    buildings.sort((a, b) => a.y - b.y).forEach(b => b.draw());
    // Poço de pedra, bancos e cercas baixas na praça.
    const y = churchY + 13;
    r(94, y, 7, 3, '#6d7475'); r(95, y, 5, 1, '#334746');
    r(94, y - 5, 1, 5, '#705137'); r(100, y - 5, 1, 5, '#705137');
    r(93, y - 6, 9, 2, '#885442');
    r(87, y + 2, 5, 1, '#775738'); r(88, y + 3, 1, 1, '#4d4030');
    for (let x = 50; x < 140; x += 4) {
      const y = topsB[x] + 28;
      r(x, y - 2, 1, 4, '#baaa82'); r(x, y - 1, 4, 1, '#a6956e');
    }
  });
  // As janelas recuperam o tom quente quando anoitece.
  lsCanvas(scene, 'ls_villageLights', LS.W, LS.H, (c) => {
    for (const { x, y, w, h } of homes) {
      const left = x - Math.floor(w / 2);
      for (const wx of [left + 2, left + w - 5]) lsPx(c, wx, y - h + 2, 2, 3, '#ffd080');
    }
    lsPx(c, churchX + 5, churchY - 11, 2, 5, '#ffd79a');
  });
  // morros da frente (árvores maiores, algumas secas)
  lsHillLayer(scene, 'ls_hillC', topsC, '#2b5f3f', '#45855a', '#34704a', (c, rng, tops) => {
    for (let x = 6; x < LS.W; x += 10 + ((rng() * 14) | 0)) {
      const h = 16 + ((rng() * 12) | 0), r = rng();
      if (r < 0.5) lsPine(c, x, tops[x] + 1, h, '#1f4e34', '#173c28', '#32704a');
      else if (r < 0.82) lsRound(c, x, tops[x] + 1, h - 3, '#2e6a3a', '#1f4e2c', '#4a9055');
      else lsDead(c, x, tops[x] + 1, h, '#2a2028');
    }
  });
  // chão escuro da frente, com mato e árvores grandes nas laterais
  lsHillLayer(scene, 'ls_ground', topsD, '#15301f', '#25492f', '#1c3a28', (c, rng, tops) => {
    for (let i = 0; i < 90; i++) {
      const x = (rng() * LS.W) | 0, y = tops[x] + 2 + ((rng() * 14) | 0), g = 2 + ((rng() * 3) | 0);
      lsPx(c, x, y - g, 1, g, '#2f5c3a');
    }
    const big = [[10, 80, 'p'], [28, 58, 'r'], [46, 54, 'p'], [310, 78, 'p'], [292, 58, 'r'], [275, 52, 'p']];
    for (const [x, h, k] of big) {
      if (k === 'p') lsPine(c, x, tops[x] + 3, h, '#10261a', '#0b1c13', '#1a3a28');
      else lsRound(c, x, tops[x] + 3, h, '#214e32', '#122f24', '#426846');
    }
  });

  // ---- nuvens
  lsCanvas(scene, 'ls_cloud0', 44, 14, (c, w, h) => lsCloud(c, w, h, 3));
  lsCanvas(scene, 'ls_cloud1', 62, 17, (c, w, h) => lsCloud(c, w, h, 8));
  lsCanvas(scene, 'ls_cloud2', 32, 10, (c, w, h) => lsCloud(c, w, h, 15));

  // ---- sol e lua
  lsCanvas(scene, 'ls_sun', 24, 24, (c) => {
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      const d = Math.hypot(x - 11.5, y - 11.5);
      if (d <= 10.5) lsPx(c, x, y, 1, 1, d > 8.5 ? '#ffd35a' : d > 5 ? '#ffeb8a' : '#fff6c8');
    }
  });
  lsCanvas(scene, 'ls_moon', 22, 22, (c) => {
    for (let y = 0; y < 22; y++) for (let x = 0; x < 22; x++) {
      const d = Math.hypot(x - 10.5, y - 10.5);
      if (d <= 9.5) lsPx(c, x, y, 1, 1, (x - 10.5) + (y - 10.5) > 6 ? '#b9c0d8' : '#e8ecf8');
    }
    for (const [cx, cy, r] of [[7, 8, 2.2], [13, 13, 2.6], [12, 6, 1.5], [6, 14, 1.5]]) {
      for (let y = 0; y < 22; y++) for (let x = 0; x < 22; x++) if (Math.hypot(x - cx, y - cy) <= r) lsPx(c, x, y, 1, 1, '#aab2cc');
    }
  });
  // ---- neblina
  lsCanvas(scene, 'ls_fog', 16, 32, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
}

function lsCloud(c, w, h, seed) {
  const rng = mulberry32(seed * 131 + 7);
  const blobs = [];
  const n = 4 + ((w / 14) | 0);
  for (let i = 0; i < n; i++) {
    const r = h * (0.28 + rng() * 0.3);
    blobs.push([r + rng() * (w - 2 * r), h - r - 1 - rng() * (h * 0.25), r]);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let inside = false;
    for (const [bx, by, r] of blobs) if (Math.hypot((x - bx) * 0.8, y - by) <= r) { inside = true; break; }
    if (!inside || y > h - 2) continue;
    lsPx(c, x, y, 1, 1, y > h - 5 ? '#cfd8ec' : y < h * 0.35 ? '#ffffff' : '#eef2fb');
  }
}

// ---------------------------------------------------------------- a cena de fundo
class Landscape {
  constructor(scene) {
    this.scene = scene;
    const W = CONFIG.width, H = CONFIG.height, SC = LS.SC;
    lsGenerate(scene);
    const D = -10;        // profundidades negativas: o resto da interface fica sempre por cima

    this.sky = scene.add.graphics().setDepth(D);
    // estrelas
    const rng = mulberry32(42);
    this.stars = [];
    for (let i = 0; i < 110; i++) {
      const s = scene.add.image(rng() * W, rng() * 330, 'px').setDepth(D + 0.5).setAlpha(0);
      s.base = 0.4 + rng() * 0.6; s.tw = rng() * 6; s.big = rng() < 0.12;
      if (s.big) s.setScale(1.6);
      this.stars.push(s);
    }
    // sol e lua
    this.sunGlow = scene.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setScale(4.2).setDepth(D + 0.9);
    this.sun = scene.add.image(0, 0, 'ls_sun').setScale(SC * 1.15).setDepth(D + 1);
    this.moonGlow = scene.add.image(0, 0, 'glow').setTint(0x7a9aff).setBlendMode(Phaser.BlendModes.ADD).setScale(3.4).setDepth(D + 0.9);
    this.moon = scene.add.image(0, 0, 'ls_moon').setScale(SC * 1.05).setDepth(D + 1);
    // nuvens
    this.clouds = [];
    const cl = [['ls_cloud1', 60, 8], ['ls_cloud0', 380, 12], ['ls_cloud2', 700, 6], ['ls_cloud0', 980, 10], ['ls_cloud1', 1180, 7], ['ls_cloud2', 220, 14]];
    cl.forEach(([k, x0, sp], i) => {
      const c = scene.add.image(0, 70 + (i * 47) % 230, k).setScale(SC).setDepth(D + 1.5);
      c.x0 = x0; c.sp = sp; this.clouds.push(c);
    });
    this.mountains = scene.add.image(0, 0, 'ls_mountains').setOrigin(0).setScale(SC).setDepth(D + 1.8);
    // morros
    this.hillA = scene.add.image(0, 0, 'ls_hillA').setOrigin(0).setScale(SC).setDepth(D + 2);
    // Vila em uma camada à frente do castelo, ainda atrás das árvores próximas.
    this.village = scene.add.image(0, 0, 'ls_village').setOrigin(0).setScale(SC).setDepth(D + 2.7);
    this.villageLights = scene.add.image(0, 0, 'ls_villageLights').setOrigin(0).setScale(SC)
      .setDepth(D + 2.71).setAlpha(0);
    // Halos quentes iluminam as fachadas; reflexos alongados alcançam o chão.
    this.villageGlows = LS.villageWindows.map(({ x, y }, i) => {
      const glow = scene.add.image(x * SC, y * SC, 'glow').setTint(0xffb452)
        .setBlendMode(Phaser.BlendModes.ADD).setScale(0.3, 0.34).setDepth(D + 2.72).setAlpha(0);
      return { glow, phase: i * 1.73, strength: 0.65 };
    });
    for (const { x, y } of LS.villageDoorsteps) {
      const glow = scene.add.image(x * SC, y * SC, 'glow').setTint(0xffb452)
        .setBlendMode(Phaser.BlendModes.ADD).setScale(0.44, 0.12).setDepth(D + 2.72).setAlpha(0);
      this.villageGlows.push({ glow, phase: x * 0.21, strength: 0.24 });
    }
    // castelo
    const cx = LS.castleLogicalX * SC, baseY = LS.topsA[LS.castleLogicalX] * SC + 10;
    this.castle = scene.add.image(cx, baseY, 'castle').setOrigin(0.5, 1).setScale(0.5).setDepth(D + 2.2);
    this.buildWindows(cx - 200, baseY - 180, D);
    this.hillB = scene.add.image(0, 0, 'ls_hillB').setOrigin(0).setScale(SC).setDepth(D + 2.5);
    this.hillC = scene.add.image(0, 0, 'ls_hillC').setOrigin(0).setScale(SC).setDepth(D + 3);
    // neblina entre os morros
    this.fogs = [];
    [[500, 1.0], [560, 0.7]].forEach(([y, a], i) => {
      const f = scene.add.image(W / 2, y, 'ls_fog').setScale(W / 16, 3.2).setDepth(D + 3.5).setAlpha(0);
      f.k = a; f.ph = i * 2; this.fogs.push(f);
    });
    this.ground = scene.add.image(0, 0, 'ls_ground').setOrigin(0).setScale(SC).setDepth(D + 4);
    // vagalumes
    this.flies = [];
    for (let i = 0; i < 18; i++) {
      const f = scene.add.image(0, 0, 'px').setTint(0xd8ff80).setBlendMode(Phaser.BlendModes.ADD).setScale(1.6).setDepth(D + 5).setAlpha(0);
      f.cx = 60 + rng() * (W - 120); f.cy = 470 + rng() * 170; f.ph = rng() * 10; f.sp = 0.4 + rng() * 0.6;
      this.flies.push(f);
    }

    scene.events.on('update', this.update, this);
    scene.events.once('shutdown', () => scene.events.off('update', this.update, this));
    this.update();
  }

  // Janelas do castelo: uma tampa escura (cobre a luz "de fábrica" do sprite) + brilho aditivo.
  buildWindows(x0, y0, D) {
    const u = 2;      // 1 pixel do sprite do castelo = 2 px na tela (escala 0.5)
    const wins = [];  // [x, y, w, h] em unidades do sprite
    for (const tx of [10, 162]) { wins.push([tx + 11, 27, 6, 8], [tx + 11, 52, 6, 8]); }
    for (const wx of [45, 148]) wins.push([wx + 1, 57, 4, 6]);
    for (const wx of [80, 112]) wins.push([wx + 1, 30, 4, 6]);
    this.windows = wins.map(([x, y, w, h], i) => {
      const cover = this.scene.add.rectangle(x0 + x * u, y0 + y * u, w * u, h * u, 0x0a080e).setOrigin(0).setDepth(D + 2.3);
      const glow = this.scene.add.image(x0 + (x + w / 2) * u, y0 + (y + h / 2) * u, 'glow').setTint(0xffb050)
        .setBlendMode(Phaser.BlendModes.ADD).setScale(i < 4 ? 0.75 : 0.55).setDepth(D + 2.4).setAlpha(0);
      return { cover, glow, th: 0.10 + i * 0.04, ph: i * 1.7 };
    });
  }

  update() {
    const t = LS.clock(), s = lsSample(t), W = CONFIG.width;
    const now = performance.now() / 1000;

    // céu em faixas (aspecto pixelado)
    const g = this.sky; g.clear();
    const hSky = 472, band = 8;
    for (let y = 0; y < hSky; y += band) {
      const f = (y + band / 2) / hSky;
      g.fillStyle(f < 0.6 ? lsLerpColor(s.top, s.mid, f / 0.6) : lsLerpColor(s.mid, s.hor, (f - 0.6) / 0.4), 1);
      g.fillRect(0, y, W, band);
    }
    g.fillStyle(s.hor, 1); g.fillRect(0, hSky, W, CONFIG.height - hSky);

    // estrelas
    const nStar = Math.pow(clamp((s.n - 0.5) / 0.5, 0, 1), 1.5);
    for (const st of this.stars) st.setAlpha(nStar * st.base * (0.65 + 0.35 * Math.sin(now * 1.6 + st.tw)));

    // sol (sobe à esquerda, desce à direita) e lua
    const u = ((t - 72 + LS.loop) % LS.loop) / 58;   // o sol ainda está acima do horizonte no pôr do sol
    const sunUp = u >= 0 && u <= 1;
    this.sun.setVisible(sunUp); this.sunGlow.setVisible(sunUp);
    if (sunUp) {
      const x = 90 + u * 1100, y = 490 - Math.sin(Math.PI * u) * 300, low = 1 - Math.sin(Math.PI * u);
      this.sun.setPosition(x, y).setTint(lsLerpColor(0xffffff, 0xff7a3a, Math.pow(low, 1.6)));
      this.sunGlow.setPosition(x, y).setTint(lsLerpColor(0xffe9a0, 0xff6a30, Math.pow(low, 1.2))).setAlpha(0.28 + 0.2 * low);
    }
    const v = ((t - 46 + LS.loop) % LS.loop) / 34;
    const moonUp = v >= 0 && v <= 1;
    this.moon.setVisible(moonUp); this.moonGlow.setVisible(moonUp);
    if (moonUp) {
      const x = 100 + v * 1080, y = 490 - Math.sin(Math.PI * v) * 340;
      this.moon.setPosition(x, y); this.moonGlow.setPosition(x, y).setAlpha(0.3 * clamp(s.n * 1.4, 0, 1));
    }

    // nuvens: brancas de dia, laranjas no pôr do sol, azuis à noite
    const cloudTint = lsLerpColor(s.tint, s.hor, 0.25);
    for (const c of this.clouds) {
      c.x = ((c.x0 + now * c.sp) % (W + 400)) - 200;
      c.setTint(cloudTint).setAlpha(0.95 - 0.35 * s.n);
    }

    // cenário: o tom do céu "contamina" as camadas distantes (névoa atmosférica)
    this.mountains.setTint(lsLerpColor(s.tint, s.hor, 0.5));
    this.hillA.setTint(lsLerpColor(s.tint, s.hor, 0.26));
    this.castle.setTint(lsLerpColor(s.tint, s.hor, 0.22));
    this.hillB.setTint(lsLerpColor(s.tint, s.hor, 0.14));
    this.village.setTint(lsLerpColor(s.tint, s.hor, 0.14));
    const villageLit = clamp((s.n - 0.3) / 0.5, 0, 1);
    this.villageLights.setAlpha(villageLit);
    for (const { glow, phase, strength } of this.villageGlows) {
      const flicker = 0.94 + 0.04 * Math.sin(now * 2.1 + phase) + 0.02 * Math.sin(now * 5.3 + phase);
      glow.setAlpha(villageLit * strength * flicker);
    }
    this.hillC.setTint(s.tint);
    this.ground.setTint(lsLerpColor(s.tint, 0x000000, 0.12));

    // janelas acendendo uma a uma
    for (const w of this.windows) {
      const lit = clamp((s.n - w.th) / 0.07, 0, 1);
      w.cover.setAlpha(1 - lit);
      w.glow.setAlpha(lit * (0.42 + 0.12 * Math.sin(now * 3 + w.ph) + 0.05 * Math.sin(now * 11 + w.ph * 2)));
    }

    // neblina e vagalumes
    for (const f of this.fogs) {
      f.setTint(lsLerpColor(s.hor, s.tint, 0.4)).setAlpha(f.k * (0.16 + 0.1 * Math.sin(now * 0.25 + f.ph)) * (1 - 0.2 * s.n));
      f.x = W / 2 + Math.sin(now * 0.08 + f.ph) * 40;
    }
    const nFly = Math.pow(clamp((s.n - 0.6) / 0.4, 0, 1), 2);
    for (const f of this.flies) {
      f.setPosition(f.cx + Math.sin(now * f.sp + f.ph) * 40, f.cy + Math.cos(now * f.sp * 1.3 + f.ph) * 18);
      f.setAlpha(nFly * (0.3 + 0.7 * Math.max(0, Math.sin(now * 2 + f.ph * 3))));
    }
  }
}
