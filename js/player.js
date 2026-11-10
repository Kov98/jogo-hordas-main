// ============================================================
//  PLAYER — movimento, atributos, vida, XP e poderes adquiridos.
// ============================================================
class Player {
  constructor(scene, charDef, x, y) {
    this.scene = scene;
    this.def = charDef;
    this.x = x; this.y = y;
    this.radius = CONFIG.player.radius;

    this.shadow = scene.add.image(x, y + 20, 'shadow').setAlpha(0.8);
    this.sprite = scene.add.sprite(x, y, 'c_' + charDef.id, 0);
    this.sprite.play('walk_' + charDef.id);
    this.sprite.anims.pause();

    // Atributos
    this.maxHp = charDef.hp;
    this.hp = this.maxHp;
    this.baseSpeed = charDef.speed;
    this.mods = { damage: 1, speed: 1, rate: 1, range: 1, area: 1 };
    this.level = 1;
    this.xp = 0;
    this.xpNext = CONFIG.xpNeeded(1);
    this.invuln = 0;
    this.flash = 0;
    this.appearanceTint = null;
    this.pulse = 0;
    this.dead = false;

    this.powers = [];          // instâncias de PowerInstance
    this.passives = {};        // id -> nível
    this.relics = [];          // at most three unique IDs; effects are always derived
    this.aim = { x: 1, y: 0 }; // última direção de movimento
    this.moving = false;
    this.kills = 0;
    this.dashLevel = 1;
    this.dashT = 0; this.dashCd = 0;
    this.dashSmoke = false;
    this.dashDir = { x: 1, y: 0 };
    this.slowT = 0;
    this.dashTrailT = 0;
  }

  get speed() { return this.baseSpeed * this.mods.speed * this.relicMultiplier('speed'); }

  addRelic(id) {
    if (typeof RELICS === 'undefined' || !Object.hasOwn(RELICS, id) || this.relics.includes(id) || this.relics.length >= 3) return false;
    this.relics.push(id); return true;
  }
  removeRelic(id) {
    const index = this.relics.indexOf(id);
    if (index < 0) return false;
    this.relics.splice(index, 1); return true;
  }
  relicMultiplier(stat) {
    let value = 1;
    if (typeof RELICS === 'undefined') return value;
    for (const id of new Set(this.relics || [])) {
      const relic = Object.hasOwn(RELICS, id) ? RELICS[id] : null;
      if (!relic) continue;
      value *= relic.multipliers[stat] || 1;
      if (stat === 'damage' && id === 'blood_oath' && this.hp < this.maxHp * 0.35) value *= 1.45;
    }
    return value;
  }
  projectileCount(base) { return base * ((this.relics || []).includes('twin_seal') ? 2 : 1); }

  get smokeDash() { return this.dashSmoke; }
  set smokeDash(value) { this.dashSmoke = !!value; }
  get dashCooldown() { return [1.8, 1.4, 1.05][this.dashLevel - 1]; }
  upgradeDash() { this.dashLevel = Math.min(3, this.dashLevel + 1); }
  enableSmokeDash() { this.dashSmoke = true; }

