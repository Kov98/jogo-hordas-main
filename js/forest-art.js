// A mata antes da muralha. Carvão, verdes dessaturados e luz de óleo
// laranja em contraste com a noite. Todos os pixels são originais.
function drawForestAssets(scene) {
  const make = (key, w, h, fn, k = 2) => SPR.make(scene, 'forest_' + key, w, h, 1, k, fn);
  const polygon = (P, points, color) => {
    const g = P.g; g.fillStyle = color; g.beginPath();
    points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
    g.closePath(); g.fill();
  };
  const bark = (P, x, y, w, h, birch = false) => {
    P.r(x, y, w, h, birch ? '#80938d' : '#263531');
    P.r(x, y, 2, h, birch ? '#b1b9a3' : '#5a6650');
    P.r(x + w - 2, y, 2, h, birch ? '#4d6664' : '#162726');
    for (let yy = y + 3; yy < y + h - 1; yy += birch ? 5 : 8) {
      P.r(x + (yy % 3), yy, Math.max(2, w - 2), 1, birch ? '#334b4a' : '#172725');
      P.p(x + 1, yy - 1, birch ? '#d0cbb0' : '#69705a');
    }
  };
  const foliage = (P, cx, cy, rx, ry, seed, palette) => {
    const rng = mulberry32(seed);
    // Contorno em degraus, sem círculos lisos nem manchas de cor chapada.
    for (let y = -ry; y <= ry; y++) {
      const half = Math.floor(Math.sqrt(Math.max(0, 1 - y * y / (ry * ry))) * rx);
      const edge = Math.floor(rng() * 3);
      for (let x = -half + edge; x <= half - (edge % 2); x++) {
        const f = (y + ry) / (ry * 2), noise = rng();
        let c = f > 0.72 ? palette[0] : f > 0.42 ? palette[1] : palette[2];
        if (noise < 0.11) c = palette[0];
        if (noise > 0.91 && x < rx * 0.55) c = palette[3];
        if (y < -ry + 2 || x < -half + edge + 1) c = palette[3];
        P.p(cx + x, cy + y, c);
      }
    }
    for (let i = 0; i < rx * 1.7; i++) {
      const x = cx + Math.floor((rng() - 0.5) * rx * 1.6), y = cy + Math.floor((rng() - 0.4) * ry * 1.4);
      P.r(x, y, 2 + Math.floor(rng() * 2), 1, palette[rng() < 0.5 ? 0 : 3]);
    }
  };

  make('ground', 128, 128, P => {
    const rng = mulberry32(583401);
    P.r(0, 0, 128, 128, '#0e1519');
    for (let i = 0; i < 460; i++) {
      const x = Math.floor(rng() * 128), y = Math.floor(rng() * 128);
      P.r(x, y, 2 + Math.floor(rng() * 8), 1 + Math.floor(rng() * 4),
        ['#111c1c', '#0b1318', '#141d1d', '#17201f', '#10191c'][Math.floor(rng() * 5)]);
    }
    for (let i = 0; i < 520; i++) {
      const x = Math.floor(rng() * 128), y = Math.floor(rng() * 128);
      const c = ['#202a25', '#1c2925', '#252d28', '#091316', '#27302b'][Math.floor(rng() * 5)];
      P.p(x, y, c);
      if (i % 5 === 0) { P.p(x + 1, y - 1, '#29362d'); P.p(x - 1, y + 1, '#0d181a'); }
    }
    // Fibras, sementes e folhas escuras: nenhuma grade de lajes no chão.
    for (let i = 0; i < 48; i++) {
      const x = Math.floor(rng() * 128), y = Math.floor(rng() * 128);
      P.line(x, y, x + 3, y - 1, '#2b2e26'); P.p(x + 2, y, '#19201d');
    }
  });
  make('moss_patch', 52, 38, P => {
    const rng = mulberry32(8431);
    for (let i = 0; i < 360; i++) {
      const x = Math.floor(rng() * 52), y = Math.floor(rng() * 38);
      if (Math.hypot((x - 26) / 26, (y - 19) / 19) > 0.9 + rng() * 0.2) continue;
      P.r(x, y, 1 + Math.floor(rng() * 4), 1 + Math.floor(rng() * 2),
        ['#17271f', '#1d2d22', '#253326', '#10201e', '#2c382b'][Math.floor(rng() * 5)]);
    }
  });
  make('leaves', 36, 25, P => {
    const rng = mulberry32(8840);
    for (let i = 0; i < 75; i++) {
      const x = Math.floor(rng() * 34), y = Math.floor(rng() * 24);
      P.r(x, y, 2, 1, ['#39392c', '#282b23', '#48503f', '#2a382e', '#1c2823'][i % 5]);
      if (i % 4 === 0) P.p(x + 1, y + 1, '#2b3429');
    }
  });
  make('fern', 20, 18, P => {
    P.shadow(10, 16, 16);
    for (const [ex, ey] of [[1, 7], [3, 2], [8, 1], [13, 2], [18, 6], [19, 12]]) {
      P.line(10, 16, ex, ey, '#315447');
      for (let i = 2; i <= 7; i++) {
        const t = i / 9, x = Math.round(10 + (ex - 10) * t), y = Math.round(16 + (ey - 16) * t);
        P.line(x, y, x - 2, y - 2, '#3b6653'); P.line(x, y, x + 2, y - 1, '#254637');
        P.p(x - 2, y - 2, '#607c60');
      }
    }
  });
  make('grass', 16, 12, P => {
    for (const [x, h, d] of [[2, 6, -1], [5, 9, -2], [8, 11, 1], [11, 7, 2], [13, 5, 1]]) {
      P.line(8, 11, x + d, 11 - h, '#2c4c3c'); P.line(x, 10, x + d, 11 - h, '#486650');
      P.p(x + d, 11 - h, '#6a7b5b');
    }
  });
  make('flowers', 17, 13, P => {
    for (const [x, y] of [[3, 5], [8, 3], [13, 7]]) {
      P.line(x, y, x + 1, 11, '#3b584a');
      P.p(x - 1, y, '#6d8b84'); P.p(x + 1, y, '#496b68'); P.p(x, y - 1, '#93a99a'); P.p(x, y, '#d2ceb0');
    }
  });
  make('roots', 41, 22, P => {
    const branches = [[21, 18, 2, 17], [21, 18, 8, 5], [20, 19, 35, 6], [20, 18, 40, 20], [13, 12, 2, 7], [30, 11, 37, 1]];
    for (const [x, y, ex, ey] of branches) {
      P.line(x, y + 1, ex, ey + 1, '#0c1d1e', 3);
      P.line(x, y, ex, ey, '#3a4536', 2); P.line(x, y, ex, ey, '#64705a');
    }
    P.r(17, 17, 7, 3, '#293a30'); P.r(13, 15, 3, 2, '#38523b');
  });

  make('tree_oak', 64, 80, P => {
    P.shadow(32, 77, 46);
    bark(P, 28, 30, 10, 45);
    polygon(P, [[29, 53], [22, 70], [12, 76], [26, 74], [32, 64], [37, 73], [50, 76], [42, 70], [36, 49]], '#26372e');
    P.line(30, 57, 25, 70, '#67705a', 2); P.line(25, 70, 17, 74, '#4c5b46');
    P.line(36, 61, 42, 72, '#465640', 2);
    for (const b of [[30, 43, 11, 24], [35, 45, 52, 29], [32, 34, 29, 12], [35, 32, 44, 13]]) {
      P.line(...b, '#1c302b', 5); P.line(b[0], b[1], b[2], b[3], '#58644e', 2);
    }
    const pal = ['#0b191d', '#142822', '#20382d', '#374d3d'];
    foliage(P, 16, 30, 15, 13, 131, pal); foliage(P, 48, 31, 14, 13, 53, pal);
    foliage(P, 24, 16, 17, 14, 534, pal); foliage(P, 43, 16, 16, 13, 72, pal);
    foliage(P, 34, 30, 20, 15, 916, ['#0e1c1e', '#192e25', '#253d2f', '#405440']);
    P.r(29, 57, 2, 8, '#536c46'); P.r(29, 58, 1, 4, '#83915d');
    P.r(35, 66, 2, 4, '#122727'); P.p(35, 65, '#79816b');
    P.r(39, 73, 4, 1, '#5b7050'); P.r(23, 75, 4, 1, '#40593d');
  }, 3);
  make('tree_pine', 42, 65, P => {
    P.shadow(21, 63, 28); bark(P, 19, 36, 5, 26);
    for (let row = 0; row < 5; row++) {
      const top = 3 + row * 9, bottom = top + 22, half = 7 + row * 3;
      polygon(P, [[21, top], [21 - half, bottom - 3], [15 - half, bottom], [21 + half + 4, bottom], [21 + half - 1, bottom - 6]], '#0c1c1e');
      polygon(P, [[20, top], [20 - half, bottom - 3], [20, bottom - 6], [24, top + 9]], '#1d332b');
      P.line(19, top + 6, 19 - half, bottom - 4, '#354a3c');
      P.r(14 - half, bottom - 1, half, 1, '#273e30');
      P.line(21, bottom - 2, 27 + half, bottom - 1, '#132822');
    }
    P.line(20, 57, 14, 63, '#56634a'); P.line(22, 58, 30, 63, '#344d3a');
  }, 3);
  make('tree_birch', 42, 65, P => {
    P.shadow(21, 63, 28); bark(P, 19, 19, 5, 43, true);
    P.line(21, 34, 8, 17, '#4b655b', 3); P.line(20, 33, 7, 17, '#a1b39a');
    P.line(23, 38, 34, 20, '#435c53', 3); P.line(23, 37, 33, 20, '#97ac96');
    P.line(21, 21, 26, 6, '#82988b', 2);
    const pal = ['#122722', '#21392d', '#2d4233', '#4c5d46'];
    foliage(P, 12, 19, 11, 10, 413, pal); foliage(P, 30, 23, 10, 11, 32, pal);
    foliage(P, 23, 10, 12, 9, 643, pal);
    P.line(20, 57, 13, 63, '#758574'); P.line(23, 57, 29, 63, '#536e5d');
    P.p(21, 49, '#d0ccac'); P.r(19, 40, 3, 1, '#233f3b');
  }, 3);
  make('tree_dead', 42, 61, P => {
    P.shadow(22, 59, 32); bark(P, 20, 23, 6, 35);
    for (const b of [[22, 31, 9, 17], [23, 39, 35, 28], [22, 25, 27, 7], [18, 27, 4, 25], [29, 32, 36, 13]]) {
      P.line(...b, '#192e2a', 4); P.line(b[0], b[1], b[2], b[3], '#65705a');
      P.line(b[2], b[3], b[2] - 4, b[3] - 6, '#3f5142');
    }
    P.line(21, 9, 27, 5, '#74806b'); P.line(13, 22, 12, 9, '#4e6150');
    P.line(22, 51, 11, 59, '#556348', 2); P.line(24, 51, 34, 59, '#2e4735', 2);
    P.r(21, 43, 2, 9, '#3d5b3e'); P.p(21, 43, '#829365');
    P.r(26, 49, 3, 2, '#657959'); P.r(26, 48, 4, 1, '#9ca185');
  }, 3);

  for (let id = 0; id < 3; id++) make('rock_' + id, [24, 16, 32][id], [18, 13, 21][id], P => {
    const w = P.W, h = P.H;
    P.shadow(w / 2, h - 2, w - 2);
    polygon(P, [[1, h - 5], [4, 5], [w * 0.4, 2], [w - 7, 3], [w - 2, h - 6], [w - 5, h - 2], [4, h - 2]], '#344747');
    polygon(P, [[4, 5], [w * 0.4, 2], [w - 7, 3], [w - 10, 8], [5, 10]], '#5c6a60');
    P.line(5, 5, Math.floor(w * 0.4), 3, '#94a08b'); P.line(w - 8, 5, w - 6, h - 5, '#263b3e');
    P.r(3, h - 5, 7, 2, '#466441'); P.r(4, h - 6, 4, 1, '#6e8054');
    P.p(w - 9, 7, '#8e9b8b'); P.r(8, 9, 3, 1, '#283f3d');
  });
  make('stones', 34, 19, P => {
    for (const [x, y, w] of [[2, 7, 8], [15, 3, 6], [24, 12, 9], [13, 15, 4]]) {
      P.r(x, y + 1, w, 3, '#2e3c3a'); P.r(x + 1, y, w - 2, 3, '#697263');
      P.r(x + 2, y, w - 3, 1, '#9b9e87'); P.r(x + 1, y + 3, w - 1, 1, '#182c2c');
    }
  });
  make('log', 53, 22, P => {
    P.shadow(27, 19, 51); P.r(4, 8, 43, 10, '#21332d'); P.r(4, 6, 43, 10, '#4e5140');
    P.r(6, 7, 39, 2, '#7a7655'); P.r(8, 12, 37, 2, '#182c28');
    for (const x of [10, 24, 36]) { P.line(x, 8, x + 3, 16, '#2b3b2e'); P.p(x + 1, 8, '#8c8860'); }
    P.r(2, 8, 5, 9, '#95865c'); P.r(3, 9, 3, 6, '#c1ae77'); P.r(4, 10, 2, 4, '#5c6242');
    P.line(20, 8, 17, 1, '#4c5540', 3); P.line(17, 2, 11, 3, '#7a7954');
    P.r(29, 5, 13, 3, '#38563a'); P.r(31, 5, 8, 1, '#6c8050');
    P.r(41, 12, 3, 2, '#8a9574'); P.r(40, 11, 6, 1, '#bcc3a1');
  });
  make('stump', 22, 25, P => {
    P.shadow(11, 23, 22); bark(P, 5, 9, 12, 12);
    P.line(6, 17, 1, 23, '#4d6045', 3); P.line(15, 17, 20, 23, '#263f32', 3);
    P.r(4, 7, 14, 5, '#9d9569'); P.r(6, 6, 10, 1, '#bec09a');
    P.r(7, 8, 8, 2, '#4e6247'); P.r(9, 8, 4, 1, '#b7ae7b');
    P.r(4, 15, 4, 2, '#47673d'); P.p(5, 15, '#82915a');
  });
  make('cart', 51, 38, P => {
    P.shadow(25, 35, 48);
    for (const x of [10, 38]) {
      P.disc(x, 29, 8, '#172a29'); P.disc(x, 29, 6, '#6b6c50'); P.disc(x, 29, 4, '#233a31');
      P.line(x - 5, 24, x + 5, 34, '#8b8460'); P.line(x + 5, 24, x - 5, 34, '#8b8460'); P.r(x - 1, 28, 3, 3, '#a5a17c');
    }
    P.r(6, 11, 39, 13, '#354234');
    for (const y of [9, 14, 19, 23]) { P.r(5, y, 41, 3, '#77704f'); P.r(6, y, 40, 1, '#a39a6c'); P.r(9, y + 2, 33, 1, '#4c523c'); }
    for (const x of [7, 42]) { P.r(x, 7, 3, 19, '#3c5141'); P.r(x, 7, 1, 18, '#adb087'); }
    P.line(29, 24, 48, 34, '#6c7050', 3); P.line(29, 24, 48, 34, '#a4a072');
    P.r(16, 6, 13, 3, '#53614a'); P.r(18, 5, 10, 1, '#879378');
    P.r(5, 18, 5, 2, '#4d6a43'); P.r(7, 15, 3, 2, '#718757');
  });
  make('post', 22, 46, P => {
    P.shadow(10, 44, 18); bark(P, 8, 3, 4, 40);
    P.r(9, 4, 11, 3, '#455143'); P.r(9, 4, 11, 1, '#8b9171');
    P.r(18, 7, 1, 7, '#899781'); P.r(17, 12, 3, 1, '#c0b888');
    P.line(9, 16, 17, 6, '#5c6751'); P.r(7, 35, 5, 6, '#415a3d');
    P.r(7, 42, 8, 2, '#263d31');
  });
  make('lantern', 11, 17, P => {
    P.r(4, 0, 3, 1, '#aca77e'); P.r(3, 1, 1, 3, '#5e7164'); P.r(7, 1, 1, 3, '#96a28b');
    P.r(2, 4, 7, 2, '#8d8762'); P.r(1, 6, 9, 9, '#344b43');
    P.r(3, 6, 5, 7, '#db651f'); P.r(4, 7, 3, 5, '#ff9a32'); P.r(5, 8, 1, 3, '#ffd078');
    P.r(1, 14, 9, 2, '#666e54'); P.r(2, 16, 7, 1, '#263c35');
    P.r(1, 6, 1, 8, '#a6a481'); P.r(8, 6, 2, 8, '#455348'); P.r(5, 5, 1, 1, '#f5a34b');
    P.r(2, 14, 6, 1, '#c7843c');
  });
  // Aldeões caídos: silhuetas de roupas, botas e mãos. Decoração sem animação.
  const shirts = ['#667d7a', '#777247', '#736378', '#52664b', '#7b6552', '#4c6974'];
  for (let id = 0; id < 6; id++) make('body_' + id, 35, 19, P => {
    const skin = ['#af9d7d', '#947f65', '#b5a282'][id % 3], shirt = shirts[id];
    P.shadow(17, 15, 32); P.r(6, 5, 9, 7, '#1c2b29'); P.r(7, 4, 8, 6, skin);
    P.r(6, 4, 4, 6, '#3a3b2e'); P.r(7, 3, 7, 2, id % 2 ? '#514d3b' : '#302f29');
    P.r(8, 8, 5, 2, '#8d866d'); P.p(13, 6, '#4e5546');
    P.r(14, 6, 11, 8, shirt); P.r(14, 6, 9, 1, '#a4a78b'); P.r(15, 12, 10, 2, '#394c43');
    P.r(17, 5, 5, 2, shirt); P.r(20, 4, 5, 2, shirt); P.r(24, 4, 3, 2, skin);
    P.r(14, 12, 3, 4, shirt); P.r(11, 14, 5, 2, skin);
    P.r(24, 8, 6, 4, '#3e4a44'); P.r(23, 12, 6, 3, '#4b5148');
    P.r(28, 7, 5, 3, '#253731'); P.r(28, 13, 5, 3, '#253731');
    P.r(31, 7, 2, 2, '#687164'); P.r(31, 13, 2, 2, '#596858');
    if (id % 2) { P.r(15, 8, 4, 4, '#9a9b79'); P.r(16, 8, 1, 4, '#c0b58a'); }
    if (id === 2 || id === 5) { P.r(4, 10, 8, 1, '#888468'); P.r(5, 9, 5, 1, '#b3a77c'); }
  });

  const masonry = (P, seed) => {
    const rng = mulberry32(seed);
    const stone = (x, y, w, h, light = false) => {
      P.r(x, y, w, h, '#233638');
      P.r(x + 1, y + 1, w - 2, h - 2, light ? '#69796f' : ['#455b55', '#4b6059', '#3f554f'][Math.floor(rng() * 3)]);
      P.r(x + 1, y + 1, w - 2, 1, light ? '#a8ac94' : '#78897a');
      P.r(x + w - 2, y + 2, 1, h - 3, '#2d4541');
      if (w > 7 && h > 5) { P.p(x + 3, y + 3, '#8a977f'); P.r(x + w - 5, y + h - 3, 3, 1, '#344b43'); }
    };
    const panel = (x, y, w, h) => {
      P.r(x, y, w, h, '#263c39');
      for (let yy = y; yy < y + h; yy += 9) for (let xx = x - (Math.floor((yy - y) / 9) % 2) * 9; xx < x + w; xx += 18) {
        const left = Math.max(x, xx), right = Math.min(x + w, xx + 18);
        if (right - left > 2) stone(left, yy, right - left, Math.min(9, y + h - yy));
      }
    };
    const slit = (x, y) => {
      stone(x - 2, y - 3, 10, 26, true); P.r(x + 1, y, 4, 18, '#0c2123');
      P.r(x + 2, y + 1, 1, 14, '#3d5750'); stone(x - 3, y + 20, 12, 3, true);
    };
    const ivy = (x, y, length) => {
      for (let yy = y; yy < y + length; yy += 3) {
        x += Math.floor(rng() * 3) - 1; P.line(x, yy, x + 1, yy + 4, '#273e2d');
        P.r(x - 2, yy, 3, 2, '#4d6845'); P.p(x - 2, yy, '#76865a');
        if (rng() < .6) P.r(x + 2, yy + 1, 3, 2, '#37553b');
      }
    };
    return { stone, panel, slit, ivy };
  };
  make('rampart', 128, 128, P => {
    const { stone, panel, slit, ivy } = masonry(P, 7413);
    panel(0, 29, 128, 96);
    P.r(0, 22, 128, 7, '#233936'); stone(0, 27, 128, 4, true);
    for (let x = 0; x < 128; x += 16) {
      stone(x, 17, 11, 11, true); P.r(x + 1, 18, 9, 1, '#a4ab94');
      P.r(x + 11, 25, 5, 2, '#132b2a');
    }
    for (const x of [10, 106]) {
      panel(x, 37, 10, 83); stone(x - 3, 113, 16, 11); stone(x - 2, 35, 14, 5, true);
      P.r(x + 1, 41, 1, 65, '#8a9980'); P.r(x + 8, 41, 2, 69, '#29413b');
    }
    slit(61, 52); ivy(33, 29, 53); ivy(93, 72, 46);
    P.line(82, 43, 78, 49, '#1b3532'); P.line(78, 49, 82, 57, '#1b3532');
    stone(0, 120, 128, 5); stone(0, 125, 128, 3, true);
    for (const [x, y] of [[23, 113], [46, 119], [76, 111], [97, 120]]) {
      P.r(x, y, 8, 2, '#47613f'); P.r(x + 2, y - 1, 4, 1, '#718253');
    }
  }, 3);
  make('wall_shadow', 64, 20, P => {
    for (let y = 0; y < 20; y++) P.r(0, y, 64, 1, 'rgba(3,12,12,' + ((20 - y) / 25) + ')');
  });
  make('gate_approach', 88, 65, P => {
    for (let row = 0; row < 8; row++) {
      const inset = row < 2 ? 9 : row * 2;
      for (let x = inset; x < 88 - inset; x += 17) {
        const width = Math.min(16, 88 - inset - x);
        P.r(x, row * 8, width, 7, ['#424d3d', '#4e5742', '#454f3d'][row % 3]);
        P.r(x + 1, row * 8, width - 2, 1, '#748069'); P.r(x + 1, row * 8 + 6, width - 2, 1, '#2c3b2e');
      }
    }
  });
  const gate = open => P => {
    const { stone, panel, slit, ivy } = masonry(P, 9981);
    P.shadow(128, 158, 250);
    panel(4, 57, 248, 97); panel(66, 46, 124, 109);
    stone(65, 43, 126, 7, true); stone(65, 53, 126, 5);
    for (let x = 68; x < 188; x += 16) stone(x, 34, 11, 10, true);
    // Torres de guarda ligadas às alas; suas bases não são áreas caminháveis.
    for (const x of [17, 191]) {
      panel(x, 24, 48, 129); stone(x - 3, 21, 54, 6, true);
      for (let xx = x - 3; xx < x + 49; xx += 13) stone(xx, 12, 9, 11, true);
      P.r(x + 2, 30, 2, 112, '#8a987e'); P.r(x + 43, 28, 4, 119, '#263d38');
      slit(x + 21, 43); slit(x + 21, 99);
      stone(x - 5, 144, 58, 11); stone(x - 6, 153, 60, 4, true);
    }
    // A abertura mede 48×3 = 144 pixels, a mesma largura da colisão.
    P.r(104, 105, 48, 49, '#0b1b1d'); P.r(110, 96, 36, 12, '#0b1b1d');
    P.r(118, 90, 20, 10, '#0b1b1d'); P.r(125, 87, 6, 5, '#0b1b1d');
    if (open) {
      P.r(107, 105, 42, 48, '#152b2b'); P.r(113, 101, 30, 52, '#1e3430');
      P.r(120, 104, 16, 49, '#344439'); P.r(126, 107, 4, 44, '#59634a');
      for (let y = 121; y < 153; y += 9) { P.r(108, y, 40, 1, '#4d5b43'); P.r(124, y + 1, 1, 8, '#182e28'); }
      for (const x of [99, 152]) {
        P.r(x, 105, 5, 47, '#4f5540'); P.r(x, 105, 1, 47, '#a49a66');
        for (const y of [113, 139]) P.r(x, y, 5, 2, '#98a18b');
      }
    } else {
      for (let x = 104; x < 152; x += 6) {
        const d = Math.abs(x + 3 - 128), top = d < 6 ? 90 : d < 14 ? 95 : 103;
        P.r(x, top, 6, 154 - top, '#51533f'); P.r(x, top, 1, 154 - top, '#8f8a60');
        P.r(x + 5, top, 1, 154 - top, '#283e31'); P.r(x + 2, 120 + x % 7, 1, 14, '#354735');
      }
      for (const y of [115, 143]) {
        P.r(104, y, 48, 4, '#283c39'); P.r(105, y, 46, 1, '#9ca38b');
        for (let x = 107; x < 152; x += 8) P.p(x, y + 2, '#cfbc7d');
      }
      P.r(127, 91, 2, 62, '#172f29');
      for (const x of [121, 133]) { P.r(x, 128, 3, 5, '#b29c60'); P.p(x + 1, 129, '#ead293'); }
    }
    for (const x of [93, 152]) {
      for (let y = 104; y < 153; y += 9) stone(x, y, 11, 9, true);
      stone(x - 3, 149, 17, 7, true);
    }
    for (const [x, y] of [[97, 96], [103, 87], [111, 81], [121, 77], [130, 78], [140, 83], [148, 91]]) stone(x, y, 11, 11, true);
    stone(102, 154, 52, 3, true); stone(98, 157, 60, 3);
    for (const x of [75, 171]) {
      panel(x, 66, 10, 87); stone(x - 2, 64, 14, 5, true); stone(x - 3, 145, 16, 10);
      P.r(x + 1, 71, 1, 66, '#9ca68a');
    }
    // Brasão gasto, correntes, rachaduras e hera sob as cornijas.
    polygon(P, [[117, 59], [139, 59], [138, 72], [128, 79], [118, 72]], '#273d37');
    polygon(P, [[120, 61], [136, 61], [135, 70], [128, 75], [121, 70]], '#77836b');
    P.r(126, 63, 4, 8, '#b2ae83'); P.r(123, 65, 10, 2, '#b2ae83');
    for (const x of [88, 166]) for (let y = 79; y < 127; y += 4) { P.r(x, y, 2, 3, '#233a36'); P.p(x, y, '#a1a58b'); }
    ivy(7, 58, 83); ivy(245, 56, 89); ivy(62, 35, 43); ivy(191, 73, 56);
    P.line(179, 55, 176, 61, '#1c3530'); P.line(176, 61, 180, 70, '#1c3530');
  };
  make('gate_closed', 256, 160, gate(false), 3);
  make('gate_open', 256, 160, gate(true), 3);
  // Separate hinges keep the stone facade motionless during opening.
  for (const [side, offset] of [['left', 104], ['right', 128]]) {
    make('gate_leaf_' + side, 24, 67, P => {
      for (let x = 0; x < 24; x += 6) {
        const source = offset + x, d = Math.abs(source + 3 - 128), top = (d < 6 ? 90 : d < 14 ? 95 : 103) - 87;
        P.r(x, top, 6, 67 - top, '#51533f'); P.r(x, top, 1, 67 - top, '#8f8a60');
        P.r(x + 5, top, 1, 67 - top, '#283e31'); P.r(x + 2, 33 + source % 7, 1, 14, '#354735');
      }
      for (const y of [28, 56]) {
        P.r(0, y, 24, 4, '#283c39'); P.r(1, y, 22, 1, '#9ca38b');
        for (let x = 3; x < 24; x += 8) P.p(x, y + 2, '#cfbc7d');
      }
      P.r(side === 'left' ? 23 : 0, 4, 1, 62, '#172f29');
      P.r(side === 'left' ? 17 : 5, 41, 3, 5, '#b29c60');
    }, 3);
  }
  make('castle_entry', 128, 112, P => {
    const { stone, panel } = masonry(P, 6509);
    P.shadow(64, 108, 124); panel(4, 20, 120, 87);
    P.r(34, 48, 60, 57, '#0a1720'); P.r(40, 34, 48, 17, '#0a1720');
    P.r(49, 25, 30, 12, '#0a1720'); P.r(58, 20, 12, 8, '#0a1720');
    P.r(38, 49, 52, 54, '#1c2a2c'); P.r(45, 51, 38, 52, '#303b35');
    for (let y = 69; y < 103; y += 9) {
      P.r(38, y, 52, 1, '#5d6451'); P.r(62 + y % 2 * 8, y + 1, 1, 8, '#152626');
    }
    for (const x of [25, 94]) {
      for (let y = 47; y < 104; y += 9) stone(x, y, 10, 9, true);
      stone(x - 3, 100, 16, 8, true);
    }
    for (const [x, y] of [[29, 39], [35, 29], [44, 21], [54, 15], [64, 15], [74, 20], [83, 28], [89, 38]]) stone(x, y, 11, 11, true);
    // As folhas da porta ficam dobradas nas laterais, com o centro livre.
    for (const x of [16, 102]) {
      P.r(x, 46, 10, 55, '#484638'); P.r(x + 1, 47, 2, 52, '#968268');
      for (const y of [57, 88]) { P.r(x, y, 10, 3, '#253840'); P.r(x + 1, y, 8, 1, '#a2a8a0'); }
    }
    for (const x of [5, 113]) {
      stone(x, 23, 10, 81); stone(x - 2, 19, 14, 6, true); stone(x - 2, 99, 14, 9);
    }
    stone(32, 105, 64, 4, true); stone(28, 109, 72, 3);
    P.r(59, 4, 10, 7, '#788477'); P.r(62, 5, 4, 5, '#c0b996');
  });
  make('bramble', 66, 34, P => {
    const rng = mulberry32(6451);
    for (let i = 0; i < 15; i++) {
      const x = 3 + Math.floor(rng() * 60), y = 17 + Math.floor(rng() * 12);
      const ex = x + Math.floor(rng() * 17) - 8, ey = 3 + Math.floor(rng() * 17);
      P.line(x, y + 2, ex, ey + 1, '#0b2423', 4); P.line(x, y, ex, ey, '#405445', 2);
      P.line(x, y - 1, ex, ey - 1, '#809174');
      for (let j = 2; j < 5; j++) { const f = j / 5, xx = Math.round(x + (ex - x) * f), yy = Math.round(y + (ey - y) * f); P.line(xx, yy, xx - 4, yy - 4, '#8a997f'); P.line(xx, yy, xx + 4, yy - 3, '#3b5f4d'); }
    }
    P.line(2, 27, 61, 23, '#253e30', 3); P.line(4, 26, 63, 22, '#6e825c');
    P.r(18, 20, 4, 2, '#426147'); P.r(44, 24, 5, 2, '#597456');
  });
  make('wisp', 7, 9, P => {
    P.r(3, 0, 1, 2, '#6b9f9b'); P.r(2, 2, 3, 4, '#95c0b1');
    P.r(1, 4, 5, 2, '#497d7a'); P.r(3, 3, 1, 3, '#d2e2c9'); P.p(2, 7, '#507b77');
  });
  make('puddle', 65, 33, P => {
    const rng = mulberry32(8324);
    for (let y = 1; y < 31; y++) {
      const half = Math.floor(Math.sqrt(Math.max(0, 1 - (y - 16) ** 2 / 225)) * (29 + Math.sin(y * 0.6) * 2));
      P.r(32 - half, y, half * 2, 1, y % 4 ? '#182e32' : '#203b3e');
      if (y % 5 === 0) P.r(35 - half, y, Math.floor(half * 0.8), 1, '#46615d');
    }
    for (let i = 0; i < 22; i++) { const x = 10 + Math.floor(rng() * 43), y = 7 + Math.floor(rng() * 21); P.r(x, y, 2 + Math.floor(rng() * 6), 1, '#73928a'); }
    P.r(18, 5, 12, 1, '#90a99a'); P.r(35, 21, 12, 1, '#6c8d83');
    P.r(26, 16, 5, 1, '#b4c3a8'); P.p(37, 14, '#d3d5b5');
  });

  // O halo passa do âmbar ao laranja queimado, como as tochas do castelo.
  SPR.canvas(scene, 'forest_glow_warm', 192, 192, g => {
    const gr = g.createRadialGradient(96, 96, 0, 96, 96, 96);
    gr.addColorStop(0, 'rgba(255,155,48,0.95)');
    gr.addColorStop(0.3, 'rgba(255,112,22,0.48)');
    gr.addColorStop(0.7, 'rgba(232,67,10,0.13)');
    gr.addColorStop(1, 'rgba(205,46,6,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 192, 192);
  });
  for (const [key, color, strength] of [['glow_cool', '89,128,140', 0.4], ['shadow', '1,6,12', 0.78]]) {
    SPR.canvas(scene, 'forest_' + key, 192, 192, g => {
      const gr = g.createRadialGradient(96, 96, 0, 96, 96, 96);
      gr.addColorStop(0, 'rgba(' + color + ',' + strength + ')');
      gr.addColorStop(0.32, 'rgba(' + color + ',' + strength * 0.48 + ')');
      gr.addColorStop(0.75, 'rgba(' + color + ',' + strength * 0.12 + ')');
      gr.addColorStop(1, 'rgba(' + color + ',0)'); g.fillStyle = gr; g.fillRect(0, 0, 192, 192);
    });
  }
  SPR.canvas(scene, 'forest_fog', 320, 96, g => {
    const rng = mulberry32(5832);
    for (let i = 0; i < 12; i++) {
      const x = 45 + rng() * 230, y = 35 + rng() * 25;
      g.save(); g.translate(x, y); g.scale(1.4, 0.3);
      const gr = g.createRadialGradient(0, 0, 3, 0, 0, 70);
      gr.addColorStop(0, 'rgba(83,103,116,0.14)'); gr.addColorStop(1, 'rgba(46,66,82,0)');
      g.fillStyle = gr; g.fillRect(-70, -70, 140, 140); g.restore();
    }
  });
}
