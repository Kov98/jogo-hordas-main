// ============================================================
//  FX — efeitos visuais: anéis, raios, alertas no chão, números
//  de dano e partículas. Tudo com limite e reaproveitamento.
// ============================================================
class FX {
  constructor(scene) {
    this.scene = scene;
    this.list = [];            // efeitos desenhados via Graphics (alto)
    this.ground = [];          // alertas desenhados no chão (baixo)
    this.gTop = scene.add.graphics().setDepth(9000);
    this.gGround = scene.add.graphics().setDepth(-5000);

    // Números de dano (pool)
    this.nums = [];
    for (let i = 0; i < CONFIG.maxDamageNumbers; i++) {
      const t = scene.add.text(0, 0, '', { fontFamily: '"Courier New", monospace', fontSize: '15px', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 3 })
        .setOrigin(0.5).setDepth(9500).setVisible(false);
      t.life = 0; t.vy = 0;
      this.nums.push(t);
    }

    // Varas de golpe (pool) para o Golpe Giratório
    this.sweeps = [];
    for (let i = 0; i < 4; i++) {
      const s = scene.add.image(0, 0, 'sweep').setDepth(8800).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
      s.t = 0; s.dur = 0.2; s.active2 = false;
      this.sweeps.push(s);
    }

    // Corpos em animação de derrota (pool)
    this.corpses = [];
    for (let i = 0; i < 40; i++) {
      const s = scene.add.image(0, 0, 'e_skel_warrior', 0).setVisible(false);
      s.live = false; s.t = 0; s.dir = 1;
      this.corpses.push(s);
    }

    // Dash pools: fixed budgets, independent of casts/frame rate.
    this.dashTrails = Array.from({ length: 12 }, () => scene.add.image(0, 0, 'fx_dash_trail').setVisible(false));
    this.dashPuffs = Array.from({ length: 24 }, () => scene.add.image(0, 0, 'fx_dash_smoke').setVisible(false));
    for (const s of [...this.dashTrails, ...this.dashPuffs]) s.dashLife = 0;

    // Emissores de partículas
    const mk = (tint, speed, life, scale, add) => scene.add.particles(0, 0, 'px', {
      speed: { min: speed * 0.3, max: speed }, lifespan: life, scale: { start: scale, end: 0 },
      alpha: { start: 1, end: 0 }, tint, emitting: false, maxParticles: 180, blendMode: add ? 'ADD' : 'NORMAL', angle: { min: 0, max: 360 },
    }).setDepth(8900);
    this.em = {
      bone: mk([0xd8d2bd, 0x9c957c, 0x5d5846], 170, 420, 2.2, false),
      dark: mk([0x7a2bd6, 0x3a1a60, 0xb070ff], 200, 500, 2.4, true),
      fire: mk([0xff8a20, 0xffd070, 0xd83a10], 240, 450, 2.6, true),
      spark: mk([0x9ad8ff, 0xffffff, 0x60e8ff], 260, 380, 2, true),
      gold: mk([0xffe070, 0xffffff], 160, 500, 2, true),
      blood: mk([0xa01818, 0xff2a2a, 0x4a0a10], 220, 600, 2.6, false),
    };
    // Brasas pequenas e ascendentes, compartilhadas por fogo e cenário.
    this.em.ember = scene.add.particles(0, 0, 'px', {
      emitting: false, maxParticles: 128, lifespan: { min: 500, max: 1100 },
      speedX: { min: -15, max: 15 }, speedY: { min: -38, max: -14 }, gravityY: -12,
      scale: { start: 1.05, end: 0 }, alpha: { start: 0.95, end: 0 },
      tint: [0xff6824, 0xffa13b, 0xffd47c], blendMode: 'ADD',
    }).setDepth(8920);
    this.em.smoke = scene.add.particles(0, 0, 'px', {
      emitting: false, maxParticles: 64, lifespan: { min: 400, max: 850 },
      speedX: { min: -16, max: 16 }, speedY: { min: -30, max: -10 },
      scale: { start: 2, end: 5 }, alpha: { start: 0.18, end: 0 },
      tint: [0x70656b, 0x49404d, 0x292432], blendMode: 'NORMAL',
    }).setDepth(8880);
    this.fireSourceCursor = 0;
  }

