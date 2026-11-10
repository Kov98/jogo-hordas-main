// ============================================================
//  PODERES — estrutura extensível.
//  Para criar um poder novo: adicione a definição em data.js (POWERS)
//  e uma implementação em POWER_IMPL abaixo com init/update/destroy.
//  Estatísticas efetivas passam por inst.dmg(), inst.cd(), inst.range()
//  e inst.area(), que aplicam os modificadores do jogador.
// ============================================================
class PowerInstance {
  constructor(scene, player, def) {
    this.scene = scene; this.player = player; this.def = def;
    this.level = 1;
    this.timer = 0.4;           // primeiro disparo rápido
    this.pending = [];          // eventos atrasados {t, fn}
    this.recompute();
    this.impl = POWER_IMPL[def.id];
    this.state = {};
    if (this.impl.init) this.impl.init(this);
  }
  get maxLevel() { return this.def.upgrades.length + 1; }
  get maxed() { return this.level >= this.maxLevel; }
  nextText() { return this.def.upgrades[this.level - 1] ? this.def.upgrades[this.level - 1].text : ''; }
  recompute() {
    const s = Object.assign({}, this.def.base);
    for (let i = 0; i < this.level - 1; i++) this.def.upgrades[i].apply(s);
    this.s = s;
  }
  levelUp() {
    if (this.maxed) return;
    this.level++;
    this.recompute();
    if (this.impl.onLevel) this.impl.onLevel(this);
  }
  // Valores efetivos
  dmg() { return this.s.damage * this.player.mods.damage * (this.player.relicMultiplier?.('damage') ?? 1); }
  cd(interval = this.s.cooldown) { return interval / (this.player.mods.rate * (this.player.relicMultiplier?.('rate') ?? 1)); }
  range() { return (this.s.range || 0) * this.player.mods.range; }
  area(v) { return v * this.player.mods.area; }

  update(dt) {
    if (this.destroyed) return;
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const e = this.pending[i]; e.t -= dt;
      if (e.t <= 0) { this.pending.splice(i, 1); e.fn(); }
    }
    this.impl.update(this, dt);
  }
  after(t, fn) { if (!this.destroyed) this.pending.push({ t, fn }); }
  cast() { this.player.pulse = 0.16; }   // pequena "pulsada" no sprite ao atacar
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.impl.destroy) this.impl.destroy(this);
    this.pending.length = 0;
  }
}

// Utilitários de mira
function nearestEnemies(scene, x, y, r, n) {
  const arr = scene.queryEnemies(x, y, r, scene.tmpA);
  arr.sort((a, b) => ((a.x - x) ** 2 + (a.y - y) ** 2) - ((b.x - x) ** 2 + (b.y - y) ** 2));
  return arr.slice(0, n);
}

// ---------- Projéteis do jogador (pool) ----------
class PlayerShots {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    for (let i = 0; i < CONFIG.maxPlayerShots; i++) {
      const s = scene.add.image(0, 0, 'p_arrow').setVisible(false).setActive(false);
      s.live = false; s.hit = [];
      this.items.push(s);
    }
    this.tmp = [];
  }
  fire(o) {
    // o: {tex, x, y, ang, speed, range, dmg, pierce, radius, explode, depth, powerId, scale}
    for (const s of this.items) {
      if (s.live) continue;
      s.live = true; s.hit.length = 0;
      s.setTexture(o.tex).setPosition(o.x, o.y).setRotation(o.ang).setVisible(true).setActive(true).setScale(o.scale || 1);
      s.setBlendMode(o.add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
      s.vx = Math.cos(o.ang) * o.speed; s.vy = Math.sin(o.ang) * o.speed;
      s.life = o.range / o.speed; s.dmg = o.dmg; s.pierce = o.pierce; s.rad = o.radius;
      s.explode = o.explode || 0; s.kind = o.kind; s.powerId = o.powerId; s.knock = o.knock || 60;
      s.trail = o.trail || null; s.trailTimer = 0; s.boltTimer = 0;
      s.owner = o.owner || null;
      s.age = 0;
      s.setDepth(9100);
      return s;
    }
    return null;
  }
  kill(s) { s.live = false; s.owner = null; s.setVisible(false).setActive(false); }
  update(dt) {
    const sc = this.scene;
    for (const s of this.items) {
      if (!s.live) continue;
      if (s.owner && s.owner.destroyed) { this.kill(s); continue; }
      const oldX = s.x, oldY = s.y;
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      s.age += dt;
      if (s.trail) { s.trailTimer -= dt; if (s.trailTimer <= 0) { sc.fx.burst(s.trail, s.x, s.y, 1); s.trailTimer = 0.035; } }
      if (s.kind === 'plasma') {
        s.setFrame(Math.floor(s.age * 18) % 4);
        s.boltTimer -= dt;
        if (s.boltTimer <= 0) {
          const speed = Math.hypot(s.vx, s.vy) || 1;
          sc.fx.bolt(s.x - s.vx / speed * 32, s.y - s.vy / speed * 32, s.x, s.y, 0.1, 0x72f0ff);
          s.boltTimer = 0.12;
        }
      }
      let done = s.life <= 0;
      if (!done && sc.world.outside(s.x, s.y)) done = true;
      if (!done) {
        if (s.kind === 'plasma') {
          // Sweep the segment: fast plasma still hits at the game's largest dt.
          const travel = Math.hypot(s.x - oldX, s.y - oldY);
          sc.grid.query((oldX + s.x) / 2, (oldY + s.y) / 2, s.rad + travel / 2, this.tmp);
          this.tmp.sort((a, b) => Math.hypot(a.x - oldX, a.y - oldY) - Math.hypot(b.x - oldX, b.y - oldY));
        } else sc.grid.query(s.x, s.y, s.rad, this.tmp);
        for (let i = 0; i < this.tmp.length; i++) {
          const e = this.tmp[i];
          if (!e.alive) continue;
          if (s.kind === 'plasma') {
            const dx = s.x - oldX, dy = s.y - oldY, len2 = dx * dx + dy * dy;
            const along = len2 ? Math.max(0, Math.min(1, ((e.x - oldX) * dx + (e.y - oldY) * dy) / len2)) : 0;
            if (Math.hypot(e.x - oldX - dx * along, e.y - oldY - dy * along) > s.rad + e.radius) continue;
          }
          if (s.hit.indexOf(e.uid) >= 0) continue;
          s.hit.push(e.uid);
          if (s.explode) { done = true; break; }
          sc.damageEnemy(e, s.dmg, { x: s.x, y: s.y, knock: s.knock, kind: s.kind === 'plasma' ? 'plasma' : 'proj' });
          sc.fx.burst('spark', s.x, s.y, 3);
          if (s.kind === 'plasma') sc.fx.ring(e.x, e.y, 3, s.rad * 2.4, 0.18, 0x68efff, 2, 0);
          s.pierce--;
          if (s.pierce <= 0) { done = true; break; }
        }
      }
      if (done) {
        if (s.explode) sc.explodeAt(s.x, s.y, s.explode, s.dmg, 'fire', s.knock);
        this.kill(s);
      }
    }
  }
}

