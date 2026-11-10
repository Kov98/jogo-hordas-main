// ============================================================
//  MAPA — Castelo do Cavaleiro Sombrio.
//  Construído UMA vez por partida, com semente fixa (CONFIG.seed):
//  o mesmo cenário sempre, sem duplicar nada ao reiniciar (a cena
//  inteira é destruída e recriada). Obstáculos sólidos são poucos e
//  pequenos; o resto é decoração.
//  Layout (mundo 4000×4000):
//    - salão ao norte, grande portão no centro
//    - caminho em cruz (leste-oeste e norte-sul) + pátios nos cantos
//    - arena circular do chefe no centro
//    - muralhas na borda; cemitério, ruínas e tochas
// ============================================================
class World {
  constructor(scene) {
    this.scene = scene;
    this.W = CONFIG.world.w; this.H = CONFIG.world.h; this.B = CONFIG.world.border;
    this.A = CONFIG.arena;
    this.arenaLock = false;
    this.solids = new Grid(256);   // obstáculos estáticos (círculos)
    this.lights = [];              // tochas e janelas com brilho animado
    this.fireSources = [];         // fontes para o emissor compartilhado de brasas
    this.rng = mulberry32(CONFIG.seed);
    this.tmp = [];
    this.placed = [];              // posições de pedras/ruínas (espaçamento)
    this.PATH = 70;                // meia-largura dos caminhos
    this.castleBottom = 300;
    this.plazas = [
      { x: 2000, y: 800, w: 640, h: 380 },   // pátio diante do castelo
      { x: 850, y: 850, w: 560, h: 560 },
      { x: 3150, y: 850, w: 560, h: 560 },
      { x: 850, y: 3150, w: 560, h: 560 },
      { x: 3150, y: 3150, w: 560, h: 560 },
    ];
    this.build();
  }