  dashTrail(player, smoke) {
    const s = this.dashTrails.find(s => s.dashLife <= 0);
    if (!s) return;
    s.dashLife = s.dashDur = smoke ? 0.30 : 0.18;
    s.dashSmoke = smoke;
    s.setTexture(player.sprite.texture.key, player.sprite.frame.name)
      .setPosition(player.x, player.y).setFlipX(player.sprite.flipX)
      .setDepth(player.y + 18).setTint(smoke ? 0xb4a5de : player.def.color)
      .setScale(1).setAlpha(smoke ? 0.35 : 0.48).setVisible(true);
  }

  dashPuff(x, y, smoke, color) {
    const count = smoke ? 8 : 4;
    for (let i = 0; i < count; i++) {
      const s = this.dashPuffs.find(s => s.dashLife <= 0);
      if (!s) break;
      const a = i / count * Math.PI * 2;
      s.dashLife = s.dashDur = smoke ? 0.42 : 0.24;
      s.dashSmoke = smoke; s.dashAngle = a;
      s.dashVX = Math.cos(a) * (smoke ? 38 : 60);
      s.dashVY = Math.sin(a) * 28 - 12;
      s.setTexture(smoke ? 'fx_dash_smoke' : 'fx_dash_trail')
        .setPosition(x + Math.cos(a) * 7, y + 8 + Math.sin(a) * 5)
        .setDepth(y + 21).setTint(smoke ? (i % 2 ? 0xb4a5de : 0x74758e) : color)
        .setRotation(smoke ? 0 : a).setScale(smoke ? 0.65 : 0.7).setAlpha(0.7).setVisible(true);
    }
    this.ring(x, y + 10, 5, smoke ? 30 : 22, 0.2, smoke ? 0xc7b5ec : color, 2);
  }

  burst(kind, x, y, n) { this.em[kind].explode(n, x, y); }

  embers(x, y, count = 1) {
    this.em.ember.explode(Math.min(12, Math.max(0, Math.floor(count))), x, y);
  }

  updateFireSources(dt) {
    const sources = this.scene.world?.fireSources;
    if (!sources?.length || dt <= 0) return;
    const v = this.scene.cameras.main.worldView;
    const step = Math.min(dt, 0.25);
    for (const source of sources) {
      source.emberVisible = source.x >= v.x - 32 && source.x <= v.right + 32 &&
        source.y >= v.y - 48 && source.y <= v.bottom + 48;
      // Uma fonte distante não acumula emissão para quando a câmera voltar.
      source.emberCredit = source.emberVisible
        ? Math.min(1, (source.emberCredit || 0) + step * (source.rate || 3)) : 0;
    }
    let budget = 8;
    const start = (this.fireSourceCursor || 0) % sources.length;
    for (let i = 0; i < sources.length && budget > 0; i++) {
      const source = sources[(start + i) % sources.length];
      if (!source.emberVisible || source.emberCredit < 1) continue;
      this.embers(source.x, source.y, 1);
      source.emberCredit -= 1;
      budget--;
    }
    this.fireSourceCursor = (start + 1) % sources.length;
  }

  // Animação de derrota: o inimigo pisca em branco, achata e some.
  corpse(e) {
    for (const s of this.corpses) {
      if (s.live) continue;
      s.live = true; s.t = 0; s.dir = Math.random() < 0.5 ? -1 : 1; s.size = e.sprite.scaleX;
      s.setTexture('e_' + e.id, 0).setPosition(e.x, e.y).setFlipX(e.sprite.flipX)
        .setVisible(true).setAlpha(1).setScale(s.size).setRotation(0).setDepth(e.y - 1).setTintFill(0xffffff);
      return;
    }
  }

  ring(x, y, r0, r1, dur, col, width, fill) {
    if (this.list.length > 160) return;
    this.list.push({ k: 'ring', x, y, r0, r1, t: 0, dur, col, w: width || 3, fill: fill || 0 });
  }
  bolt(x1, y1, x2, y2, dur, col) {
    if (this.list.length > 160) return;
    const pts = [{ x: x1, y: y1 }];
    const n = Math.max(3, Math.floor(Math.hypot(x2 - x1, y2 - y1) / 28));
    const nx = -(y2 - y1), ny = x2 - x1, len = Math.hypot(nx, ny) || 1;
    for (let i = 1; i < n; i++) {
      const f = i / n, j = (Math.random() - 0.5) * 30;
      pts.push({ x: x1 + (x2 - x1) * f + nx / len * j, y: y1 + (y2 - y1) * f + ny / len * j });
    }
    pts.push({ x: x2, y: y2 });
    this.list.push({ k: 'bolt', pts, t: 0, dur, col });
  }
  // Alertas no chão
  teleCircle(x, y, r, dur, col) { if (this.ground.length < 80) this.ground.push({ k: 'circle', x, y, r, t: 0, dur, col }); }
  teleLine(x, y, ang, len, w, dur, col) { if (this.ground.length < 80) this.ground.push({ k: 'line', x, y, ang, len, w, t: 0, dur, col }); }
  teleCone(x, y, ang, r, half, dur, col) { if (this.ground.length < 80) this.ground.push({ k: 'cone', x, y, ang, r, half, t: 0, dur, col }); }