// ---------- Implementações ----------
const POWER_IMPL = {

  // Golpe Giratório: varre 360° ao redor do jogador.
  slash: {
    update(p, dt) {
      p.timer -= dt;
      if (p.timer > 0) return;
      p.timer = p.cd(); p.cast();
      for (let h = 0; h < p.s.hits; h++) p.after(h * 0.22, () => POWER_IMPL.slash.hit(p));
    },
    hit(p) {
      const pl = p.player, sc = p.scene;
      const r = p.range() * Math.max(1, pl.mods.area * 0.8 + 0.2);
      sc.fx.sweep(pl.x, pl.y, r, pl);
      sc.fx.ring(pl.x, pl.y, r * 0.5, r, 0.2, 0xcfe0ff, 3, 0.1);
      const list = sc.queryEnemies(pl.x, pl.y, r, sc.tmpB);
      for (let i = 0; i < list.length; i++) sc.damageEnemy(list[i], p.dmg(), { x: pl.x, y: pl.y, knock: p.s.knock, kind: 'slash' });
      if (list.length) sc.cameras.main.shake(60, 0.0025);
    },
  },

  // Flechas: tiro no inimigo mais próximo.
  arrows: {
    update(p, dt) {
      p.timer -= dt;
      if (p.timer > 0) return;
      const pl = p.player, sc = p.scene, rng = p.range();
      const t = nearestEnemies(sc, pl.x, pl.y, rng, 1)[0];
      if (!t) { p.timer = 0.1; return; }
      p.timer = p.cd(); p.cast();
      const base = Math.atan2(t.y - pl.y, t.x - pl.x);
      const n = pl.projectileCount?.(p.s.count) ?? p.s.count;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * p.s.spread;
        sc.pShots.fire({ tex: 'p_arrow', x: pl.x, y: pl.y - 6, ang: base + off, speed: p.s.speed, range: rng, dmg: p.dmg(), pierce: p.s.pierce, radius: 8, kind: 'arrow', powerId: 'arrows', knock: 70 });
      }
    },
  },

  // Nova Arcana: escolhe o ponto mais denso, marca e detona.
  arcane: {
    update(p, dt) {
      p.timer -= dt;
      if (p.timer > 0) return;
      const pl = p.player, sc = p.scene, rng = p.range();
      const cands = sc.queryEnemies(pl.x, pl.y, rng, sc.tmpA).slice();
      if (!cands.length) { p.timer = 0.15; return; }
      p.timer = p.cd(); p.cast();
      const radius = p.area(p.s.radius);
      const used = [];
      for (let n = 0; n < p.s.count; n++) {
        // amostra candidatos e escolhe o de maior densidade (que não esteja perto de um alvo já escolhido)
        let best = null, bestScore = -1;
        const tries = Math.min(cands.length, 14);
        for (let i = 0; i < tries; i++) {
          const c = cands[(Math.random() * cands.length) | 0];
          if (used.some((u) => Math.hypot(u.x - c.x, u.y - c.y) < radius * 0.8)) continue;
          const cnt = sc.queryEnemies(c.x, c.y, radius, sc.tmpB).length;
          if (cnt > bestScore) { bestScore = cnt; best = c; }
        }
        if (!best) continue;
        const tx = best.x, ty = best.y; used.push({ x: tx, y: ty });
        const delay = 0.4 + n * 0.12;
        sc.fx.teleCircle(tx, ty, radius, delay, 0xb070ff);
        p.after(delay, () => {
          sc.explodeAt(tx, ty, radius, p.dmg(), 'dark', 120, 0xb070ff);
          sc.fx.ring(tx, ty, radius * 0.3, radius * 1.05, 0.35, 0xe0c0ff, 3, 0);
        });
      }
    },
  },

  // Lâminas Giratórias: orbitam o jogador.
  blades: {
    init(p) { p.state.sprites = []; p.state.ang = 0; POWER_IMPL.blades.sync(p); },
    onLevel(p) { POWER_IMPL.blades.sync(p); },
    sync(p) {
      const sc = p.scene, a = p.state.sprites;
      while (a.length < p.s.count) a.push(sc.add.image(0, 0, 'p_blade').setDepth(9050));
    },
    update(p, dt) {
      const pl = p.player, sc = p.scene, st = p.state;
      st.ang += p.s.speed * dt;
      const n = p.s.count, R = p.s.radius * Math.max(1, pl.mods.range * 0.5 + pl.mods.area * 0.5);
      for (let i = 0; i < n; i++) {
        const a = st.ang + i * Math.PI * 2 / n;
        const x = pl.x + Math.cos(a) * R, y = pl.y + Math.sin(a) * R;
        const s = st.sprites[i];
        s.setPosition(x, y).setRotation(a + Math.PI / 2 + st.ang * 3).setDepth(y + 30);
        const list = sc.grid.query(x, y, 16 * pl.mods.area, sc.tmpC);
        for (let j = 0; j < list.length; j++) {
          const e = list[j];
          if (sc.t - (e.hitT.blades || -9) < p.cd(p.s.hitCd)) continue;
          e.hitT.blades = sc.t;
          sc.damageEnemy(e, p.dmg(), { x: pl.x, y: pl.y, knock: 70, kind: 'blade' });
          sc.fx.burst('spark', x, y, 2);
        }
      }
    },
    destroy(p) { for (const s of p.state.sprites) s.destroy(); p.state.sprites.length = 0; },
  },

  // Relâmpago: atinge alvos e salta entre próximos.
  lightning: {
    update(p, dt) {
      p.timer -= dt;
      if (p.timer > 0) return;
      const pl = p.player, sc = p.scene, rng = p.range();
      const cands = sc.queryEnemies(pl.x, pl.y, rng, sc.tmpA).slice();
      if (!cands.length) { p.timer = 0.12; return; }
      p.timer = p.cd(); p.cast();
      const hitSet = [];
      for (let k = 0; k < p.s.targets; k++) {
        const pool = cands.filter((c) => hitSet.indexOf(c.uid) < 0 && c.alive);
        if (!pool.length) break;
        let cur = pool[(Math.random() * pool.length) | 0];
        let fx = pl.x, fy = pl.y - 20;
        for (let j = 0; j <= p.s.chains && cur; j++) {
          hitSet.push(cur.uid);
          sc.fx.bolt(fx, fy, cur.x, cur.y - 10, 0.16, 0xaee0ff);
          sc.fx.burst('spark', cur.x, cur.y, 4);
          sc.damageEnemy(cur, p.dmg(), { x: fx, y: fy, knock: 30, kind: 'lightning' });
          fx = cur.x; fy = cur.y - 10;
          // próximo alvo: mais próximo ainda não atingido
          const near = sc.queryEnemies(cur.x, cur.y, p.area(p.s.chainRange), sc.tmpB);
          let nx = null, nd = 1e9;
          for (let i = 0; i < near.length; i++) {
            const e = near[i];
            if (hitSet.indexOf(e.uid) >= 0 || !e.alive) continue;
            const d = (e.x - cur.x) ** 2 + (e.y - cur.y) ** 2;
            if (d < nd) { nd = d; nx = e; }
          }
          cur = nx;
        }
      }
    },
  },

  // Bola de Fogo: projétil explosivo.
  fireball: {
    update(p, dt) {
      p.timer -= dt;
      if (p.timer > 0) return;
      const pl = p.player, sc = p.scene, rng = p.range();
      const count = pl.projectileCount?.(p.s.count) ?? p.s.count;
      const ts = nearestEnemies(sc, pl.x, pl.y, rng, count);
      if (!ts.length) { p.timer = 0.12; return; }
      p.timer = p.cd(); p.cast();
      for (let i = 0; i < count; i++) {
        const t = ts[i % ts.length];
        const ang = Math.atan2(t.y - pl.y, t.x - pl.x) + (ts.length < count ? (i - (count - 1) / 2) * 0.18 : 0);
        const dist = Math.min(rng, Math.hypot(t.x - pl.x, t.y - pl.y) + 60);
        sc.pShots.fire({ tex: 'p_fire', x: pl.x, y: pl.y - 6, ang, speed: p.s.speed, range: dist, dmg: p.dmg(), pierce: 1, radius: 10, explode: p.area(p.s.radius), kind: 'fire', powerId: 'fireball', add: true, trail: 'fire', knock: 140 });
      }
    },
  },

  // Orbes Mágicos: orbitam no sentido contrário, com empurrão.
  orbs: {
    init(p) { p.state.sprites = []; p.state.ang = 0; POWER_IMPL.orbs.sync(p); },
    onLevel(p) { POWER_IMPL.orbs.sync(p); },
    sync(p) {
      const sc = p.scene, a = p.state.sprites;
      while (a.length < p.s.count) a.push(sc.add.image(0, 0, 'p_orb').setDepth(9050).setBlendMode(Phaser.BlendModes.ADD));
    },
    update(p, dt) {
      const pl = p.player, sc = p.scene, st = p.state;
      st.ang += p.s.speed * dt;
      const n = p.s.count, R = p.s.radius * Math.max(1, pl.mods.range * 0.5 + pl.mods.area * 0.5);
      for (let i = 0; i < n; i++) {
        const a = st.ang + i * Math.PI * 2 / n;
        const x = pl.x + Math.cos(a) * R, y = pl.y + Math.sin(a) * R;
        const s = st.sprites[i];
        const pulse = 1 + Math.sin(sc.t * 6 + i) * 0.12;
        s.setPosition(x, y).setScale(pulse * pl.mods.area).setDepth(y + 30);
        const list = sc.grid.query(x, y, 15 * pl.mods.area, sc.tmpC);
        for (let j = 0; j < list.length; j++) {
          const e = list[j];
          if (sc.t - (e.hitT.orbs || -9) < p.cd(p.s.hitCd)) continue;
          e.hitT.orbs = sc.t;
          sc.damageEnemy(e, p.dmg(), { x: pl.x, y: pl.y, knock: p.s.knock, kind: 'orb' });
          sc.fx.burst('spark', x, y, 2);
        }
      }
    },
    destroy(p) { for (const s of p.state.sprites) s.destroy(); p.state.sprites.length = 0; },
  },

  // Projétil Perfurante: escolhe a linha com mais inimigos.
  pierce: {
    update(p, dt) {
      p.timer -= dt;
      if (p.timer > 0) return;
      const pl = p.player, sc = p.scene, rng = p.range();
      const cands = sc.queryEnemies(pl.x, pl.y, rng, sc.tmpA);
      if (!cands.length) { p.timer = 0.12; return; }
      p.timer = p.cd(); p.cast();
      // testa 16 direções e escolhe a que atravessa mais inimigos
      let bestAng = 0, bestN = -1;
      for (let d = 0; d < 16; d++) {
        const a = d * Math.PI / 8 + Math.random() * 0.1;
        const dx = Math.cos(a), dy = Math.sin(a);
        let n = 0;
        for (let i = 0; i < cands.length; i++) {
          const e = cands[i];
          const ex = e.x - pl.x, ey = e.y - pl.y;
          const along = ex * dx + ey * dy;
          if (along < 0) continue;
          const perp = Math.abs(ex * dy - ey * dx);
          if (perp < 26 + e.radius) n++;
        }
        if (n > bestN) { bestN = n; bestAng = a; }
      }
      const n = pl.projectileCount?.(p.s.count) ?? p.s.count;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 0.16;
        sc.pShots.fire({ tex: 'p_pierce', x: pl.x, y: pl.y - 6, ang: bestAng + off, speed: p.s.speed, range: rng, dmg: p.dmg(), pierce: p.s.pierce, radius: 12, kind: 'pierce', powerId: 'pierce', add: true, trail: 'spark', knock: 90 });
      }
    },
  },

  // Explosão de Energia: pulso ao redor do jogador.
  burst: {
    update(p, dt) {
      p.timer -= dt;
      if (p.timer > 0) return;
      const pl = p.player, sc = p.scene;
      const r = p.area(p.s.radius);
      // só dispara se houver inimigos por perto (economiza efeitos)
      if (sc.queryEnemies(pl.x, pl.y, r * 1.15, sc.tmpA).length === 0) { p.timer = 0.15; return; }
      p.timer = p.cd(); p.cast();
      for (let k = 0; k < p.s.pulses; k++) {
        p.after(k * 0.3, () => {
          const rr = p.area(p.s.radius);
          sc.fx.ring(pl.x, pl.y, rr * 0.15, rr, 0.35, 0x9ad8ff, 5, 0.22);
          sc.fx.ring(pl.x, pl.y, rr * 0.05, rr * 0.7, 0.25, 0xffffff, 2, 0);
          sc.fx.burst('spark', pl.x, pl.y, 14);
          const list = sc.queryEnemies(pl.x, pl.y, rr, sc.tmpB);
          for (let i = 0; i < list.length; i++) sc.damageEnemy(list[i], p.dmg(), { x: pl.x, y: pl.y, knock: p.s.knock, kind: 'burst' });
          sc.cameras.main.shake(90, 0.003);
        });
      }
    },
  },
};

