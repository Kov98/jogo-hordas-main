// ============================================================
//  INIMIGOS — pool, IA por tipo, projéteis inimigos, gemas de XP
//  e o diretor de hordas (spawn progressivo + eventos).
// ============================================================

// ---------- Projéteis inimigos (pool) ----------
class EnemyShots {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    for (let i = 0; i < CONFIG.maxEnemyShots; i++) {
      const s = scene.add.image(0, 0, 'sh_magic').setVisible(false).setActive(false).setDepth(9050);
      s.live = false;
      this.items.push(s);
    }
  }
  // o: {type, x, y, ang, dmg, speed, tex, radius, life, rot}
  fire(type, x, y, ang, dmgMul, over) {
    const d = Object.assign({}, ENEMY_SHOTS[type], over || {});
    for (const s of this.items) {
      if (s.live) continue;
      s.live = true; s.slow = d.slow || 0; s.clearTint();
      if (d.tint) s.setTint(d.tint);
      s.setTexture(d.tex).setPosition(x, y).setVisible(true).setActive(true).setRotation(d.rot ? ang : 0);
      s.vx = Math.cos(ang) * d.speed; s.vy = Math.sin(ang) * d.speed;
      s.dmg = d.dmg * (dmgMul || 1); s.rad = d.radius; s.life = d.life; s.spin = !d.rot;
      s.setBlendMode(d.add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
      s.setScale(d.scale || 1);
      return s;
    }
    return null;
  }
  kill(s) { s.live = false; s.setVisible(false).setActive(false); }
  clear() { for (const s of this.items) if (s.live) this.kill(s); }
  update(dt) {
    const sc = this.scene, p = sc.player;
    for (const s of this.items) {
      if (!s.live) continue;
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.spin) s.rotation += dt * 6;
      if (s.life <= 0 || sc.world.outside(s.x, s.y)) { this.kill(s); continue; }
      const dx = p.x - s.x, dy = p.y - s.y, rr = s.rad + p.radius;
      if (dx * dx + dy * dy < rr * rr) {
        if (p.takeDamage(s.dmg)) { if (s.slow) p.slowT = Math.max(p.slowT || 0, s.slow); sc.fx.burst('dark', s.x, s.y, 5); this.kill(s); }
        else if (p.invuln > 0 && p.invuln < CONFIG.player.invuln) { /* atravessa durante invulnerabilidade */ }
      }
    }
  }
}

// ---------- Gemas de experiência e cura (pool) ----------
class Gems {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    for (let i = 0; i < CONFIG.maxGems; i++) {
      const s = scene.add.image(0, 0, 'gem1').setVisible(false).setActive(false);
      s.live = false;
      this.items.push(s);
    }
  }
  drop(x, y, value, kind) {
    for (const s of this.items) {
      if (s.live) continue;
      s.live = true; s.value = value; s.kind = kind || 'xp'; s.mag = false; s.spd = 0; s.t = Math.random() * 6;
      const tex = s.kind === 'meat' ? 'meat' : value < 5 ? 'gem1' : value < 12 ? 'gem2' : 'gem3';
      s.setTexture(tex).setPosition(x + rand(-8, 8), y + rand(-8, 8)).setVisible(true).setActive(true).setDepth(y - 5);
      return true;
    }
    return false; // sem espaço: quem chamou concede o XP diretamente
  }
  update(dt) {
    const p = this.scene.player;
    const pick = CONFIG.player.pickupRadius * p.mods.area;
    for (const s of this.items) {
      if (!s.live) continue;
      s.t += dt;
      const dx = p.x - s.x, dy = p.y - s.y, d2 = dx * dx + dy * dy;
      if (!s.mag && d2 < pick * pick) s.mag = true;
      if (s.mag) {
        s.spd = Math.min(700, s.spd + 1400 * dt);
        const d = Math.sqrt(d2) || 1;
        if (d < 16 || s.spd * dt >= d) { this.collect(s); continue; }
        s.x += dx / d * s.spd * dt; s.y += dy / d * s.spd * dt;
      } else {
        s.y += Math.sin(s.t * 4) * 0.12;
      }
      s.setDepth(s.y - 5);
    }
  }
  collect(s) {
    const p = this.scene.player;
    if (s.kind === 'meat') p.heal(p.maxHp * 0.25);
    else p.gainXp(s.value);
    s.live = false; s.setVisible(false).setActive(false);
  }
  // Atrai todas as gemas (usado ao derrotar o chefe, etc.)
  magnetAll() { for (const s of this.items) if (s.live) s.mag = true; }
}