  // ---------- utilidades ----------
  rr(a, b) { return a + this.rng() * (b - a); }
  solid(x, y, r) { this.solids.insert({ x, y, radius: r }); }
  inArena(x, y, pad) { return Math.hypot(x - this.A.x, y - this.A.y) < this.A.r + pad; }
  onPath(x, y, pad) {
    const P = this.PATH + pad;
    if (Math.abs(y - 2000) < P && x > this.B && x < this.W - this.B) return true;
    if (Math.abs(x - 2000) < P && y > this.castleBottom - 20) return true;
    for (const c of this.plazas) if (Math.abs(x - c.x) < c.w / 2 + pad && Math.abs(y - c.y) < c.h / 2 + pad) return true;
    return false;
  }
  inCastle(x, y) { return y < this.castleBottom + 60 && Math.abs(x - 2000) < 520; }
  inCastleEntry(x, y, pad = 0) {
    return !!this.entry && Math.abs(x - this.entry.x) < 120 + pad && y > this.entry.endY - 80 - pad;
  }
  nearStart(x, y) { const s = CONFIG.player.start; return Math.hypot(x - s.x, y - s.y) < 260; }
  free(x, y, padPath, padArena, spacing) {
    if (x < this.B + 60 || x > this.W - this.B - 60 || y < this.B + 60 || y > this.H - this.B - 60) return false;
    if (this.onPath(x, y, padPath) || this.inArena(x, y, padArena) || this.inCastle(x, y) || this.inCastleEntry(x, y, spacing || 0) || this.nearStart(x, y)) return false;
    if (spacing) for (const o of this.placed) if (Math.abs(o.x - x) < spacing && Math.abs(o.y - y) < spacing && Math.hypot(o.x - x, o.y - y) < spacing) return false;
    return true;
  }
  prop(key, x, y, opt) {
    opt = opt || {};
    const im = this.scene.add.image(x, y, key).setOrigin(0.5, 1).setDepth(y).setTint(0xccc2d2);
    if (opt.flip) im.setFlipX(true);
    if (opt.tint) im.setTint(opt.tint);
    return im;
  }
  decal(key, x, y, scale, alpha, tint) {
    const im = this.scene.add.image(x, y, key).setDepth(-6000).setScale(scale || 1).setAlpha(alpha === undefined ? 1 : alpha);
    if (tint) im.setTint(tint);
    return im;
  }
  light(x, y, scale, alpha, tex) {
    const gl = this.scene.add.image(x, y, tex || 'dungeon_fire_glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(8500).setScale(scale).setAlpha(alpha);
    this.lights.push({ gl, x, y, sc: scale, a: alpha, ph: this.rng() * 6.28 });
    return gl;
  }
  torch(x, y) {
    const s = this.scene;
    this.prop('torch', x, y);
    const fl = s.add.sprite(x, y - 47, 'flame').setDepth(y + 1).setTint(0xffb864);
    fl.play('flame'); fl.anims.setProgress(this.rng());
    this.light(x, y - 46, 2.5, 0.4);
    this.light(x, y - 46, 0.6, 0.45);
    this.fireSources.push({ x, y: y - 47, rate: 5 });
    this.decal('dungeon_fire_glow', x + 8, y + 4, 1, 0.13).setScale(1.1, 0.22).setBlendMode(Phaser.BlendModes.ADD);
    this.solid(x, y - 4, 7);
  }

  // ---------- construção ----------
  build() {
    const s = this.scene, W = this.W, H = this.H, B = this.B, A = this.A;
    // Fica neste build, pois ForestWorld sobrescreve a construção do mapa.
    // Nem a porta sul nem sua reserva devem nascer no construtor compartilhado.
    this.entry = { x: W / 2, startY: H - B - 44, endY: H - B - 210, wallY: H - B - 100 };

    SPR.canvas(s, 'blotch', 128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    });

    // chão
    s.add.tileSprite(W / 2, H / 2, W, H, 'ground').setDepth(-10000);
    for (let i = 0; i < 160; i++) {
      const x = this.rr(B, W - B), y = this.rr(B, H - B);
      this.decal('blotch', x, y, this.rr(0.8, 2.4), this.rr(0.25, 0.55));
    }
    for (let i = 0; i < 40; i++) {
      const x = this.rr(B, W - B), y = this.rr(B, H - B);
      this.decal('blotch', x, y, this.rr(0.8, 1.8), 0.28, 0x3a5a3a); // musgo
    }

    // caminhos
    const path = (cx, cy, w, h) => s.add.tileSprite(cx, cy, w, h, 'path').setDepth(-9500);
    path(W / 2, 2000, W - 2 * B, this.PATH * 2);
    path(2000, (this.castleBottom + H - B) / 2, this.PATH * 2, H - B - this.castleBottom);
    for (const c of this.plazas) path(c.x, c.y, c.w, c.h);
    const eg = s.add.graphics().setDepth(-9490);
    eg.lineStyle(4, 0x100d16, 0.9);
    eg.strokeRect(B, 2000 - this.PATH, W - 2 * B, this.PATH * 2);
    eg.strokeRect(2000 - this.PATH, this.castleBottom, this.PATH * 2, H - B - this.castleBottom);
    for (const c of this.plazas) eg.strokeRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);

    // arena do chefe
    s.add.image(A.x, A.y, 'arena').setDepth(-9400);
    const rune = this.light(A.x, A.y, 5.5, 0.14, 'glow_red');
    rune.setDepth(-9390);