// Persistent effects belong to their weapon instance and vanish on transformation.
function progressionZone(p, x, y, radius, duration, kind) {
  const sprite = p.scene.add.image(x, y, 'fx_' + kind).setDepth(y + 2).setAlpha(0.45).setScale(radius / 24);
  p.state.zones.push({ x, y, radius, life: duration, tick: 0, sprite, kind });
}
function updateProgressionZones(p, dt) {
  const sc = p.scene;
  for (let i = p.state.zones.length - 1; i >= 0; i--) {
    const z = p.state.zones[i]; z.life -= dt; z.tick -= dt;
    if (z.life <= 0) {
      if (z.kind === 'singularity') sc.explodeAt(z.x, z.y, z.radius, p.dmg(), 'dark', 220);
      z.sprite.destroy(); p.state.zones.splice(i, 1); continue;
    }
    z.sprite.setRotation(sc.t * (z.kind === 'singularity' ? 2 : 0.2));
    const enemies = sc.queryEnemies(z.x, z.y, z.radius, sc.tmpC).slice();
    for (const e of enemies) {
      if (z.kind === 'singularity' && !e.isBoss && !e.isMiniBoss && !e.isExplorationBoss) {
        const dx = z.x - e.x, dy = z.y - e.y, d = Math.hypot(dx, dy) || 1;
        const pull = Math.min(d, 105 * dt * (e.def && e.def.kb !== undefined ? e.def.kb : 1));
        e.x += dx / d * pull; e.y += dy / d * pull;
      }
      if (z.tick > 0) continue;
      sc.damageEnemy(e, p.dmg() * (z.kind === 'singularity' ? 0.18 : 1), { x: z.x, y: z.y, knock: 0, kind: z.kind });
      if (z.kind === 'miasma' && !e.alive && p.state.zones.length < 12) progressionZone(p, e.x, e.y, z.radius * 0.65, 2, 'miasma');
    }
    if (z.tick <= 0) z.tick = 0.5;
  }
}
function progressionCleanup(p) {
  for (const z of p.state.zones || []) z.sprite.destroy();
  for (const a of p.state.axes || []) a.sprite.destroy();
  p.state.zones = []; p.state.axes = [];
}
for (const id of ['poison', 'inferno', 'miasma', 'singularity']) POWER_IMPL[id] = {
  init(p) { p.state.zones = []; }, destroy: progressionCleanup,
  update(p, dt) {
    updateProgressionZones(p, dt); p.timer -= dt;
    if (p.timer > 0) return;
    const t = nearestEnemies(p.scene, p.player.x, p.player.y, p.range(), 1)[0];
    if (!t) { p.timer = 0.15; return; }
    p.timer = p.cd(); p.cast();
    if (id === 'inferno') p.scene.explodeAt(t.x, t.y, p.area(p.s.radius), p.dmg(), 'fire', 90);
    if (p.state.zones.length < 12) progressionZone(p, t.x, t.y, p.area(p.s.radius), p.s.duration, id);
  },
};
for (const id of ['axes', 'reaper_axes']) POWER_IMPL[id] = {
  init(p) { p.state.axes = []; p.state.angle = 0; }, destroy: progressionCleanup,
  update(p, dt) {
    const sc = p.scene, pl = p.player; p.timer -= dt;
    if (p.timer <= 0 && p.state.axes.length < 12) {
      p.timer = p.cd(); p.cast();
      const target = nearestEnemies(sc, pl.x, pl.y, p.range(), 1)[0];
      const aim = target ? Math.atan2(target.y - pl.y, target.x - pl.x) : Math.atan2(pl.aim.y, pl.aim.x);
      for (let i = 0; i < p.s.count; i++) p.state.axes.push({ age: 0, angle: aim + (i - (p.s.count - 1) / 2) * 0.65, hits: new Map(), sprite: sc.add.image(pl.x, pl.y, 'p_' + id).setDepth(9100) });
    }
    for (let i = p.state.axes.length - 1; i >= 0; i--) {
      const a = p.state.axes[i]; a.age += dt;
      if (a.age >= 1.5) { a.sprite.destroy(); p.state.axes.splice(i, 1); continue; }
      const distance = Math.sin(a.age / 1.5 * Math.PI) * p.range();
      const angle = a.angle + a.age * (id === 'reaper_axes' ? 2.4 : 0.65);
      const x = pl.x + Math.cos(angle) * distance, y = pl.y + Math.sin(angle) * distance;
      a.sprite.setPosition(x, y).setRotation(a.age * 16);
      const pass = a.age < 0.75 ? 1 : 2;
      for (const e of sc.queryEnemies(x, y, p.area(p.s.radius), sc.tmpB).slice()) {
        if (a.hits.get(e.uid) === pass) continue;
        a.hits.set(e.uid, pass);
        const damage = id === 'reaper_axes' && e.hp < p.dmg() * 1.5 ? p.dmg() * 2 : p.dmg();
        sc.damageEnemy(e, damage, { x: pl.x, y: pl.y, knock: 100, kind: id });
      }
    }
  },
};
for (const id of ['frost', 'blizzard']) POWER_IMPL[id] = {
  update(p, dt) {
    p.timer -= dt; if (p.timer > 0) return; p.timer = p.cd(); p.cast();
    const sc = p.scene, pl = p.player, r = p.area(p.s.radius);
    const target = id === 'blizzard' ? pl : nearestEnemies(sc, pl.x, pl.y, p.range(), 1)[0];
    if (!target) return;
    sc.fx.ring(target.x, target.y, 10, r, 0.45, 0x91eaff, 3, 0.15);
    for (const e of sc.queryEnemies(target.x, target.y, r, sc.tmpB).slice()) {
      sc.damageEnemy(e, p.dmg(), { x: target.x, y: target.y, knock: id === 'blizzard' ? 100 : 190, kind: 'frost' });
      // Enemy manager consumes timed slow; do not modify permanent base speed.
      e.slowUntil = Math.max(e.slowUntil || 0, sc.t + (id === 'blizzard' ? 1 : 2));
      e.slowFactor = 0.45;
    }
  },
};
POWER_IMPL.soulblade = { update(p, dt) {
  p.timer -= dt; if (p.timer > 0) return; p.timer = p.cd(); p.cast();
  const sc = p.scene, pl = p.player, r = p.range() * pl.mods.area;
  sc.fx.sweep(pl.x, pl.y, r, pl);
  const list = sc.queryEnemies(pl.x, pl.y, r, sc.tmpB).slice();
  for (const e of list) sc.damageEnemy(e, p.dmg(), { x: pl.x, y: pl.y, knock: 300, kind: 'soulblade' });
  if (list.length) pl.heal(Math.min(4, list.length));
} };
POWER_IMPL.tempest = { update(p, dt) {
  p.timer -= dt; if (p.timer > 0) return; p.timer = p.cd(); p.cast();
  const sc = p.scene, pl = p.player;
  const targets = nearestEnemies(sc, pl.x, pl.y, p.range(), 4);
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i], x = t.x, y = t.y;
    p.after(i * 0.09, () => { sc.fx.bolt(x, y - 230, x, y, 0.2, 0x9edfff); sc.explodeAt(x, y, p.area(p.s.radius), p.dmg(), 'dark', 35, 0x9edfff); });
  }
} };
POWER_IMPL.celestial_ring = {
  init(p) { p.state.angle = 0; p.state.sprites = Array.from({ length: p.s.count }, () => p.scene.add.image(0, 0, 'p_celestial_ring').setDepth(9100)); },
  destroy(p) { for (const s of p.state.sprites) s.destroy(); },
  update(p, dt) {
    p.state.angle += dt * p.s.speed;
    const sc = p.scene, pl = p.player;
    for (let i = 0; i < p.s.count; i++) {
      const crown = i % 2, position = Math.floor(i / 2);
      const angle = position * Math.PI * 2 / (p.s.count / 2)
        + p.state.angle * (crown ? -1 : 1) + crown * Math.PI / 4;
      const r = p.area(p.s.radius + Math.sin(sc.t * 2 + crown * Math.PI) * 65);
      const x = pl.x + Math.cos(angle) * r, y = pl.y + Math.sin(angle) * r;
      p.state.sprites[i].setPosition(x, y).setRotation(angle);
      for (const e of sc.queryEnemies(x, y, 28 * pl.mods.area, sc.tmpC).slice()) {
        if (sc.t - (e.hitT.celestial_ring ?? -9) < p.cd(p.s.hitCd)) continue;
        e.hitT.celestial_ring = sc.t; sc.damageEnemy(e, p.dmg(), { x: pl.x, y: pl.y, knock: 180, kind: 'celestial_ring' });
      }
    }
  },
};