// ---------- Inimigo individual ----------
class Enemy {
  constructor(scene) {
    this.scene = scene;
    this.sprite = scene.add.sprite(0, 0, 'e_skel_warrior', 0).setVisible(false).setActive(false);
    this.alive = false;
    this.hitT = {};
    this.x = 0; this.y = 0; this.radius = 12;
    this.uid = 0;
  }
}

let ENEMY_UID = 1;

// ---------- Gerenciador / IA ----------
class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    for (let i = 0; i < CONFIG.maxEnemies; i++) this.pool.push(new Enemy(scene));
    this.ids = (scene.stage?.enemyIds || Object.keys(ENEMIES).filter(id => !ENEMIES[id].stage || ENEMIES[id].stage === 'castle'))
      .filter(id => ENEMIES[id] && !ENEMIES[id].explorationOnly && ENEMIES[id].weight > 0 && Number.isFinite(ENEMIES[id].from));
    this.counts = {};
    this.alive = 0;
    this.summoned = 0;
    this.acc = 0;
    this.eventIdx = 0;
    this.tmp = [];
    this.tmpS = [];
    this.weights = new Array(this.ids.length).fill(0);
  }

  // --- criação ---
  ordinaryCapacity() {
    const pending = this.scene.encounters ? this.scene.encounters.spawned.filter(done => !done).length : 2;
    return this.pool.length - Math.min(pending, Math.max(0, this.pool.length - 1));
  }

  spawn(typeId, x, y, hpMul, summoned, scheduled = false) {
    // Every ordinary source (director, events and summoners) shares this limit.
    if (!scheduled && this.alive >= this.ordinaryCapacity()) return null;
    let e = null;
    for (const c of this.pool) { if (!c.alive) { e = c; break; } }
    if (!e) return null;
    const d = ENEMIES[typeId], art = ENEMY_ART[typeId];
    e.def = d; e.id = typeId; e.uid = ENEMY_UID++;
    e.alive = true; e.x = x; e.y = y; e.radius = d.radius;
    e.maxHp = e.hp = d.hp * (hpMul || 1) * this.scene.difficulty.hpMul * (this.scene.stageHpMul ?? 1);
    e.isMiniBoss = false; e.isBoss = false; e.isExplorationBoss = false; e.miniIndex = 0; e.miniRewarded = false;
    e.slowUntil = 0; e.slowFactor = 1; e.spiralCd = 2;
    e.kx = 0; e.ky = 0; e.flash = 0;
    e.state = 'chase'; e.stateT = 0; e.cdx = 0; e.cdy = 0;
    e.atkCd = rand(0.5, 1.8); e.shellCd = rand(0.5, 1.8); e.contactCd = 0; e.chargeCd = rand(0.5, 2.0);
    e.summonCd = rand(2, 4); e.face = 0; e.phase = Math.random() * 6.28;
    e.strafe = Math.random() < 0.5 ? 1 : -1;
    e.ghost = !!d.ghost; e.summoned = !!summoned;
    for (const k in e.hitT) delete e.hitT[k];
    e.sprite.setTexture('e_' + typeId, 0).setScale(art.visualScale || 1).setPosition(x, y).setVisible(true).setActive(true).clearTint().setAlpha(d.ghost ? 0.72 : 1).setFlipX(false);
    e.sprite.play('walk_e_' + typeId);
    this.counts[typeId] = (this.counts[typeId] || 0) + 1;
    this.alive++;
    if (summoned) this.summoned++;
    return e;
  }

  // Chamado pela cena quando a vida chega a zero
  kill(e, silent) {
    if (!e.alive) return;
    e.alive = false;
    e.sprite.setVisible(false).setActive(false);
    this.counts[e.id]--; this.alive--;
    if (e.summoned) this.summoned--;
    if (silent) return;
    const sc = this.scene;
    sc.fx.burst(e.def.ghost || e.id === 'floating_skull' ? 'dark' : 'bone', e.x, e.y, 7 + Math.min(10, e.def.radius / 3));
    sc.fx.corpse(e);
    sc.player.kills++;
    sc.totalKills++;
    sc.encounters?.onKill(e);
    sc.exploration?.onKill(e);
    const xp = e.def.xp * sc.difficulty.xpMul;
    if (xp > 0 && !sc.gems.drop(e.x, e.y, xp)) sc.player.gainXp(xp);
    // Cura também pode cair dos inimigos das primeiras hordas.
    if (Math.random() < CONFIG.healthDropChance * sc.difficulty.healMul) sc.gems.drop(e.x + 10, e.y, 0, 'meat');
    if (e.def.radius >= 24) sc.cameras.main.shake(90, 0.004);
  }

  killAllSilently() { for (const e of this.pool) if (e.alive) this.kill(e, true); }

  // --- diretor de hordas ---
  pickType(t) {
    if (!this.ids.length) return null;
    let total = 0;
    for (let i = 0; i < this.ids.length; i++) {
      const id = this.ids[i], d = ENEMIES[id];
      let w = 0;
      const unlock = d.from / (this.scene.difficulty.id === 'hardcore' ? 2.5 : this.scene.difficulty.id === 'hard' ? 1.3 : 1);
      if (t >= unlock) {
        w = d.weight * Math.min(1, (t - unlock) / 50 + 0.15);
        if (d.hp <= 20) w *= Math.max(0.25, 1 - t / 700);
        if (d.maxAlive && (this.counts[id] || 0) >= d.maxAlive) w = 0;
      }
      this.weights[i] = w; total += w;
    }
    if (total <= 0) return this.ids[0];
    let r = Math.random() * total;
    for (let i = 0; i < this.ids.length; i++) { r -= this.weights[i]; if (r <= 0) return this.ids[i]; }
    return this.ids[0];
  }

  hpMul(t) { return 1 + (t / 60) * CONFIG.spawn.hpPerMinute; }

  // Random arrivals must remain distant AFTER the actual species is constrained.
  // spawn() stays coordinate-exact for boss summons and scripted/test placement.
  projectSpawn(typeId, x, y, minDistance = 480) {
    const sc = this.scene, d = typeId ? ENEMIES[typeId] : { radius: 12 };
    if (!d || !sc.player || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    const point = { x, y, radius: d.radius || 12, def: d, ghost: !!d.ghost };
    const world = sc.world;
    if (world?.constrain) {
      let stable = false;
      for (let tries = 0; tries < 12; tries++) {
        const beforeX = point.x, beforeY = point.y;
        world.constrain(point);
        if (Math.hypot(point.x - beforeX, point.y - beforeY) < .01) { stable = true; break; }
      }
      if (!stable) return null;
      if (!point.ghost && !d.fly && d.kind !== 'flyer') {
        const obstacles = world.solids?.query(point.x, point.y, point.radius, []) || [];
        if (obstacles.some(o => Math.hypot(point.x - o.x, point.y - o.y) < point.radius + o.radius - .01)) return null;
      }
    }
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || world?.outside?.(point.x, point.y)) return null;
    if (Math.hypot(point.x - sc.player.x, point.y - sc.player.y) <= Math.max(minDistance, point.radius + (sc.player.radius || 12))) return null;
    return { x: point.x, y: point.y };
  }

  spawnAway(typeId, x, y, hpMul, summoned = false, scheduled = false) {
    const point = this.projectSpawn(typeId, x, y);
    return point ? this.spawn(typeId, point.x, point.y, hpMul, summoned, scheduled) : null;
  }

  spawnPoint(minD, maxD, typeId) {
    const sc = this.scene, p = sc.player;
    for (let tries = 0; tries < 8; tries++) {
      const a = Math.random() * Math.PI * 2, r = rand(minD, maxD);
      const x = clamp(p.x + Math.cos(a) * r, CONFIG.world.border + 40, CONFIG.world.w - CONFIG.world.border - 40);
      const y = clamp(p.y + Math.sin(a) * r, CONFIG.world.border + 40, CONFIG.world.h - CONFIG.world.border - 40);
      const point = this.projectSpawn(typeId, x, y);
      if (point) return point;
    }
    return null;
  }

  director(dt) {
    const sc = this.scene, t = sc.t;
    const events = sc.stage?.events || EVENTS;
    while (this.eventIdx < events.length && t >= events[this.eventIdx].t) this.runEvent(events[this.eventIdx++]);
    const rate = (CONFIG.spawn.baseRate + t * CONFIG.spawn.growth) * sc.difficulty.spawnMul * (sc.stageSpawnMul ?? 1);
    const cap = Math.min(this.ordinaryCapacity(), (28 + t * 0.4) * sc.difficulty.capMul);
    this.acc += rate * dt;
    let guard = 18;
    while (this.acc >= 1 && guard-- > 0) {
      this.acc -= 1;
      if (this.alive >= cap) { this.acc = Math.min(this.acc, 1); break; }
      const type = this.pickType(t);
      if (!type) break;
      const pt = this.spawnPoint(CONFIG.spawn.minDist, CONFIG.spawn.maxDist, type);
      if (!pt) continue;
      const d = ENEMIES[type];
      // inimigos fracos nascem em pequenos grupos
      const group = d.hp <= 20 && Math.random() < 0.4 ? 3 : 1;
      for (let i = 0; i < group && this.alive < cap; i++) this.spawnAway(type, pt.x + rand(-30, 30), pt.y + rand(-30, 30), this.hpMul(t));
    }
  }

  runEvent(ev) {
    const sc = this.scene, p = sc.player, t = sc.t, hm = this.hpMul(t);
    sc.announce(ev.msg, 0xffb060);
    if (ev.type === 'ring') {
      for (let i = 0; i < ev.count; i++) {
        const a = i / ev.count * Math.PI * 2, r = 600;
        this.spawnAway(ev.enemy, clamp(p.x + Math.cos(a) * r, 200, CONFIG.world.w - 200), clamp(p.y + Math.sin(a) * r, 200, CONFIG.world.h - 200), hm);
      }
    } else if (ev.type === 'swarm') {
      const a = Math.random() * Math.PI * 2;
      const cx = clamp(p.x + Math.cos(a) * 650, 200, CONFIG.world.w - 200), cy = clamp(p.y + Math.sin(a) * 650, 200, CONFIG.world.h - 200);
      for (let i = 0; i < ev.count; i++) this.spawnAway(ev.enemy, cx + rand(-110, 110), cy + rand(-110, 110), hm);
    } else if (ev.type === 'pack') {
      const pt = this.spawnPoint(620, 720, Object.keys(ev.list)[0]);
      if (!pt) return;
      for (const id in ev.list) for (let i = 0; i < ev.list[id]; i++) this.spawnAway(id, pt.x + rand(-90, 90), pt.y + rand(-90, 90), hm);
    }
  }

  // --- atualização por frame ---
  update(dt) {
    const sc = this.scene, p = sc.player, t = sc.t;
    if (sc.spawningEnabled) this.director(dt);
    const dmgScale = sc.dmgScale() * sc.difficulty.dmgMul;
    for (const e of this.pool) {
      if (!e.alive) continue;
      this.ai(e, dt, p, dmgScale);
      e.sprite.setPosition(e.x, e.y).setDepth(e.y + 20 * e.sprite.scaleY);
      // flash de dano
      e.flash -= dt;
      if (e.flash > 0) e.sprite.setTintFill(0xffffff); else e.sprite.clearTint();
    }
    // dano de contato no jogador
    if (!p.dead) {
      sc.grid.query(p.x, p.y, p.radius, this.tmp);
      for (let i = 0; i < this.tmp.length; i++) {
        const e = this.tmp[i];
        if (!e.alive || e.isBoss || e.contactCd > 0 || !e.def.dmg) continue;
        const mul = e.state === 'charge' ? 1.35 : 1;
        if (p.takeDamage(e.def.dmg * dmgScale * mul)) { e.contactCd = 0.5; break; }
      }
    }
  }

  fireShots(e, ang, dmgScale) {
    const s = e.def.shot, sc = this.scene;
    const n = s.count || 1;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * (s.spread || 0.2);
      const shot = ENEMY_SHOTS[s.type];
      sc.enemyShots.fire(s.type, e.x, e.y - 4, ang + off, dmgScale, { speed:(s.speed || shot.speed) * sc.difficulty.projectileMul, slow:s.slow || 0, tint:s.tint || 0 });
    }
  }

  ai(e, dt, p, dmgScale) {
    const sc = this.scene, d = e.def;
    let dx = p.x - e.x, dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist, ny = dy / dist;
    if (d.ambush) e.sprite.setAlpha(e.state === 'chase' && dist > 210 ? .48 : 1);
    e.atkCd -= dt; e.shellCd -= dt; e.contactCd -= dt; e.chargeCd -= dt;
    // vira devagar na direção do jogador (usado pelo bloqueio do escudo)
    const want = Math.atan2(ny, nx);
    e.face += clamp(angleDiff(want, e.face), -2.2 * dt, 2.2 * dt);
    if (Math.abs(dx) > 4) e.sprite.setFlipX(dx < 0);

    let mx = 0, my = 0, speed = d.speed;
    if (d.spiral && sc.spawningEnabled && !sc.ended && !sc.bossStarted) {
      e.spiralCd -= dt;
      if (e.spiralCd <= 0) {
        e.spiralCd = 1.5; e.phase += .38;
        sc.fx.ring(e.x,e.y,12,65,.4,0xd6a7ff,2,.2);
        for(let i=0;i<8;i++) sc.enemyShots.fire('dark',e.x,e.y,e.phase+i*Math.PI/4,dmgScale,{speed:175*sc.difficulty.projectileMul});
      }
    }

    switch (e.state) {
      case 'chase': {
        if (d.kind === 'melee' || d.kind === 'flyer' || d.kind === 'reaper') {
          mx = nx; my = ny;
          if (d.kind === 'flyer') { // ondula
            const w = Math.sin(sc.t * 3 + e.phase) * 0.55;
            mx += -ny * w; my += nx * w;
          }
        } else { // à distância: mantém a distância
          const keep = d.keep || 250;
          if (dist > keep + 30) { mx = nx; my = ny; }
          else if (dist < keep - 60) { mx = -nx; my = -ny; speed *= 0.9; }
          else { mx = -ny * e.strafe; my = nx * e.strafe; speed *= 0.5; }
          if (Math.random() < 0.004) e.strafe = -e.strafe;
        }
        // disparos
        if (sc.spawningEnabled && !sc.ended && !sc.bossStarted && d.shot && e.atkCd <= 0 && dist < d.shot.range) {
          this.fireShots(e, Math.atan2(dy, dx), dmgScale);
          e.atkCd = d.shot.cd * rand(0.85, 1.2);
        }
        // artilheiro: marca uma área no chão
        if (sc.spawningEnabled && !sc.ended && !sc.bossStarted && d.shell && e.shellCd <= 0 && dist < d.shell.range) {
          const shell = d.shell;
          const mark = (x,y,delay) => sc.addHazard({ shape:'circle', x, y, r:shell.radius, delay, dmg:shell.dmg*dmgScale, col:shell.col ?? (d.poison ? 0x91d442 : d.storm ? 0x8edfff : 0xff8a30), kind:shell.kind });
          // Coordinates are captured now; dodging never drags a marked attack.
          mark(p.x,p.y,shell.delay);
          if (shell.pattern === 'curse') {
            // Three simultaneous seals form a triangle with clear escape gaps.
            mark(p.x + nx*78 - ny*86,p.y + ny*78 + nx*86,shell.delay);
            mark(p.x + nx*78 + ny*86,p.y + ny*78 - nx*86,shell.delay);
          } else if (shell.pattern === 'storm') {
            // Lightning walks along the casting direction, with staggered warnings.
            for (let i=1;i<=2;i++) mark(p.x+nx*90*i,p.y+ny*90*i,shell.delay+.22*i);
          }
          if (e.isMiniBoss && d.storm) {
            for (let i=0;i<4;i++) { const a=i*Math.PI/2+e.phase; sc.addHazard({shape:'circle',x:p.x+Math.cos(a)*110,y:p.y+Math.sin(a)*110,r:48,delay:1.45,dmg:d.shell.dmg*dmgScale,col:0x8edfff}); }
          }
          sc.fx.burst(shell.pattern ? shell.kind : d.stage === 'forest' ? 'bone' : 'fire', e.x + (e.sprite.flipX ? -20 : 20), e.y - 6, 6);
          e.shellCd = d.shell.cd * rand(0.9, 1.15);
        }
        // invocador
        if (d.summon && sc.spawningEnabled && !sc.ended && !sc.bossStarted) {
          e.summonCd -= dt;
          if (e.summonCd <= 0 && this.summoned < 10 && this.alive < CONFIG.maxEnemies - 4) {
            e.summonCd = d.summon.cd;
            sc.fx.ring(e.x, e.y, 10, 70, 0.4, 0x7aff7a, 3, 0.15);
            for (let i = 0; i < d.summon.count; i++) {
              const a = Math.random() * 6.28;
              this.spawn(d.summon.type, e.x + Math.cos(a) * 40, e.y + Math.sin(a) * 40, this.hpMul(sc.t), true);
            }
            sc.fx.burst('dark', e.x, e.y, 10);
          }
        }
        // ceifador: golpe em arco telegrafado
        if (d.sweep && e.atkCd <= 0 && dist < d.sweep.range) {
          const ang = Math.atan2(dy, dx);
          sc.addHazard({ shape: 'cone', x: e.x, y: e.y, ang, r: d.sweep.range + 25, half: d.sweep.half, delay: d.sweep.windup, dmg: d.sweep.dmg * dmgScale, col: d.sweep.col ?? 0xff3a8a });
          e.state = 'cast'; e.stateT = d.sweep.windup + 0.25;
          e.atkCd = d.sweep.cd;
        }
        // investida
        const ch = d.charge;
        if (ch && e.chargeCd <= 0 && dist < ch.range && dist > ch.min) {
          e.state = 'windup'; e.stateT = ch.windup;
          e.cdx = nx; e.cdy = ny;
          sc.fx.teleLine(e.x, e.y, Math.atan2(ny, nx), d.speed * ch.mul * ch.dur * 0.95, d.radius * 1.6, ch.windup, ch.col ?? 0xff4040);
        }
        break;
      }
      case 'windup':
        e.stateT -= dt;
        e.sprite.x += Math.sin(sc.t * 60) * 1.2; // treme
        if (e.stateT <= 0) { e.state = 'charge'; e.stateT = d.charge.dur; }
        break;
      case 'charge':
        e.stateT -= dt;
        mx = e.cdx; my = e.cdy; speed = d.speed * d.charge.mul;
        if (e.stateT <= 0) { e.state = 'recover'; e.stateT = d.charge.recover; e.chargeCd = d.charge.cd * rand(0.9, 1.2); }
        break;
      case 'recover': case 'cast':
        e.stateT -= dt;
        if (e.stateT <= 0) e.state = 'chase';
        break;
    }

    speed *= sc.difficulty.speedMul * (e.slowUntil > sc.t ? e.slowFactor : 1);
    // movimento + empurrão
    e.x += mx * speed * dt + e.kx * dt;
    e.y += my * speed * dt + e.ky * dt;
    const decay = Math.max(0, 1 - 7 * dt);
    e.kx *= decay; e.ky *= decay;

    // separação entre inimigos (evita sobreposição total)
    if (!e.ghost) this.separate(e, dt, d.kind === 'flyer' ? 0.5 : 1);
    sc.world.constrain(e);
  }

  separate(e, dt, k) {
    const list = this.scene.grid.query(e.x, e.y, e.radius * 0.9, this.tmpS);
    let px = 0, py = 0, c = 0;
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (o === e || o.ghost || o.isBoss) continue;
      const dx = e.x - o.x, dy = e.y - o.y, rr = (e.radius + o.radius) * 0.9, d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr) continue;
      const dd = Math.sqrt(d2) || 0.01, push = (rr - dd) / rr;
      // quem é mais leve cede mais
      const w = o.radius / (e.radius + o.radius);
      px += dx / dd * push * w * 2; py += dy / dd * push * w * 2;
      if (++c >= 5) break;
    }
    if (c) { e.x += px * 130 * dt * k; e.y += py * 130 * dt * k; }
  }
}
