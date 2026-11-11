// Primeira etapa: a trilha da mata. Colisões continuam centralizadas no World.
// build() é chamado pelo construtor de World: todos os campos próprios nascem aqui.
class ForestWorld extends World {
  build() {
    this.PATH = 80;
    this.gate = { x: 2000, y: 500 };
    this.gateOpen = false;
    this.forestTrees = [];
    this.boundaryTrees = [];
    this.decorativeBodies = [];
    this.lanterns = [];
    this.mists = [];
    this.wisps = [];
    this.barrierProps = [];
    this.barrierLights = [];
    this.barrierTweens = [];
    this.barrierActive = false;
    this.forestTick = 0;
    this.storySites = [
      { x: 1842, y: 3046, body: 0 }, { x: 2180, y: 3188, body: 1, cart: true },
      { x: 1880, y: 3412, body: 2 }, { x: 2282, y: 2760, body: 3 },
      { x: 1950, y: 2594, body: 4 }, { x: 1710, y: 1348, body: 5 },
      { x: 2045, y: 1170, body: 0 }, { x: 2190, y: 872, body: 1 },
      { x: 1800, y: 706, body: 2 }, { x: 1440, y: 1940, body: 3 },
      { x: 3020, y: 2054, body: 4 }, { x: 870, y: 1790, body: 5 },
      { x: 3160, y: 1190, body: 0 }, { x: 960, y: 3210, body: 1 },
      { x: 1450, y: 2300, body: 2 }, { x: 2555, y: 2230, body: 4 },
    ];
    this.pathBranches = [
      this.forestTrail([[2000, 3740], [1990, 3370], [2000, 3000], [2120, 2720], [2170, 2460], [2050, 2190], [2000, 2000], [1930, 1690], [1840, 1430], [1870, 1160], [2010, 920], [2000, 680], [2000, 500]], 82),
      this.forestTrail([[2000, 2000], [2450, 2080], [2780, 2200], [3100, 2140], [3470, 2310], [3780, 2220]], 59),
      this.forestTrail([[2000, 2000], [1550, 1980], [1280, 1800], [940, 1870], [650, 1680], [220, 1770]], 60),
      this.forestTrail([[2000, 3000], [1680, 3170], [1320, 3090], [1040, 3260], [650, 3180], [220, 3380]], 46),
      this.forestTrail([[1860, 1280], [1540, 1110], [1160, 1190], [750, 970], [220, 1020]], 43),
      this.forestTrail([[2010, 920], [2430, 1130], [2820, 1020], [3210, 1250], [3770, 1030]], 47),
    ];
    this.pathSamples = this.pathBranches.flatMap((branch, index) => branch.points.map(p => ({ x: p.x, y: p.y, halfWidth: branch.width, branch: index })));
    this.buildForestFloor();
    this.buildForestBoundary();
    this.buildForestInterior();
    this.buildForestStories();
    this.buildForestGate();
    this.buildForestAir();
  }