// New common weapons own a fixed set of reusable visuals. All transient sparks,
// rings and bolts use FX's existing shared pools; plasma uses PlayerShots only.
POWER_IMPL.cyclone = {
  init(p) {
    // Four layers per slot, never more than six moving vortices (24 images).
    p.state.vortices = Array.from({ length: 6 }, () => {
      const sprite = p.scene.add.image(0, 0, 'fx_cyclone', 0).setOrigin(.5, .82).setDepth(9080).setVisible(false);
      const ground = p.scene.add.image(0, 0, 'fx_cyclone_ground', 0).setDepth(7).setVisible(false);
      const wind = p.scene.add.image(0, 0, 'fx_cyclone_wind', 0).setOrigin(.5, .82).setDepth(9081)
        .setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      const debris = p.scene.add.image(0, 0, 'fx_cyclone_debris', 0).setOrigin(.5, .82).setDepth(9082).setVisible(false);
      return { life: 0, sprite, ground, wind, debris, visuals: [sprite, ground, wind, debris] };
    });
  },
  update(p, dt) {
    const sc = p.scene, pl = p.player;
    p.timer -= dt;
    if (p.timer <= 0) {
      const target = nearestEnemies(sc, pl.x, pl.y, p.range(), 1)[0];
      p.timer = target ? p.cd() : 0.12;
      if (target) {
        const aim = Math.atan2(target.y - pl.y, target.x - pl.x);
        let cast = false;
        for (let n = 0; n < p.s.count; n++) {
          const v = p.state.vortices.find(v => v.life <= 0);
          if (!v) break;
          const a = aim + (n - (p.s.count - 1) / 2) * 0.3;
          Object.assign(v, { x: pl.x, y: pl.y, vx: Math.cos(a) * p.s.speed, vy: Math.sin(a) * p.s.speed,
            life: Math.min(p.s.duration, p.range() / p.s.speed), age: 0, tick: 0, fx: 0 });
          v.sprite.setVisible(true); cast = true;
        }
        if (cast) p.cast();
      }
    }
    for (const v of p.state.vortices) {
      if (v.life <= 0) continue;
      v.life -= dt;
      if (v.life <= 0) { for (const s of v.visuals) s.setVisible(false); continue; }
      v.age += dt; v.tick -= dt; v.fx -= dt;
      v.x += v.vx * dt; v.y += v.vy * dt;
      const radius = p.area(p.s.radius), frame = Math.floor(v.age * 20) % 8;
      const alpha = Math.min(.92, v.life * 4), sway = Math.sin(v.age * 11) * radius * .035;
      v.sprite.setPosition(v.x + sway, v.y).setFrame(frame)
        .setDisplaySize(radius * 2.2, radius * 3).setAlpha(alpha).setVisible(true);
      // The circular footprint stays exactly on the real damage radius. The
      // elevated funnel can sway without suggesting that its hitbox moved.
      v.ground.setPosition(v.x, v.y).setFrame(frame).setDisplaySize(radius * 2, radius * 2)
        .setAlpha(alpha * .7).setVisible(true);
      v.wind.setPosition(v.x + sway, v.y).setFrame(frame).setDisplaySize(radius * 2.2, radius * 3)
        .setAlpha(alpha * (.5 + Math.sin(v.age * 17) * .1)).setVisible(true);
      v.debris.setPosition(v.x + sway, v.y).setFrame(frame).setDisplaySize(radius * 2.2, radius * 3)
        .setAlpha(alpha).setVisible(true);
      const enemies = sc.queryEnemies(v.x, v.y, radius, sc.tmpB).slice();
      for (const e of enemies) {
        if (!e.alive) continue;
        if (!e.isBoss && !e.isMiniBoss && !e.isExplorationBoss) {
          const dx = v.x - e.x, dy = v.y - e.y, distance = Math.hypot(dx, dy) || 1;
          const pull = Math.min(distance, p.s.pull * dt * (e.def?.kb ?? 1));
          e.x += dx / distance * pull; e.y += dy / distance * pull;
        }
        if (v.tick <= 0) sc.damageEnemy(e, p.dmg(), { x: v.x, y: v.y, knock: 0, kind: 'cyclone' });
      }
      if (v.tick <= 0) v.tick = p.s.hitCd;
      if (v.fx <= 0) {
        sc.fx.ring(v.x, v.y, radius * 0.25, radius, 0.24, 0xa9dfd2, 2, 0);
        sc.fx.burst('spark', v.x - v.vx * 0.1, v.y - v.vy * 0.1, 1);
        v.fx = 0.24;
      }
    }
  },
  destroy(p) { for (const v of p.state.vortices) { v.life = 0; for (const s of v.visuals) s.destroy(); } },
};