  // Explosão genérica (anel + partículas)
  boom(x, y, r, col, kind) {
    this.ring(x, y, r * 0.2, r, 0.28, col, 4, 0.35);
    this.ring(x, y, r * 0.1, r * 0.8, 0.2, 0xffffff, 2, 0.5);
    this.burst(kind || 'fire', x, y, Math.min(26, 8 + Math.floor(r / 6)));
    if (!kind || kind === 'fire') {
      this.embers(x, y, Math.min(10, Math.ceil(r / 12)));
      this.em.smoke.explode(3, x, y);
    } else if (kind === 'spark') {
      this.bolt(x - r * 0.18, y - Math.max(100, r * 2), x, y, 0.22, col || 0x8feaff);
      this.ring(x, y, 4, r * 0.65, 0.18, 0xc7f5ff, 2);
    }
  }

  sweep(x, y, range, follow) {
    for (const s of this.sweeps) {
      if (s.active2) continue;
      s.active2 = true; s.t = 0; s.dur = 0.22; s.follow = follow;
      s.setVisible(true).setPosition(x, y).setScale(range / 17 / 4 * 1.0).setAlpha(1).setRotation(0);
      s.baseScale = range / 68;
      s.setScale(s.baseScale);
      return;
    }
  }

  number(x, y, txt, color, big) {
    for (const t of this.nums) {
      if (t.visible) continue;
      t.setText(String(txt)).setColor(color || '#ffffff').setPosition(x + (Math.random() * 14 - 7), y).setVisible(true).setAlpha(1);
      t.setFontSize(big ? '20px' : '15px');
      t.life = 0.7; t.vy = -46;
      return;
    }
  }