  update(dt, input, world) {
    if (this.dead) return;
    dt = Math.max(0, dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    let vx = input.x || 0, vy = input.y || 0;
    const len = Math.hypot(vx, vy);
    this.moving = len > 0.05;
    if (this.moving) {
      vx /= len; vy /= len;
      this.aim.x = vx; this.aim.y = vy;
    }
    if (input.dash && this.dashCd <= 0 && this.dashT <= 0) {
      const aimLen = Math.hypot(this.aim.x, this.aim.y) || 1;
      this.dashDir = { x: this.aim.x / aimLen, y: this.aim.y / aimLen };
      this.dashT = 0.15; this.dashCd = this.dashCooldown;
      this.dashTrailT = 0;
      if (this.scene.fx.dashPuff) this.scene.fx.dashPuff(this.x, this.y, this.dashSmoke, this.def.color);
    }
    const dashDt = Math.min(dt, this.dashT);
    let normalDt = dt - dashDt;
    if (dashDt > 0) {
      const distance = [100, 115, 130][this.dashLevel - 1] * dashDt / 0.15;
      const steps = Math.max(1, Math.ceil(distance / Math.max(1, this.radius / 2)));
      const dx = this.dashDir.x * distance / steps, dy = this.dashDir.y * distance / steps;
      for (let i = 0; i < steps; i++) {
        const ox = this.x, oy = this.y, tx = ox + dx, ty = oy + dy;
        this.x = tx; this.y = ty;
        world.constrain(this);
        // Any correction means a wall was reached. Keep the last safe point,
        // rather than following repeated pushes around/through the obstacle.
        if (Math.hypot(this.x - tx, this.y - ty) > 0.01) {
          this.x = ox; this.y = oy; this.dashT = 0;
          normalDt = 0;
          break;
        }
        this.dashTrailT -= dashDt / steps;
        if (this.dashTrailT <= 0) {
          if (this.scene.fx.dashTrail) this.scene.fx.dashTrail(this, this.dashSmoke);
          this.dashTrailT = 0.025;
        }
      }
      this.dashT = Math.max(0, this.dashT - dashDt);
      if (this.dashT < 1e-8) this.dashT = 0;
      if (!this.dashT && this.scene.fx.dashPuff) this.scene.fx.dashPuff(this.x, this.y, this.dashSmoke, this.def.color);
    }
    if (this.moving && normalDt > 0) {
      // Integrate the slow portion separately so expiry inside a frame is exact.
      const slowed = Math.min(normalDt, Math.max(0, this.slowT - dashDt));
      const travel = this.speed * (normalDt - slowed * 0.45);
      this.x += vx * travel; this.y += vy * travel;
    }
    this.slowT = Math.max(0, this.slowT - dt);
    this.moving = this.moving || this.dashT > 0;
    const facing = this.dashT > 0 ? this.dashDir.x : vx;
    if (this.moving) {
      if (Math.abs(facing) > 0.1) this.sprite.setFlipX(facing < 0);
      if (!this.sprite.anims.isPlaying) this.sprite.anims.resume();
    } else if (this.sprite.anims.isPlaying) {
      this.sprite.anims.pause(); this.sprite.setFrame(0);
    }
    world.constrain(this);

    this.invuln -= dt;
    this.flash -= dt;
    this.sprite.setPosition(this.x, this.y);
    this.sprite.setDepth(this.y + 20);
    this.pulse = Math.max(0, this.pulse - dt * 0.9);
    this.sprite.setScale(1 + this.pulse, 1 - this.pulse * 0.6);
    this.shadow.setPosition(this.x, this.y + 20).setDepth(this.y - 1);
    // Pisca quando invulnerável / flash vermelho ao levar dano
    if (this.flash > 0) this.sprite.setTintFill(0xff4040);
    else if (this.appearanceTint != null) this.sprite.setTint(this.appearanceTint);
    else { this.sprite.clearTint(); }
    this.sprite.setAlpha(this.dashSmoke && this.dashT > 0 ? 0.18 : this.invuln > 0 ? (Math.floor(this.invuln * 20) % 2 ? 0.4 : 1) : 1);

    for (const p of this.powers) p.update(dt);
  }

  takeDamage(n) {
    if (this.scene.cinematic) return false;
    if (this.dead || this.invuln > 0 || (this.dashSmoke && this.dashT > 0)) return false;
    if (this.scene.godMode) return false;
    n *= this.relicMultiplier('incoming');
    this.hp -= n;
    this.invuln = CONFIG.player.invuln;
    this.flash = 0.12;
    this.scene.fx.number(this.x, this.y - 30, Math.round(n), '#ff6a6a', true);
    this.scene.fx.burst('blood', this.x, this.y, 8);
    this.scene.cameras.main.shake(110, 0.004);
    Sfx.play('hurt');
    if (this.hp <= 0) { this.hp = 0; this.dead = true; this.scene.onPlayerDeath(); }
    return true;
  }

  heal(n) {
    n *= this.relicMultiplier('healing');
    this.hp = Math.min(this.maxHp, this.hp + n);
    this.scene.fx.number(this.x, this.y - 30, '+' + Math.round(n), '#7aff9a', false);
  }

  gainXp(n) {
    if (this.scene.cinematic) return;
    if (this.level >= 100) return;
    this.xp += n;
    while (this.level < 100 && this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = CONFIG.xpNeeded(this.level);
      this.scene.queueLevelUp();
    }
    if (this.level >= 100) this.xp = 0;
  }

  hasPower(id) { return this.powers.find((p) => p.def.id === id); }

  addPower(id) {
    const ex = this.hasPower(id);
    if (ex) { ex.levelUp(); return ex; }
    const inst = new PowerInstance(this.scene, this, POWERS[id]);
    this.powers.push(inst);
    return inst;
  }

  addPassive(id) {
    const def = PASSIVES.find((p) => p.id === id);
    def.apply(this);
    this.passives[id] = (this.passives[id] || 0) + 1;
  }

  // Remove tudo (reinício limpo)
  destroy() {
    for (const p of this.powers) p.destroy();
    this.powers.length = 0;
    this.sprite.destroy(); this.shadow.destroy();
  }
}