POWER_IMPL.radiant_beam = {
  init(p) {
    const st = p.state, image = (key, depth) => p.scene.add.image(0, 0, key, 0).setDepth(depth)
      .setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    st.life = 0;
    st.sprite = image('fx_radiant_beam', 9090).setOrigin(0, .5);
    st.halo = image('fx_radiant_halo', 9089).setOrigin(0, .5);
    st.seal = image('fx_radiant_seal', 7);
    st.emitter = image('fx_radiant_source', 9092);
    st.tip = image('fx_radiant_source', 9091);
    st.motes = Array.from({ length: 6 }, () => image('fx_radiant_mote', 9093));
    st.impacts = Array.from({ length: 4 }, () => ({ life: 0, sprite: image('fx_radiant_impact', 9094) }));
    st.visuals = [st.sprite, st.halo, st.seal, st.emitter, st.tip, ...st.motes, ...st.impacts.map(i => i.sprite)];
    st.targets = [];
    st.source = { x: 0, y: 0, knock: 12, kind: 'radiant_beam' };
  },
  update(p, dt) {
    const sc = p.scene, pl = p.player, st = p.state;
    let elapsed = dt;
    p.timer -= dt;
    if (p.timer <= 0 && st.life <= 0) {
      const range = p.range(), candidates = sc.queryEnemies(pl.x, pl.y, range, sc.tmpA);
      let target = null, nearest = range * range;
      for (let i = 0; i < candidates.length; i++) {
        const e = candidates[i], distance = (e.x - pl.x) ** 2 + (e.y - pl.y) ** 2;
        if (e.alive && distance <= nearest) { target = e; nearest = distance; }
      }
      if (!target) { p.timer = 0.12; return; }
      // Snapshot the marked point, never the pooled enemy or the player's aim.
      st.x = target.x; st.y = target.y; st.radius = p.area(p.s.radius);
      st.source.x = st.x; st.source.y = st.y;
      st.warning = p.s.warning; st.life = st.warning + p.s.duration;
      st.age = 0; st.tick = 0; st.fx = 0;
      p.timer = p.cd(); p.cast();
      // Even a long casting frame must show the warning before any damage.
      elapsed = 0;
    }
    if (st.life <= 0) return;
    st.life -= elapsed; st.age += elapsed;
    if (st.life <= 0) {
      for (const s of st.visuals) s.setVisible(false);
      for (const impact of st.impacts) impact.life = 0;
      return;
    }
    const x = st.x, y = st.y, radius = st.radius, frame = Math.floor(st.age * 24) % 8;
    st.seal.setPosition(x, y).setFrame(frame).setDisplaySize(radius * 2, radius * 2)
      .setAlpha(st.age < st.warning ? .6 + Math.sin(st.age * 25) * .16 : .88).setVisible(true);
    if (st.age < st.warning) return;
    // Keep the source beyond the viewport even when the camera moves upward.
    const view = sc.cameras.main.worldView;
    st.topY = Math.min(y - 480, (view?.y ?? y - 480) - 80);
    const length = y - st.topY, width = radius * 1.45;
    const alpha = Math.min(.96, st.life * 8), activeAge = st.age - st.warning;
    st.tick -= elapsed; st.fx -= elapsed;
    st.sprite.setPosition(x, st.topY).setRotation(Math.PI / 2).setFrame(frame)
      .setDisplaySize(length, width).setAlpha(alpha).setVisible(true);
    st.halo.setPosition(x, st.topY).setRotation(Math.PI / 2).setFrame(frame)
      .setDisplaySize(length, width * 1.8).setAlpha(alpha * (.28 + Math.sin(st.age * 28) * .04)).setVisible(true);
    const sourceSize = width * (1.15 + Math.sin(st.age * 26) * .08);
    st.emitter.setPosition(x, st.topY).setFrame(frame).setRotation(-st.age * 1.5)
      .setDisplaySize(sourceSize, sourceSize).setAlpha(alpha).setVisible(true);
    st.tip.setPosition(x, y).setFrame((frame + 3) % 8).setRotation(activeAge * .6)
      .setDisplaySize(radius * 1.7, radius * 1.7).setAlpha(alpha * .8).setVisible(true);
    for (let n = 0; n < st.motes.length; n++) {
      const travel = (n / st.motes.length + activeAge * 1.1) % 1;
      const side = Math.sin(st.age * 14 + n * 2.4) * width * .34;
      const size = Math.min(16, Math.max(5, width * .18)) * (n % 2 ? .75 : 1);
      st.motes[n].setPosition(x + side, st.topY + length * travel)
        .setFrame((frame + n) % 8).setRotation(Math.PI / 2).setDisplaySize(size * 1.8, size)
        .setAlpha(alpha * (.45 + Math.sin(travel * Math.PI) * .5)).setVisible(true);
    }
    for (const impact of st.impacts) {
      if (impact.life <= 0) continue;
      impact.life -= dt;
      if (impact.life <= 0) { impact.sprite.setVisible(false); continue; }
      const progress = 1 - impact.life / .18;
      const size = radius * (.7 + progress * .65);
      impact.sprite.setFrame(Math.floor(progress * 8) % 8).setDisplaySize(size, size)
        .setRotation(progress * .35).setAlpha(alpha * (1 - progress)).setVisible(true);
    }
    if (st.tick <= 0) {
      sc.queryEnemies(x, y, radius, st.targets);
      for (let n = 0; n < st.targets.length; n++) {
        const e = st.targets[n];
        if (!e.alive || Math.hypot(e.x - x, e.y - y) > radius + e.radius) continue;
        sc.damageEnemy(e, p.dmg(), st.source);
        let impact = null;
        for (let i = 0; i < st.impacts.length; i++) if (st.impacts[i].life <= 0) { impact = st.impacts[i]; break; }
        if (impact) {
          impact.life = .18;
          impact.sprite.setPosition(e.x, e.y).setFrame(0).setRotation(0)
            .setDisplaySize(radius * .7, radius * .7).setAlpha(alpha).setVisible(true);
          sc.fx.burst('gold', e.x, e.y, 2);
        }
      }
      st.targets.length = 0;
      st.tick = p.s.hitCd;
    }
    if (st.fx <= 0) {
      sc.fx.burst('gold', x, y, 1);
      st.fx = .16;
    }
  },
  destroy(p) {
    p.state.life = 0;
    p.state.targets.length = 0;
    for (const impact of p.state.impacts) impact.life = 0;
    for (const s of p.state.visuals) s.destroy();
  },
};