    // muralhas da borda
    const wall = (cx, cy, w, h) => s.add.tileSprite(cx, cy, w, h, 'wall').setDepth(-9000);
    wall(W / 2, B / 2, W, B); wall(W / 2, H - B / 2, W, B);
    wall(B / 2, H / 2, B, H); wall(W - B / 2, H / 2, B, H);
    const sh = s.add.graphics().setDepth(-8990);
    const band = (x, y, w, h, a1, a2, a3, a4) => { sh.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, a1, a2, a3, a4); sh.fillRect(x, y, w, h); };
    band(B, B, W - 2 * B, 46, 0.7, 0.7, 0, 0);
    band(B, H - B - 46, W - 2 * B, 46, 0, 0, 0.7, 0.7);
    band(B, B, 46, H - 2 * B, 0.7, 0, 0.7, 0);
    band(W - B - 46, B, 46, H - 2 * B, 0, 0.7, 0, 0.7);
    sh.lineStyle(6, 0x0a080e, 1); sh.strokeRect(B, B, W - 2 * B, H - 2 * B);

    this.buildNorthHall();
    this.buildPlazas();
    this.buildScatter();
    this.buildTorches();
    this.buildCastleEntry();
    this.buildCatacombStairs();
    this.buildAtmosphere();
  }

  buildCatacombStairs() {
    // The Knight guards a sealed stairway in the north hall, beyond the arena.
    this.gate={x:this.W/2,y:650};this.gateOpen=false;
    this.stairs=this.scene.add.image(this.gate.x,this.gate.y,'crypt_stairs').setDepth(-9350).setAlpha(.3);
    this.stairSeal=this.scene.add.image(this.gate.x,this.gate.y,'crypt_seal').setDepth(-9340).setAlpha(.8);
    this.stairGlow=this.light(this.gate.x,this.gate.y,2,.16,'crypt_glow').setDepth(-9330);
    this.exitTrail=[];
    for(let y=950;y<=1450;y+=125)this.exitTrail.push(this.decal('crypt_glow',this.gate.x,y,.35,.0).setDepth(-9320));
  }
  isAtStageExit(e) {return !!this.gate&&Math.abs(e.x-this.gate.x)<=66&&e.y>=this.gate.y-90&&e.y<=this.gate.y+155;}
  openCatacombStairs() {
    this.gateOpen=true;this.stairs?.setAlpha(1);this.stairSeal?.setVisible(false);
    this.stairGlow?.setAlpha(.3);for(const gl of this.exitTrail||[])gl.setAlpha(.18);
    this.hideBarrier();
  }

  buildCastleEntry() {
    const x = this.entry.x, y = this.H - this.B;
    // A abertura pertence à faixa de pedra da parede sul; o arco não é um
    // objeto solto no pátio. Só o corredor central atravessa essa parede.
    const front = this.entry.wallY, gap = 72, height = this.H - front;
    for (const [left, right] of [[0, x - gap], [x + gap, this.W]]) {
      this.scene.add.tileSprite((left + right) / 2, front + height / 2, right - left, height, 'wall').setDepth(-9000);
    }
    const trim = this.scene.add.graphics().setDepth(-8990);
    for (const [left, right] of [[0, x - gap], [x + gap, this.W]]) {
      trim.fillStyle(0x0c0a12).fillRect(left, front - 5, right - left, 8);
      trim.fillStyle(0x746777, .55).fillRect(left, front, right - left, 3);
    }
    this.scene.add.tileSprite(x, (this.entry.endY + y) / 2, 170, y - this.entry.endY + 20, 'path').setDepth(-9480);
    this.entryDoor = this.prop('forest_castle_entry', x, this.H, { tint: 0xddd0f0 }).setScale(1.2).setDepth(-8980);
    for (const side of [-1, 1]) {
      this.prop('banner', x + side * 204, y - 26);
      this.torch(x + side * 151, y - 25);
    }
    this.decal('dungeon_fire_glow', x, y - 44, 1.1, 0.1).setScale(1.4, 0.55).setBlendMode(Phaser.BlendModes.ADD);
  }

  buildNorthHall() {
    // O mapa já é o interior da fortaleza: nada de outro castelo em miniatura.
    const cx = this.W / 2;
    this.prop('hall_gate', cx, this.B + 150);
    for (const dx of [-170, 170]) {
      this.prop('pillar', cx + dx, this.B + 160);
      this.prop('banner', cx + dx * 1.35, this.B + 155);
      this.torch(cx + dx * 1.65, this.B + 170);
    }
    for (const [x, y] of [[330, 470], [3670, 470], [330, 3690], [3670, 3690]]) {
      this.prop('pillar', x, y); this.prop('banner', x + 40, y + 8);
      this.solid(x, y - 10, 15);
    }
  }

  buildPlazas() {
    const rng = () => this.rng();
    for (const c of this.plazas) {
      const hw = c.w / 2 - 36, hh = c.h / 2 - 36;
      // colunas nos cantos e meio das bordas
      const spots = [[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh]];
      if (c.x !== 2000) spots.push([0, -hh], [0, hh]);   // não bloqueia o caminho principal
      spots.forEach((p, i) => {
        const broken = rng() < 0.4;
        this.prop(broken ? 'pillar_broken' : 'pillar', c.x + p[0], c.y + p[1] + 20, { flip: rng() < 0.5 });
        this.solid(c.x + p[0], c.y + p[1] + 14, 15);
        if (i < 4) this.torch(c.x + p[0] * 0.82, c.y + p[1] * 0.82 + 20);
      });
      // detalhes centrais
      if (c.y > 1000 || c.x !== 2000) {
        const kind = rng();
        if (kind < 0.5) { this.prop('barrel', c.x - 40, c.y + 20); this.prop('barrel', c.x + 10, c.y + 36); this.solid(c.x - 40, c.y + 14, 11); this.solid(c.x + 10, c.y + 30, 11); }
        else { this.prop('rubble', c.x, c.y + 20); this.prop('bones', c.x + 70, c.y + 50); }
      }
    }
  }

  buildScatter() {
    const rng = this.rng, r = (a, b) => this.rr(a, b);

    // pedras
    let n = 0, tries = 0;
    while (n < 90 && tries++ < 1500) {
      const x = r(this.B, this.W - this.B), y = r(this.B, this.H - this.B);
      if (!this.free(x, y, 40, 70, 60)) continue;
      this.placed.push({ x, y });
      const k = (rng() * 3) | 0;
      this.prop(['rock1', 'rock2', 'rock3'][k], x, y, { flip: rng() < 0.5 });
      if (k !== 1) this.solid(x, y - 8, k === 2 ? 18 : 13);
      n++;
    }
    // escombros e ossos (decoração no chão)
    n = 0; tries = 0;
    while (n < 120 && tries++ < 1200) {
      const x = r(this.B + 40, this.W - this.B - 40), y = r(this.B + 40, this.H - this.B - 40);
      if (this.inCastle(x, y) || this.inCastleEntry(x, y)) continue;
      this.decal(rng() < 0.5 ? 'rubble' : 'bones', x, y, 1, 0.95).setFlipX(rng() < 0.5);
      n++;
    }
    // ruínas
    n = 0; tries = 0;
    while (n < 26 && tries++ < 1500) {
      const x = r(this.B + 100, this.W - this.B - 100), y = r(this.B + 100, this.H - this.B - 100);
      if (!this.free(x, y, 110, 100, 200)) continue;
      this.placed.push({ x, y });
      const k = ['ruin1', 'ruin2', 'ruin3'][(rng() * 3) | 0], w = k === 'ruin1' ? 108 : k === 'ruin2' ? 84 : 132;
      this.prop(k, x, y, { flip: rng() < 0.5 });
      for (let dx = -w / 2 + 18; dx <= w / 2 - 18; dx += 32) this.solid(x + dx, y - 10, 15);
      n++;
    }
    // cemitérios (3 aglomerados)
    for (const g of [[640, 2900], [3380, 1150], [1300, 1500]]) {
      for (let i = 0; i < 12; i++) {
        const x = g[0] + r(-190, 190), y = g[1] + r(-150, 150);
        if (this.onPath(x, y, 30) || this.inArena(x, y, 60) || this.inCastle(x, y)) continue;
        this.prop(rng() < 0.5 ? 'tomb1' : 'tomb2', x, y);
        this.solid(x, y - 8, 12);
        if (rng() < 0.4) this.decal('bones', x + 30, y + 10, 1, 0.9);
      }
    }
    // colunas e estandartes ao longo do caminho norte-sul
    for (let y = 760; y < this.H - this.B - 120; y += 300) {
      if (Math.abs(y - 2000) < 650) continue;
      for (const dx of [-135, 135]) {
        const broken = rng() < 0.35;
        this.prop(broken ? 'pillar_broken' : 'pillar', 2000 + dx, y, { flip: dx > 0 });
        this.solid(2000 + dx, y - 6, 15);
      }
      if (((y / 300) | 0) % 2 === 0) { this.prop('banner', 2000 - 135, y - 40); this.prop('banner', 2000 + 135, y - 40); }
    }
    // colunas ao longo do caminho leste-oeste
    for (let x = this.B + 220; x < this.W - this.B - 180; x += 330) {
      if (Math.abs(x - 2000) < 700) continue;
      for (const dy of [-130, 130]) {
        this.prop(rng() < 0.4 ? 'pillar_broken' : 'pillar', x, 2000 + dy);
        this.solid(x, 2000 + dy - 6, 15);
      }
    }
  }

  buildTorches() {
    const A = this.A;
    // anel de braseiros ao redor da arena
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + Math.PI / 8;
      this.torch(A.x + Math.cos(a) * (A.r + 70), A.y + Math.sin(a) * (A.r + 70));
    }
    // diante do castelo
    for (const dx of [-250, 250]) this.torch(2000 + dx, this.castleBottom + 70);
    // ao longo do caminho norte-sul
    for (let y = 1000; y < this.H - this.B - 100; y += 420) {
      if (Math.abs(y - 2000) < 600) continue;
      this.torch(2000 - 105, y); this.torch(2000 + 105, y + 210);
    }
    // junto às muralhas
    for (let x = this.B + 400; x < this.W - this.B - 200; x += 700) {
      this.torch(x, this.B + 54); this.torch(x + 350, this.H - this.B - 14);
    }
    for (let y = this.B + 600; y < this.H - this.B - 200; y += 700) {
      this.torch(this.B + 30, y); this.torch(this.W - this.B - 30, y + 350);
    }
  }

  buildAtmosphere() {
    const s = this.scene;
    SPR.canvas(s, 'dungeon_fog', 256, 64, (g) => {
      g.save(); g.translate(128, 32); g.scale(1, 0.25);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 128);
      gr.addColorStop(0, 'rgba(86,76,100,0.3)'); gr.addColorStop(1, 'rgba(86,76,100,0)');
      g.fillStyle = gr; g.fillRect(-128, -128, 256, 256); g.restore();
    });
    this.mists = [];
    for (let i = 0; i < 14; i++) {
      const x = this.rr(300, this.W - 300), y = this.rr(500, this.H - 300);
      const fog = s.add.image(x, y, 'dungeon_fog').setScale(2.8, 1.1).setDepth(-5200).setAlpha(0.045);
      this.mists.push({ fog, x, y, phase: i * 1.7 });
    }
    // Reflexos discretos no piso escuro.
    for (let i = 0; i < 70; i++) {
      this.decal('wet_floor', this.rr(200, this.W - 200), this.rr(300, this.H - 200), 1, 0.035, 0xc19970)
        .setScale(this.rr(0.6, 1.8), this.rr(0.12, 0.26)).setBlendMode(Phaser.BlendModes.ADD);
    }
    // Bordas e cantoneiras esculpidas nos pátios.
    const trim = s.add.graphics().setDepth(-9470);
    for (const c of this.plazas) {
      trim.lineStyle(2, 0x80877c, 0.3); trim.strokeRect(c.x - c.w / 2 + 9, c.y - c.h / 2 + 9, c.w - 18, c.h - 18);
      for (const dx of [-1, 1]) for (const dy of [-1, 1]) {
        const x = c.x + dx * (c.w / 2 - 16), y = c.y + dy * (c.h / 2 - 16);
        trim.lineStyle(3, 0xa5a285, 0.45); trim.lineBetween(x, y, x - dx * 24, y); trim.lineBetween(x, y, x, y - dy * 24);
      }
    }
  }

  // Barreira de fogo ao redor da arena (ativada na luta final)
  showBarrier() {
    const s = this.scene, A = this.A;
    this.barrierProps=[];this.barrierTweens=[];this.barrierLights=[];
    const g = s.add.graphics().setDepth(8000);
    g.lineStyle(10, 0xff2a2a, 0.55); g.strokeCircle(A.x, A.y, A.r);
    g.lineStyle(3, 0xffd0a0, 0.9); g.strokeCircle(A.x, A.y, A.r - 4);
    this.barrierProps.push(g);
    this.barrierTweens.push(s.tweens.add({ targets: g, alpha: { from: 0.45, to: 1 }, yoyo: true, repeat: -1, duration: 700 }));
    for (let i = 0; i < 44; i++) {
      const a = i / 44 * Math.PI * 2, x = A.x + Math.cos(a) * (A.r + 4), y = A.y + Math.sin(a) * (A.r + 4);
      const f = s.add.sprite(x, y, 'flame').setScale(2.6).setDepth(y + 40).setOrigin(0.5, 0.9).setTint(0xffb864);
      f.play('flame'); f.anims.setProgress(this.rng());
      this.barrierProps.push(f);
    }
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      this.light(A.x + Math.cos(a) * A.r, A.y + Math.sin(a) * A.r, 3.2, 0.5, 'glow_red');
      this.barrierLights.push(this.lights[this.lights.length-1]);
    }
  }
  hideBarrier() {
    for(const tween of this.barrierTweens||[]){tween.stop();tween.remove();}
    for(const prop of this.barrierProps||[])prop.destroy();
    const removed=new Set(this.barrierLights||[]);for(const light of removed)light.gl.destroy();
    this.lights=this.lights.filter(light=>!removed.has(light));
    this.barrierProps=[];this.barrierTweens=[];this.barrierLights=[];this.arenaLock=false;
  }

  // ---------- colisão ----------
  // Mantém a entidade dentro do mapa (ou da arena, na luta final) e fora dos obstáculos.
  constrain(e) {
    const r = e.radius || 12;
    if (this.arenaLock) {
      const dx = e.x - this.A.x, dy = e.y - this.A.y, d = Math.hypot(dx, dy), lim = this.A.r - r - 4;
      if (d > lim) { e.x = this.A.x + dx / d * lim; e.y = this.A.y + dy / d * lim; }
      return;
    }
    e.x = clamp(e.x, this.B + r, this.W - this.B - r);
    e.y = clamp(e.y, this.B + r, this.H - this.B - r);
    this.constrainCastleEntry(e);
    if (e.noObs || e.ghost || (e.def && (e.def.kind === 'flyer' || e.def.fly))) return;
    const list = this.solids.query(e.x, e.y, r, this.tmp);
    for (let i = 0; i < list.length; i++) {
      const o = list[i], dx = e.x - o.x, dy = e.y - o.y, rr = r + o.radius, d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 0.01, push = rr - d;
      e.x += dx / d * push; e.y += dy / d * push;
    }
    this.constrainCastleEntry(e);
  }

  constrainCastleEntry(e) {
    if (!this.entry || e.y + (e.radius || 12) < this.entry.wallY) return;
    const r = e.radius || 12, front = this.entry.wallY;
    for (const side of [-1, 1]) {
      const edge = this.entry.x + side * 72;
      const px = side < 0 ? Math.min(e.x, edge) : Math.max(e.x, edge);
      const py = Math.max(e.y, front), dx = e.x - px, dy = e.y - py, d2 = dx * dx + dy * dy;
      if (d2 >= r * r) continue;
      if (d2 > 0) { const push = r / Math.sqrt(d2) - 1; e.x += dx * push; e.y += dy * push; }
      else if (Math.abs(e.x - edge) < e.y - front) e.x = edge - side * r;
      else e.y = front - r;
    }
  }

  // Fora dos limites? (projéteis morrem ao tocar a muralha)
  outside(x, y) {
    return x < this.B - 10 || x > this.W - this.B + 10 || y < this.B - 10 || y > this.H - this.B + 10;
  }

  // Cintilar de tochas e janelas (só o que está perto da câmera)
  update(dt, t) {
    const v = this.scene.cameras.main.worldView;
    for (const mist of this.mists) {
      mist.fog.setPosition(mist.x + Math.sin(t * 0.12 + mist.phase) * 45, mist.y + Math.sin(t * 0.08 + mist.phase) * 10);
      mist.fog.setAlpha(0.045 + Math.sin(t * 0.3 + mist.phase) * 0.012);
    }
    for (const o of this.lights) {
      const near = o.x >= v.x - 400 && o.x <= v.right + 400 && o.y >= v.y - 400 && o.y <= v.bottom + 400;
      o.gl.setVisible(near);
      if (!near) continue;
      const f = Math.sin(t * 9 + o.ph) * 0.5 + Math.sin(t * 23 + o.ph * 2) * 0.5;
      o.gl.setAlpha(o.a + f * o.a * 0.14).setScale(o.sc * (1 + f * 0.04));
    }
  }
}