  // Amostras da mesma curva usadas na pintura e na reserva de espaço caminhável.
  forestTrail(nodes, width) {
    const points = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const p0 = nodes[Math.max(0, i - 1)], p1 = nodes[i], p2 = nodes[i + 1], p3 = nodes[Math.min(nodes.length - 1, i + 2)];
      const n = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 22);
      for (let j = 0; j < n; j++) {
        const t = j / n, t2 = t * t, t3 = t2 * t;
        const at = axis => 0.5 * ((2 * p1[axis]) + (-p0[axis] + p2[axis]) * t + (2 * p0[axis] - 5 * p1[axis] + 4 * p2[axis] - p3[axis]) * t2 + (-p0[axis] + 3 * p1[axis] - 3 * p2[axis] + p3[axis]) * t3);
        points.push({ x: at(0), y: at(1) });
      }
    }
    const end = nodes[nodes.length - 1]; points.push({ x: end[0], y: end[1] });
    return { points, width };
  }

  onPath(x, y, pad = 0) {
    if (!this.pathBranches) return false;
    for (const branch of this.pathBranches) {
      const radius = branch.width + pad, r2 = radius * radius;
      if (radius <= 0) continue;
      for (let i = 1; i < branch.points.length; i++) {
        const a = branch.points[i - 1], b = branch.points[i];
        const dx = b.x - a.x, dy = b.y - a.y;
        const u = clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
        const ex = x - a.x - dx * u, ey = y - a.y - dy * u;
        if (ex * ex + ey * ey < r2) return true;
      }
    }
    return false;
  }

  inCastle(x, y) {
    // A fachada é a borda norte inteira, não um objeto isolado no caminho.
    // A margem sul também reserva espaço para os contrafortes e sua sombra.
    return y < this.gate.y + 110;
  }

  free(x, y, padPath, padArena, spacing) {
    if (!super.free(x, y, padPath, padArena, spacing)) return false;
    for (const site of this.storySites) if (Math.hypot(x - site.x, y - site.y) < 102) return false;
    return true;
  }

  // Sombra fria nas peças da mata; os lampiões são desenhados separadamente.
  prop(key, x, y, opt = {}) {
    const im = this.scene.add.image(x, y, key).setOrigin(0.5, 1).setDepth(y);
    if (opt.flip) im.setFlipX(true);
    im.setTint(opt.tint || 0xb4b8bf);
    return im;
  }

  buildForestFloor() {
    const s = this.scene, A = this.A;
    s.add.tileSprite(this.W / 2, this.H / 2, this.W, this.H, 'forest_ground').setDepth(-10000);
    // O mapa de trilhas é desenhado em resolução 1:4, mantendo a borda em pixels.
    SPR.canvas(s, 'forest_routes', this.W / 4, this.H / 4, g => {
      const rng = mulberry32(CONFIG.seed ^ 0x19a72);
      const blob = (cx, cy, rx, ry, color) => {
        g.fillStyle = color;
        for (let y = -Math.floor(ry); y <= Math.floor(ry); y++) {
          const span = Math.floor(Math.sqrt(Math.max(0, 1 - y * y / (ry * ry))) * rx);
          if (span) g.fillRect(Math.floor(cx) - span, Math.floor(cy) + y, span * 2 + 1, 1);
        }
      };
      // Uma abertura de luar que preserva a textura do chão sob a vegetação.
      const reach = Math.ceil((A.r + 85) / 4), ax = A.x / 4, ay = A.y / 4;
      for (let y = -reach; y <= reach; y++) for (let x = -reach; x <= reach; x++) {
        const angle = Math.atan2(y, x), edge = A.r / 4 + Math.sin(angle * 5) * 8 + Math.cos(angle * 9) * 4;
        const d = Math.hypot(x, y), f = clamp((edge - d) / 42, 0, 1);
        if (!f) continue;
        g.fillStyle = 'rgba(42,53,49,' + (f * (0.08 + rng() * 0.08)) + ')';
        g.fillRect(ax + x, ay + y, 1, 1);
        if (rng() < 0.055) {
          g.fillStyle = 'rgba(77,87,71,' + f * 0.15 + ')'; g.fillRect(ax + x, ay + y, 1, 1);
        }
      }
      for (const branch of this.pathBranches) {
        for (const [pad, color] of [[32, '#17221f'], [13, '#202823'], [0, '#292d27'], [-17, '#30332b']]) {
          for (let i = 0; i < branch.points.length; i++) {
            const p = branch.points[i], w = (branch.width + pad + Math.sin(i * 1.7) * 5) / 4;
            blob(p.x / 4, p.y / 4, w, w * 0.94, color);
          }
        }
        for (let i = 0; i < branch.points.length * 7; i++) {
          const p = branch.points[Math.floor(rng() * branch.points.length)];
          const x = Math.floor((p.x + (rng() - 0.5) * branch.width * 1.7) / 4), y = Math.floor((p.y + (rng() - 0.5) * branch.width * 1.7) / 4);
          g.fillStyle = ['#434534', '#232d25', '#373e2f', '#504e3c', '#293128'][i % 5];
          g.fillRect(x, y, 1 + Math.floor(rng() * 2), 1);
          if (i % 13 === 0) { g.fillStyle = '#5a634f'; g.fillRect(x, y, 1, 1); }
        }
      }
      // Húmus e pedras pequenas quebram o contorno regular das margens.
      for (const p of this.pathSamples) {
        if (rng() > 0.33) continue;
        const sign = rng() < 0.5 ? -1 : 1;
        blob((p.x + sign * (p.halfWidth + rng() * 25)) / 4, p.y / 4,
          2 + rng() * 3, 1 + rng() * 2, '#253526');
      }
    });
    s.add.image(this.W / 2, this.H / 2, 'forest_routes').setScale(4).setDepth(-9900);
    this.decal('forest_glow_cool', A.x - 70, A.y - 60, 6.7, 0.035).setDepth(-9850).setBlendMode(Phaser.BlendModes.ADD);
    for (let i = 0; i < 180; i++) {
      const x = this.rr(this.B + 35, this.W - this.B - 35), y = this.rr(this.B + 40, this.H - this.B - 30);
      if (this.onPath(x, y, -20) || this.inCastle(x, y)) continue;
      this.decal('forest_moss_patch', x, y, this.rr(0.8, 2.8), this.rr(0.36, 0.75)).setDepth(-9820).setFlipX(this.rng() < 0.5);
    }
    for (let i = 0; i < 330; i++) {
      const x = this.rr(this.B + 20, this.W - this.B - 20), y = this.rr(this.B + 20, this.H - this.B - 20);
      if (this.inCastle(x, y)) continue;
      this.decal('forest_leaves', x, y, this.rr(0.6, 1.5), this.rr(0.3, 0.75)).setRotation(this.rr(-0.5, 0.5));
    }
    for (let i = 0; i < 85; i++) {
      const p = this.pathSamples[Math.floor(this.rng() * this.pathSamples.length)];
      const x = p.x + this.rr(-p.halfWidth, p.halfWidth), y = p.y + this.rr(-p.halfWidth, p.halfWidth);
      if (this.inCastle(x, y)) continue;
      this.decal('forest_stones', x, y, this.rr(0.48, 0.9), this.rr(0.45, 0.8)).setFlipX(this.rng() < 0.5);
    }
    for (const [x, y, sx, sy] of [[2060, 3220, 1.2, 0.8], [2180, 2810, 0.9, 0.6], [1760, 1380, 1.2, 0.8], [2075, 1055, 0.9, 0.7], [1180, 1905, 1.3, 1], [2980, 2270, 1.4, 0.9], [1530, 3180, 1.6, 1.1], [2460, 1010, 1.4, 0.8], [3500, 2950, 2, 1.1], [720, 620, 1.8, 1]]) {
      this.decal('forest_shadow', x + 8, y + 10, 1.2, 0.32).setScale(1.4, 0.45);
      this.decal('forest_puddle', x, y, 1, 0.68).setScale(sx, sy);
      this.decal('forest_glow_cool', x + 5, y, 1, 0.025).setScale(0.9, 0.24).setBlendMode(Phaser.BlendModes.ADD);
    }
  }

  forestTree(x, y, type, boundary = false, scale = 1) {
    const sizes = { oak: [192, 240, 24], pine: [126, 195, 16], birch: [126, 195, 13], dead: [126, 183, 15] };
    const size = sizes[type], tint = boundary ? 0x98a6ac : [0xb7c1bb, 0xaebbbd, 0xbfc2b1, 0xb0babd][Math.floor(this.rng() * 4)];
    const image = this.prop('forest_tree_' + type, x, y, { flip: this.rng() < 0.5, tint }).setScale(scale);
    const tree = { x, y, image, width: size[0] * scale, height: size[1] * scale, radius: size[2] * scale, alpha: boundary ? 0.98 : 1 };
    image.setAlpha(tree.alpha);
    this.forestTrees.push(tree);
    if (boundary) this.boundaryTrees.push(tree);
    else this.decal('forest_shadow', x + 12, y - 5, 1, 0.5).setScale(scale * 1.08, scale * 0.36).setDepth(-6010);
    this.solid(x, y - 6 * scale, tree.radius);
    return tree;
  }

  buildForestBoundary() {
    const choose = i => ['pine', 'oak', 'pine', 'birch', 'oak'][i % 5];
    // Duas linhas entrelaçadas cobrem o limite matemático sem uma muralha de pedra.
    for (let row = 0; row < 2; row++) {
      let i = 0;
      for (let x = -60 + row * 47; x < this.W + 110; x += 88 + this.rr(-12, 18)) {
        this.forestTree(x, 132 + row * 102 + this.rr(-15, 15), choose(i++), true, this.rr(0.94, 1.17));
        this.forestTree(x + this.rr(-20, 20), this.H + 50 - row * 115 + this.rr(-12, 12), choose(i++), true, this.rr(0.95, 1.17));
      }
      for (let y = 240; y < this.H + 100; y += 94 + this.rr(-13, 18)) {
        this.forestTree(65 + row * 104 + this.rr(-12, 12), y, choose(i++), true, this.rr(1, 1.14));
        this.forestTree(this.W - 40 - row * 100 + this.rr(-12, 12), y + this.rr(-25, 25), choose(i++), true, this.rr(1, 1.14));
      }
    }
  }

  buildForestInterior() {
    let count = 0, tries = 0;
    while (count < 215 && tries++ < 5000) {
      const x = this.rr(this.B + 130, this.W - this.B - 130), y = this.rr(this.B + 200, this.H - this.B - 100);
      if (!this.free(x, y, 57, 120, 103)) continue;
      const r = this.rng(), type = r < 0.28 ? 'pine' : r < 0.64 ? 'oak' : r < 0.88 ? 'birch' : 'dead';
      this.forestTree(x, y, type, false, type === 'oak' ? this.rr(0.78, 1.02) : this.rr(0.82, 1.08));
      this.placed.push({ x, y }); count++;
    }
    for (let i = 0; i < 590; i++) {
      const x = this.rr(this.B + 40, this.W - this.B - 40), y = this.rr(this.B + 110, this.H - this.B - 55);
      if (this.onPath(x, y, 2) || this.inCastle(x, y)) continue;
      if (this.inArena(x, y, -35) && this.rng() < 0.75) continue;
      const key = i % 17 === 0 ? 'forest_flowers' : i % 3 === 0 ? 'forest_grass' : 'forest_fern';
      this.prop(key, x, y, { flip: this.rng() < 0.5 }).setScale(this.rr(0.65, 1.12)).setAlpha(this.rr(0.68, 0.96));
    }
    count = 0; tries = 0;
    while (count < 68 && tries++ < 2200) {
      const x = this.rr(this.B + 80, this.W - this.B - 80), y = this.rr(this.B + 180, this.H - this.B - 70);
      if (!this.free(x, y, 32, 75, 58)) continue;
      const id = Math.floor(this.rng() * 3);
      this.prop('forest_rock_' + id, x, y, { flip: this.rng() < 0.5 });
      this.solid(x, y - 6, [14, 9, 20][id]); this.placed.push({ x, y }); count++;
    }
    count = 0; tries = 0;
    while (count < 31 && tries++ < 1500) {
      const x = this.rr(this.B + 130, this.W - this.B - 130), y = this.rr(this.B + 220, this.H - this.B - 100);
      if (!this.free(x, y, 65, 110, 105)) continue;
      const stump = count % 3 === 0;
      this.prop(stump ? 'forest_stump' : 'forest_log', x, y, { flip: this.rng() < 0.5 });
      if (stump) this.solid(x, y - 8, 13);
      else for (const dx of [-31, 0, 31]) this.solid(x + dx, y - 9, 12);
      this.decal('forest_roots', x + 3, y + 8, 1, 0.5).setFlipX(this.rng() < 0.5);
      this.placed.push({ x, y }); count++;
    }
    // Raízes antigas nas bordas da clareira, deixando largos acessos à trilha.
    for (let i = 0; i < 17; i++) {
      const a = i * 2.39996, d = this.A.r + this.rr(20, 95);
      const x = this.A.x + Math.cos(a) * d, y = this.A.y + Math.sin(a) * d;
      if (this.onPath(x, y, 50)) continue;
      this.decal('forest_roots', x, y, this.rr(0.9, 1.6), 0.7).setRotation(a * 0.3);
      if (i % 3 === 0) this.prop('forest_stump', x + 20, y + 12).setAlpha(0.8);
    }
  }

  forestLantern(x, y, opt = {}) {
    const s = this.scene, depth = opt.depth === undefined ? y + 1 : opt.depth;
    const image = s.add.image(x, y, 'forest_lantern').setOrigin(0.5, 1).setDepth(depth).setScale(opt.small ? 0.85 : 1);
    const glow = this.light(x, y - 17, opt.scale || 1.9, opt.alpha || 0.48, 'forest_glow_warm');
    this.light(x, y - 17, 0.38, 0.42, 'forest_glow_warm');
    const spill = this.decal('forest_glow_warm', x + 4, opt.groundY === undefined ? y + 2 : opt.groundY, 1, 0.32)
      .setScale(1.65, 0.5).setBlendMode(Phaser.BlendModes.ADD);
    const lamp = { x, y, image, glow, spill, phase: this.rng() * Math.PI * 2 };
    this.fireSources.push({ x, y: y - 17, rate: 3 });
    this.lanterns.push(lamp); return lamp;
  }

  buildForestStories() {
    for (let i = 0; i < this.storySites.length; i++) {
      const site = this.storySites[i];
      this.decal('forest_leaves', site.x, site.y + 4, 1.3, 0.7);
      const sprite = this.decal('forest_body_' + site.body, site.x, site.y, 1, 0.95).setRotation((i % 5 - 2) * 0.16).setFlipX(i % 2 === 0);
      const lx = site.x + (i % 2 ? -34 : 38), ly = site.y + (i % 3 ? 16 : -8);
      const lantern = this.forestLantern(lx, ly, { scale: i < 9 ? 2 : 1.75, alpha: 0.48 });
      this.decorativeBodies.push({ x: site.x, y: site.y, sprite, lantern });
      if (site.cart) {
        this.prop('forest_cart', site.x + 43, site.y - 34, { flip: true });
        this.decal('forest_stones', site.x + 72, site.y + 14, 1, 0.7);
      }
    }
    for (const [x, y] of [[2160, 3450], [1855, 2850], [2315, 2520], [1730, 1550], [2075, 1190], [2145, 720], [2800, 2090], [1150, 1780]]) {
      this.prop('forest_post', x, y);
      this.forestLantern(x + 16, y - 52, { groundY: y + 4, depth: y + 1, scale: 1.95, alpha: 0.44 });
      // Somente o pequeno pé do poste é sólido; as pessoas são decalques.
      if (!this.onPath(x, y, 25)) this.solid(x - 2, y - 5, 6);
    }
  }

  buildForestGate() {
    const x = this.gate.x, y = this.gate.y;
    // A muralha continua até as árvores das duas bordas. As alas repetem
    // blocos de pedra, enquanto o corpo central e suas torres são únicos.
    const wing = x - 288;
    this.scene.add.tileSprite(wing / 2, y, wing, 384, 'forest_rampart').setOrigin(0.5, 1).setDepth(y - 3);
    const right = x + 288;
    this.scene.add.tileSprite((right + this.W) / 2, y, this.W - right, 384, 'forest_rampart').setOrigin(0.5, 1).setDepth(y - 3);
    this.scene.add.tileSprite(this.W / 2, y + 25, this.W, 52, 'forest_wall_shadow').setDepth(-6020).setAlpha(0.72);
    this.decal('forest_shadow', x, y + 5, 3.8, 0.55).setScale(4.5, 0.8);
    this.decal('forest_gate_approach', x, y + 59, 1, 0.92).setDepth(-9810);
    // O fundo continua escuro enquanto as folhas se movem na cena do chefe.
    this.gateImage = this.prop('forest_gate_dark', x, y);
    this.gateLeaves = [
      this.scene.add.image(x - 72, y - 18, 'forest_gate_leaf_left').setOrigin(0, 1),
      this.scene.add.image(x + 72, y - 18, 'forest_gate_leaf_right').setOrigin(1, 1),
    ];
    for (const leaf of this.gateLeaves) leaf.setDepth(y + 0.5).setTint(0xb4b8bf);
    this.forestLantern(x - 106, y - 57, { depth: y + 1, groundY: y + 8, scale: 2.1, alpha: 0.5 });
    this.forestLantern(x + 106, y - 57, { depth: y + 1, groundY: y + 8, scale: 2.1, alpha: 0.5 });
    this.light(x, y - 112, 1.1, 0, 'forest_glow_white');
    this.gateBeacon = this.lights[this.lights.length - 1];
    this.gateSpill = this.decal('forest_glow_white', x, y + 30, 1, 0).setScale(1.4, 0.65).setBlendMode(Phaser.BlendModes.ADD);
    this.decal('forest_stones', x - 130, y + 29, 0.8, 0.8);
    this.decal('forest_stones', x + 138, y + 46, 0.75, 0.8).setFlipX(true);
    for (const [tx, ty, type, scale] of [[185, 535, 'oak', 1.08], [278, 521, 'pine', 1], [this.W - 180, 540, 'oak', 1.08], [this.W - 277, 522, 'birch', 1]]) {
      this.forestTree(tx, ty, type, true, scale);
    }
  }

  buildForestAir() {
    for (let i = 0; i < 18; i++) {
      const x = this.rr(280, this.W - 280), y = this.rr(600, this.H - 220);
      const fog = this.scene.add.image(x, y, 'forest_fog').setScale(this.rr(1.6, 2.8), this.rr(1, 1.6)).setDepth(-5100).setAlpha(0.06);
      // Névoa discreta para preservar o contraste entre a noite e os lampiões.
      this.mists.push({ fog, x, y, phase: i * 1.71 });
    }
    for (let i = 0; i < 25; i++) {
      const x = this.rr(350, this.W - 350), y = this.rr(650, this.H - 300);
      const image = this.scene.add.image(x, y, 'forest_wisp').setDepth(y + 15).setAlpha(0.2).setBlendMode(Phaser.BlendModes.ADD);
      this.wisps.push({ image, x, y, phase: this.rng() * Math.PI * 2 });
    }
  }

  showBarrier() {
    if (this.barrierActive || this.gateOpen) return;
    this.barrierActive = true;
    const A = this.A;
    for (let i = 0; i < 58; i++) {
      const a = i / 58 * Math.PI * 2, x = A.x + Math.cos(a) * (A.r + 2), y = A.y + Math.sin(a) * (A.r + 2);
      const root = this.prop('forest_bramble', x, y).setOrigin(0.5, 0.75).setRotation(a + Math.PI / 2).setScale(this.rr(0.9, 1.1));
      this.barrierProps.push(root);
    }
    // O pulso é do mato. Não há chão ritual ou anel de fogo na floresta.
    this.barrierTweens.push(this.scene.tweens.add({ targets: this.barrierProps, alpha: { from: 0.72, to: 1 }, duration: 1300, yoyo: true, repeat: -1 }));
    for (let i = 0; i < 10; i++) {
      const a = (i + 0.35) / 10 * Math.PI * 2;
      this.light(A.x + Math.cos(a) * A.r, A.y + Math.sin(a) * A.r, 1.25, 0.105, 'forest_glow_cool');
      this.barrierLights.push(this.lights[this.lights.length - 1]);
    }
  }

  hideBarrier() {
    for (const tween of this.barrierTweens) { tween.stop(); tween.remove(); }
    for (const root of this.barrierProps) { this.scene.tweens.killTweensOf(root); root.destroy(); }
    const gone = new Set(this.barrierLights);
    for (const lamp of this.barrierLights) { this.scene.tweens.killTweensOf(lamp.gl); lamp.gl.destroy(); }
    this.lights = this.lights.filter(lamp => !gone.has(lamp));
    this.barrierProps.length = 0; this.barrierLights.length = 0; this.barrierTweens.length = 0;
    this.barrierActive = false;
  }

  openCastleGate() {
    this.gateOpen = true;
    this.arenaLock = false;
    this.hideBarrier();
    // A tintura fria dos objetos da mata não pode acinzentar o vão branco.
    this.gateImage.setTexture('forest_gate_open').clearTint();
    for (const leaf of this.gateLeaves || []) leaf.setVisible(false);
    this.gateBeacon.a = 0.37; this.gateBeacon.sc = 1.8;
    this.gateSpill.setAlpha(0.34).setScale(1.9, 0.85);
  }

  isAtCastleDoor(entity) {
    if (!entity) return false;
    const radius = entity.radius || 12;
    return Math.abs(entity.x - this.gate.x) <= 72 - radius &&
      entity.y >= this.gate.y - 100 + radius && entity.y <= this.gate.y + 100;
  }

  animateCastleGate() {
    if (this.gateOpening) return this.gateOpening;
    if (this.gateOpen) return Promise.resolve(true);
    const sc = this.scene, initialization = sc.initialization;
    this.gateOpening = (async () => {
      sc.cameras.main.shake(1000, 0.002);
      sc.fx.burst('bone', this.gate.x, this.gate.y - 12, 20);
      sc.fx.embers(this.gate.x, this.gate.y - 25, 16);
      const ok = await sc.cinematicTween({ targets: this.gateLeaves, scaleX: 0.07, duration: 1400, ease: 'Sine.easeInOut' });
      if (!ok || !sc.cinematicValid(initialization)) return false;
      this.openCastleGate();
      return true;
    })();
    return this.gateOpening;
  }

  constrain(e) {
    super.constrain(e);
    const radius = e.radius || 12, front = this.gate.y;
    if (!this.gateOpen) {
      e.y = Math.max(e.y, front + radius);
    } else {
      // Dois semiplanos de pedra deixam somente o corredor central aberto.
      // A face traseira impede subir no telhado; os cantos usam círculo ×
      // retângulo para deslizar pelas ombreiras sem abrir atalhos diagonais.
      e.y = Math.max(e.y, front - 100 + radius);
      for (const side of [-1, 1]) {
        const edge = this.gate.x + side * 72;
        const px = side < 0 ? Math.min(e.x, edge) : Math.max(e.x, edge);
        const py = Math.min(e.y, front), dx = e.x - px, dy = e.y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 >= radius * radius) continue;
        if (d2 > 0) {
          const d = Math.sqrt(d2), push = radius / d - 1;
          e.x += dx * push; e.y += dy * push;
        } else if (Math.abs(e.x - edge) < front - e.y) {
          e.x = edge - side * radius;
        } else {
          e.y = front + radius;
        }
      }
    }
    // Na mata os troncos alcançam a borda. A resolução dos círculos pode
    // empurrar para fora uma entidade que World já havia limitado no início.
    // O limite do mundo continua valendo depois dessas colisões também.
    e.x = clamp(e.x, this.B + radius, this.W - this.B - radius);
    e.y = clamp(e.y, this.B + radius, this.H - this.B - radius);
  }

  update(dt, t) {
    super.update(dt, t);
    const v = this.scene.cameras.main.worldView;
    for (const mist of this.mists) {
      if (mist.x < v.x - 550 || mist.x > v.right + 550 || mist.y < v.y - 160 || mist.y > v.bottom + 160) continue;
      mist.fog.setAlpha(0.06 + Math.sin(t * 0.23 + mist.phase) * 0.015);
    }
    this.forestTick += dt;
    if (this.forestTick < 0.08) return;
    const step = Math.min(this.forestTick, 0.25); this.forestTick = 0;
    const player = this.scene.player;
    for (const tree of this.forestTrees) {
      if (tree.x < v.x - 180 || tree.x > v.right + 180 || tree.y < v.y - 40 || tree.y > v.bottom + tree.height) continue;
      // A copa revela o herói ao passar por baixo; o tronco mantém sua colisão.
      const covered = player && Math.abs(player.x - tree.x) < tree.width * 0.4 && player.y < tree.y - 22 && player.y > tree.y - tree.height + 22;
      const target = covered ? 0.46 : tree.alpha;
      if (Math.abs(tree.image.alpha - target) > 0.01) tree.image.setAlpha(lerp(tree.image.alpha, target, Math.min(1, step * 7)));
    }
    for (const lamp of this.lanterns) {
      if (lamp.x < v.x - 250 || lamp.x > v.right + 250 || lamp.y < v.y - 250 || lamp.y > v.bottom + 250) continue;
      const f = Math.sin(t * 4.7 + lamp.phase) * 0.035 + Math.sin(t * 11.3 + lamp.phase) * 0.015;
      lamp.image.setAlpha(0.94 + f); lamp.spill.setAlpha(0.32 + f * 0.3);
    }
    for (const wisp of this.wisps) {
      const near = wisp.x > v.x - 60 && wisp.x < v.right + 60 && wisp.y > v.y - 60 && wisp.y < v.bottom + 60;
      wisp.image.setVisible(near);
      if (!near) continue;
      wisp.image.setPosition(wisp.x + Math.sin(t * 0.32 + wisp.phase) * 24, wisp.y + Math.cos(t * 0.41 + wisp.phase) * 11);
      wisp.image.setAlpha(0.12 + Math.max(0, Math.sin(t * 0.8 + wisp.phase)) * 0.2);
    }
  }
}