POWER_IMPL.plasma = {
  update(p, dt) {
    p.timer -= dt;
    if (p.timer > 0) return;
    const sc = p.scene, pl = p.player;
    const target = nearestEnemies(sc, pl.x, pl.y, p.range(), 1)[0];
    if (!target) { p.timer = 0.12; return; }
    p.timer = p.cd();
    const angle = Math.atan2(target.y - (pl.y - 6), target.x - pl.x);
    let fired = false;
    const count = pl.projectileCount?.(p.s.count) ?? p.s.count;
    for (let n = 0; n < count; n++) {
      const shot = sc.pShots.fire({ tex: 'p_plasma', x: pl.x, y: pl.y - 6,
        ang: angle + (n - (count - 1) / 2) * p.s.spread, speed: p.s.speed,
        range: p.range(), radius: p.area(p.s.radius), dmg: p.dmg(), pierce: p.s.pierce,
        scale: p.area(p.s.radius) / 10, kind: 'plasma', powerId: 'plasma', owner: p,
        add: true, trail: 'spark', knock: 65 });
      if (!shot) break;
      fired = true;
    }
    if (fired) p.cast();
  },
  destroy(p) { for (const s of p.scene.pShots.items) if (s.live && s.owner === p) p.scene.pShots.kill(s); },
};

POWER_IMPL.meteor = {
  init(p) {
    p.state.meteors = Array.from({ length: 8 }, () => ({ life: 0,
      mark: p.scene.add.image(0, 0, 'fx_meteor_mark', 0).setDepth(6).setAlpha(0.75).setVisible(false),
      rock: p.scene.add.image(0, 0, 'p_meteor').setDepth(9130).setVisible(false),
    }));
  },
  update(p, dt) {
    const sc = p.scene, pl = p.player;
    p.timer -= dt;
    if (p.timer <= 0) {
      const targets = nearestEnemies(sc, pl.x, pl.y, p.range(), p.s.count);
      p.timer = targets.length ? p.cd() : 0.15;
      let cast = false;
      for (let n = 0; targets.length && n < p.s.count; n++) {
        const m = p.state.meteors.find(m => m.life <= 0);
        if (!m) break;
        const target = targets[n % targets.length];
        // Never retain a pooled enemy object across the warning delay.
        const angle = n * 2.39996, offset = n >= targets.length ? p.area(p.s.radius) * 0.55 : 0;
        Object.assign(m, { x: target.x + Math.cos(angle) * offset, y: target.y + Math.sin(angle) * offset,
          life: p.s.warning + n * 0.12, age: 0, trail: 0, radius: p.area(p.s.radius), damage: p.dmg() });
        m.mark.setPosition(m.x, m.y).setDisplaySize(m.radius * 2, m.radius * 2).setVisible(true);
        m.rock.setVisible(false); cast = true;
      }
      if (cast) p.cast();
    }
    for (const m of p.state.meteors) {
      if (m.life <= 0) continue;
      m.life -= dt; m.age += dt; m.trail -= dt;
      if (m.life <= 0) {
        m.mark.setVisible(false); m.rock.setVisible(false);
        for (const e of sc.queryEnemies(m.x, m.y, m.radius, sc.tmpB).slice()) {
          if (e.alive) sc.damageEnemy(e, m.damage, { x: m.x, y: m.y, knock: 175, kind: 'meteor' });
        }
        sc.fx.burst('fire', m.x, m.y, 10);
        sc.fx.embers(m.x, m.y, 8);
        sc.fx.ring(m.x, m.y, m.radius * 0.12, m.radius * 1.1, 0.4, 0xffa14c, 4, 0.08);
        sc.fx.ring(m.x, m.y, 4, m.radius * 0.7, 0.22, 0xffedac, 2, 0);
        sc.cameras.main.shake(85, 0.002);
        continue;
      }
      m.mark.setFrame(Math.floor(m.age * 10) % 4).setAlpha(0.45 + Math.sin(m.age * 17) * 0.14);
      if (m.life < 0.34) {
        const fall = m.life / 0.34;
        m.rock.setVisible(true).setPosition(m.x - fall * 105, m.y - fall * 260 - 18)
          .setScale(1 + (1 - fall) * 0.2);
        if (m.trail <= 0) {
          sc.fx.burst('fire', m.rock.x - 6, m.rock.y - 12, 2);
          sc.fx.embers(m.rock.x, m.rock.y, 1); m.trail = 0.06;
        }
      }
    }
  },
  destroy(p) { for (const m of p.state.meteors) { m.life = 0; m.mark.destroy(); m.rock.destroy(); } },
};