  update(dt) {
    this.updateFireSources(dt);
    for (const s of this.dashTrails) {
      if (s.dashLife <= 0) continue;
      s.dashLife -= dt;
      const p = Math.max(0, s.dashLife / s.dashDur);
      s.setAlpha(p * (s.dashSmoke ? 0.35 : 0.48));
      if (!p) s.setVisible(false);
    }
    for (const s of this.dashPuffs) {
      if (s.dashLife <= 0) continue;
      s.dashLife -= dt;
      const p = Math.max(0, s.dashLife / s.dashDur);
      s.x += s.dashVX * dt; s.y += s.dashVY * dt;
      s.setAlpha(p * 0.7).setScale(s.dashSmoke ? 0.65 + (1 - p) * 0.8 : 0.7 + (1 - p) * 0.3);
      if (!p) s.setVisible(false);
    }
    // Anéis, raios
    const g = this.gTop; g.clear();
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i]; e.t += dt;
      if (e.t >= e.dur) { this.list[i] = this.list[this.list.length - 1]; this.list.pop(); continue; }
      const p = e.t / e.dur;
      if (e.k === 'ring') {
        const r = lerp(e.r0, e.r1, 1 - (1 - p) * (1 - p));
        if (e.fill) { g.fillStyle(e.col, e.fill * (1 - p)); g.fillCircle(e.x, e.y, r); }
        g.lineStyle(e.w + 8, e.col, (1 - p) * 0.12); g.strokeCircle(e.x, e.y, r);
        g.lineStyle(e.w, e.col, 1 - p); g.strokeCircle(e.x, e.y, r);
        g.lineStyle(1, 0xfff3d6, (1 - p) * 0.6); g.strokeCircle(e.x, e.y, r - 2);
      } else if (e.k === 'bolt') {
        const a = 1 - p;
        g.lineStyle(7, e.col, a * 0.35); g.beginPath(); g.moveTo(e.pts[0].x, e.pts[0].y);
        for (let j = 1; j < e.pts.length; j++) g.lineTo(e.pts[j].x, e.pts[j].y); g.strokePath();
        g.lineStyle(3, 0xffffff, a); g.beginPath(); g.moveTo(e.pts[0].x, e.pts[0].y);
        for (let j = 1; j < e.pts.length; j++) g.lineTo(e.pts[j].x, e.pts[j].y); g.strokePath();
      }
    }
    // Alertas no chão
    const gg = this.gGround; gg.clear();
    for (let i = this.ground.length - 1; i >= 0; i--) {
      const e = this.ground[i]; e.t += dt;
      if (e.t >= e.dur) { this.ground[i] = this.ground[this.ground.length - 1]; this.ground.pop(); continue; }
      const p = e.t / e.dur;
      if (e.k === 'circle') {
        gg.fillStyle(e.col, 0.12 + 0.22 * p); gg.fillCircle(e.x, e.y, e.r);
        gg.fillStyle(e.col, 0.35); gg.fillCircle(e.x, e.y, e.r * p);
        gg.lineStyle(3, e.col, 0.9); gg.strokeCircle(e.x, e.y, e.r);
      } else if (e.k === 'line') {
        const ex = e.x + Math.cos(e.ang) * e.len, ey = e.y + Math.sin(e.ang) * e.len;
        const nx = -Math.sin(e.ang) * e.w / 2, ny = Math.cos(e.ang) * e.w / 2;
        gg.fillStyle(e.col, 0.12 + 0.25 * p);
        gg.fillPoints([{ x: e.x + nx, y: e.y + ny }, { x: ex + nx, y: ey + ny }, { x: ex - nx, y: ey - ny }, { x: e.x - nx, y: e.y - ny }], true);
        gg.lineStyle(2, e.col, 0.8); gg.strokePoints([{ x: e.x + nx, y: e.y + ny }, { x: ex + nx, y: ey + ny }, { x: ex - nx, y: ey - ny }, { x: e.x - nx, y: e.y - ny }], true);
      } else if (e.k === 'cone') {
        gg.fillStyle(e.col, 0.14 + 0.25 * p);
        gg.beginPath(); gg.moveTo(e.x, e.y); gg.arc(e.x, e.y, e.r, e.ang - e.half, e.ang + e.half, false); gg.closePath(); gg.fillPath();
        gg.fillStyle(e.col, 0.3);
        gg.beginPath(); gg.moveTo(e.x, e.y); gg.arc(e.x, e.y, e.r * p, e.ang - e.half, e.ang + e.half, false); gg.closePath(); gg.fillPath();
        gg.lineStyle(2, e.col, 0.9);
        gg.beginPath(); gg.moveTo(e.x, e.y); gg.arc(e.x, e.y, e.r, e.ang - e.half, e.ang + e.half, false); gg.closePath(); gg.strokePath();
      }
    }
    // Golpes giratórios
    for (const s of this.sweeps) {
      if (!s.active2) continue;
      s.t += dt;
      if (s.t >= s.dur) { s.active2 = false; s.setVisible(false); continue; }
      const p = s.t / s.dur;
      if (s.follow) s.setPosition(s.follow.x, s.follow.y);
      s.setRotation(p * Math.PI * 2).setAlpha(1 - p * 0.8).setScale(s.baseScale * (0.8 + p * 0.25));
    }
    // Corpos
    for (const s of this.corpses) {
      if (!s.live) continue;
      s.t += dt;
      const p = s.t / 0.32;
      if (p >= 1) { s.live = false; s.setVisible(false); continue; }
      if (s.t > 0.07) s.clearTint();
      s.setAlpha(1 - p).setScale(s.size * (1 + p * 0.12), s.size * (1 - p * 0.55)).setRotation(s.dir * p * 0.5);
    }
    // Números de dano
    for (const t of this.nums) {
      if (!t.visible) continue;
      t.life -= dt; t.y += t.vy * dt; t.vy *= Math.exp(-dt * 3.5);
      t.setAlpha(clamp(t.life / 0.3, 0, 1));
      if (t.life <= 0) t.setVisible(false);
    }
  }

  // Limpa tudo (reinício)
  destroy() {
    this.list.length = 0; this.ground.length = 0;
    for (const s of [...this.dashTrails, ...this.dashPuffs]) { s.dashLife = 0; s.setVisible(false); }
  }
}