// These evolutions preallocate every persistent visual. Each warning stores a
// position rather than an enemy reference: enemy slots may be reused mid-cast.
function evolutionCircle(p, x, y, radius, damage, kind, knock = 0) {
  for (const e of p.scene.queryEnemies(x, y, radius, p.scene.tmpB).slice()) {
    if (e.alive) p.scene.damageEnemy(e, damage, { x, y, knock, kind });
  }
}
POWER_IMPL.fire_hurricane = {
  init(p) {
    p.state.vortices = Array.from({ length: 6 }, () => ({ life: 0,
      sprite: p.scene.add.image(0, 0, 'fx_fire_hurricane', 0).setOrigin(.5, .8).setDepth(9080).setVisible(false) }));
    p.state.zones = Array.from({ length: 6 }, () => ({ life: 0,
      sprite: p.scene.add.image(0, 0, 'fx_fire_hurricane_embers', 0).setDepth(7).setVisible(false) }));
  },
  update(p, dt) {
    const sc = p.scene, pl = p.player; p.timer -= dt;
    if (p.timer <= 0) {
      const t = nearestEnemies(sc, pl.x, pl.y, p.range(), 1)[0]; p.timer = t ? p.cd() : .12;
      if (t) {
        const aim = Math.atan2(t.y - pl.y, t.x - pl.x);
        for (let n = 0; n < p.s.count; n++) {
          const v = p.state.vortices.find(v => v.life <= 0); if (!v) break;
          const angle = aim + (n - (p.s.count - 1) / 2) * .32;
          Object.assign(v, { x: pl.x, y: pl.y, vx: Math.cos(angle) * p.s.speed, vy: Math.sin(angle) * p.s.speed,
            life: Math.min(p.s.duration, p.range() / p.s.speed), tick: 0, ember: .3, age: 0 });
          v.sprite.setVisible(true); p.cast();
        }
      }
    }
    const radius = p.area(p.s.radius);
    for (const v of p.state.vortices) {
      if (v.life <= 0) continue;
      v.life -= dt; if (v.life <= 0) { v.sprite.setVisible(false); continue; }
      v.age += dt; v.tick -= dt; v.ember -= dt; v.x += v.vx * dt; v.y += v.vy * dt;
      v.sprite.setPosition(v.x, v.y).setFrame(Math.floor(v.age * 18) % 4).setDisplaySize(radius * 2.5, radius * 3).setAlpha(Math.min(.9, v.life * 3));
      for (const e of sc.queryEnemies(v.x, v.y, radius, sc.tmpC).slice()) {
        if (!e.alive) continue;
        if (!e.isBoss && !e.isMiniBoss && !e.isExplorationBoss) {
          const dx = v.x - e.x, dy = v.y - e.y, distance = Math.hypot(dx, dy) || 1;
          const pull = Math.min(distance, p.s.pull * dt * (e.def?.kb ?? 1));
          e.x += dx / distance * pull; e.y += dy / distance * pull;
        }
        if (v.tick <= 0) sc.damageEnemy(e, p.dmg(), { x: v.x, y: v.y, knock: 0, kind: 'fire_hurricane' });
      }
      if (v.tick <= 0) v.tick = p.s.hitCd;
      if (v.ember <= 0) {
        const z = p.state.zones.find(z => z.life <= 0);
        if (z) { Object.assign(z, { x: v.x, y: v.y, life: p.s.emberDuration, tick: 0 }); z.sprite.setPosition(z.x, z.y).setDisplaySize(radius * 2, radius * 1.3).setVisible(true); }
        v.ember = .7;
      }
    }
    for (const z of p.state.zones) {
      if (z.life <= 0) continue;
      z.life -= dt; z.tick -= dt;
      if (z.life <= 0) { z.sprite.setVisible(false); continue; }
      z.sprite.setAlpha(Math.min(.6, z.life)).setFrame(Math.floor(sc.t * 10) % 4);
      if (z.tick <= 0) { evolutionCircle(p, z.x, z.y, radius, p.dmg() * .5, 'fire_hurricane_embers'); z.tick = .4; }
    }
  },
  destroy(p) { for (const v of [...p.state.vortices, ...p.state.zones]) { v.life = 0; v.sprite.destroy(); } },
};
POWER_IMPL.celestial_judgment = {
  init(p) {
    p.state.columns = Array.from({ length: 3 }, () => ({ life: 0,
      mark: p.scene.add.image(0, 0, 'fx_meteor_mark', 0).setDepth(7).setVisible(false),
      column: p.scene.add.image(0, 0, 'fx_celestial_judgment', 0).setOrigin(.5, 1).setDepth(9120).setBlendMode(Phaser.BlendModes.ADD).setVisible(false) }));
  },
  update(p, dt) {
    const sc = p.scene, pl = p.player; p.timer -= dt;
    if (p.timer <= 0) {
      const targets = nearestEnemies(sc, pl.x, pl.y, p.range(), p.s.count); p.timer = targets.length ? p.cd() : .12;
      for (let n = 0; n < targets.length; n++) {
        const c = p.state.columns.find(c => c.life <= 0); if (!c) break;
        Object.assign(c, { x: targets[n].x, y: targets[n].y, age: 0, warning: p.s.warning + n * .1,
          life: p.s.warning + n * .1 + p.s.duration, radius: p.area(p.s.radius), impacted: false });
        c.mark.setPosition(c.x, c.y).setDisplaySize(c.radius * 2, c.radius * 2).setVisible(true); c.column.setVisible(false); p.cast();
      }
    }
    for (const c of p.state.columns) {
      if (c.life <= 0) continue;
      c.life -= dt; c.age += dt;
      if (c.age >= c.warning && !c.impacted) {
        c.impacted = true; c.mark.setVisible(false);
        evolutionCircle(p, c.x, c.y, c.radius, p.dmg(), 'celestial_judgment', 160);
        c.column.setPosition(c.x, c.y + 8).setDisplaySize(c.radius * 1.6, c.radius * 4).setVisible(true);
        sc.fx.ring(c.x, c.y, 6, c.radius * 1.2, .35, 0xffe6a1, 4, .1);
      }
      c.mark.setFrame(Math.floor(c.age * 10) % 4).setAlpha(.5 + Math.sin(c.age * 18) * .16);
      if (c.impacted) c.column.setFrame(Math.floor(c.age * 18) % 4).setAlpha(Math.max(0, c.life / p.s.duration));
      if (c.life <= 0) { c.mark.setVisible(false); c.column.setVisible(false); }
    }
  },
  destroy(p) { for (const c of p.state.columns) { c.life = 0; c.mark.destroy(); c.column.destroy(); } },
};
POWER_IMPL.plasma_storm = {
  init(p) {
    p.state.angle = 0;
    p.state.cores = Array.from({ length: 3 }, () => p.scene.add.image(0, 0, 'p_plasma_storm', 0).setDepth(9110).setBlendMode(Phaser.BlendModes.ADD));
  },
  update(p, dt) {
    const sc = p.scene, pl = p.player, st = p.state; st.angle += p.s.speed * dt; p.timer -= dt;
    const pulse = p.timer <= 0, hit = new Set();
    if (pulse) { p.timer = p.cd(); p.cast(); }
    for (let n = 0; n < st.cores.length; n++) {
      const angle = st.angle + n * Math.PI * 2 / 3, radius = p.area(p.s.radius);
      const x = pl.x + Math.cos(angle) * radius, y = pl.y + Math.sin(angle) * radius;
      st.cores[n].setPosition(x, y).setRotation(-angle).setFrame(Math.floor(sc.t * 16) % 4).setDisplaySize(p.area(p.s.coreRadius) * 2.5, p.area(p.s.coreRadius) * 2.5);
      if (!pulse) continue;
      for (const e of sc.queryEnemies(x, y, p.area(p.s.coreRadius), sc.tmpC).slice()) {
        if (!e.alive || hit.has(e.uid)) continue;
        hit.add(e.uid); sc.damageEnemy(e, p.dmg(), { x, y, knock: 25, kind: 'plasma_storm' });
      }
      let fromX = x, fromY = y;
      for (let chain = 0; chain < p.s.chains; chain++) {
        const reach = chain ? p.s.chainRange * pl.mods.range : p.range();
        const target = nearestEnemies(sc, fromX, fromY, reach, 240).find(e => e.alive && !hit.has(e.uid));
        if (!target) break;
        const tx = target.x, ty = target.y; hit.add(target.uid);
        sc.fx.bolt(fromX, fromY, tx, ty, .16, 0x71edff);
        sc.damageEnemy(target, p.dmg(), { x: fromX, y: fromY, knock: 20, kind: 'plasma_storm' });
        fromX = tx; fromY = ty;
      }
    }
  },
  destroy(p) { for (const s of p.state.cores) s.destroy(); },
};
POWER_IMPL.meteor_cataclysm = {
  init(p) {
    // One reusable expanding ring per meteor carries its two successive waves.
    p.state.meteors = Array.from({ length: 4 }, () => ({ life: 0, waveHits: [new Set(), new Set()], waveRadii: [0, 0],
      mark: p.scene.add.image(0, 0, 'fx_meteor_mark', 0).setDepth(7).setVisible(false),
      rock: p.scene.add.image(0, 0, 'p_meteor_cataclysm').setDepth(9130).setVisible(false),
      wave: p.scene.add.image(0, 0, 'fx_cataclysm_wave', 0).setDepth(8).setVisible(false) }));
  },
  update(p, dt) {
    const sc = p.scene, pl = p.player; p.timer -= dt;
    if (p.timer <= 0) {
      const targets = nearestEnemies(sc, pl.x, pl.y, p.range(), p.s.count); p.timer = targets.length ? p.cd() : .12;
      for (let n = 0; targets.length && n < p.s.count; n++) {
        const m = p.state.meteors.find(m => m.life <= 0); if (!m) break;
        const t = targets[n % targets.length], angle = n * 2.39996, offset = n >= targets.length ? p.area(p.s.radius) * .5 : 0;
        Object.assign(m, { x: t.x + Math.cos(angle) * offset, y: t.y + Math.sin(angle) * offset, age: 0,
          warning: p.s.warning + n * .1, life: p.s.warning + n * .1 + 1,
          radius: p.area(p.s.radius), damage: p.dmg(), impacted: false });
        for (const hits of m.waveHits) hits.clear(); m.waveRadii.fill(0);
        m.mark.setPosition(m.x, m.y).setDisplaySize(m.radius * 2, m.radius * 2).setVisible(true); m.rock.setVisible(false); m.wave.setVisible(false); p.cast();
      }
    }
    for (const m of p.state.meteors) {
      if (m.life <= 0) continue;
      m.age += dt; m.life -= dt;
      const after = m.age - m.warning;
      if (after < 0) {
        m.mark.setFrame(Math.floor(m.age * 12) % 4).setAlpha(.5 + Math.sin(m.age * 18) * .16);
        const fall = Math.min(1, -after / .34);
        m.rock.setVisible(after > -.34).setPosition(m.x - fall * 105, m.y - fall * 260 - 18).setScale(1.4);
        continue;
      }
      if (!m.impacted) {
        m.impacted = true; m.mark.setVisible(false); m.rock.setVisible(false);
        evolutionCircle(p, m.x, m.y, m.radius, m.damage, 'meteor_cataclysm', 220); sc.fx.embers(m.x, m.y, 10);
      }
      m.wave.setVisible(false);
      for (let index = 0; index < 2; index++) {
        const start = index ? .46 : .02, duration = index ? .48 : .36;
        if (after < start || after - dt >= start + duration) continue;
        const progress = Math.min(1, (after - start) / duration);
        const front = m.radius * (index ? 1.65 : 1.3) * progress, previous = m.waveRadii[index];
        // The texture's outer ring is at pixel 30 of its 64px canvas. Match
        // this displayed front to collision, then reuse the sprite for wave 2.
        const diameter = front * 64 / 30;
        m.wave.setPosition(m.x, m.y).setVisible(true).setFrame(Math.floor(progress * 4) % 4)
          .setDisplaySize(diameter, diameter).setAlpha(.85 - progress * .35);
        for (const e of sc.queryEnemies(m.x, m.y, front, sc.tmpB).slice()) {
          const distance = Math.hypot(e.x - m.x, e.y - m.y);
          if (!e.alive || m.waveHits[index].has(e.uid) || distance > front + e.radius || distance < previous - e.radius - front * .08) continue;
          m.waveHits[index].add(e.uid);
          sc.damageEnemy(e, m.damage * (index ? .3 : .45), { x: m.x, y: m.y, knock: index ? 100 : 130, kind: 'meteor_cataclysm_wave_' + (index + 1) });
        }
        m.waveRadii[index] = front;
      }
      if (m.life <= 0) { m.mark.setVisible(false); m.rock.setVisible(false); m.wave.setVisible(false); }
    }
  },
  destroy(p) { for (const m of p.state.meteors) { m.life = 0; for (const hits of m.waveHits) hits.clear(); m.mark.destroy(); m.rock.destroy(); m.wave.destroy(); } },
};
