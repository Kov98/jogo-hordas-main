// ============================================================
//  CHEFE — Cavaleiro Sombrio.
//  Máquina de estados com ataques telegrafados:
//    Golpe de Espada · Investida Sombria · Onda de Energia ·
//    Explosão Sombria · Ataque de Fúria (vida baixa).
//  O parâmetro data permite chefes próprios de cada fase; BOSS mantém o castelo.
// ============================================================
class Boss {
  constructor(scene, x, y, data = BOSS) {
    this.data = data;
    const D = this.data;
    this.scene = scene;
    this.isBoss = true;
    this.uid = ENEMY_UID++;
    this.x = x; this.y = y; this.radius = D.radius;
    this.maxHp = Math.round(D.hp * scene.difficulty.bossHpMul); this.hp = this.maxHp;
    this.damageMul = scene.difficulty.bossDmgMul;
    this.alive = true;
    this.hitT = {};
    this.noObs = true;
    this.def = { name: D.name, kind: 'boss', kb: 0, dmg: 0, radius: D.radius };

    this.shadow = scene.add.image(x, y + 54, 'shadow').setScale(3, 2.2).setAlpha(0);
    this.aura = scene.add.image(x, y, D.auraTexture || 'glow_red').setBlendMode(Phaser.BlendModes.ADD).setScale(4).setAlpha(0).setDepth(8400);
    this.sprite = scene.add.sprite(x, y, D.texture || 'boss', 0).setAlpha(0);
    this.sprite.play(this.data.anim || 'boss_walk');

    this.state = 'intro'; this.stateT = 2.4;
    this.invuln = true;
    this.fury = false; this.furyDone = false;
    this.atkCd = 1.0; this.last = '';
    this.ang = 0; this.flash = 0; this.contactCd = 0;
    this.combo = 0; this.dashes = 0; this.hitDone = false; this.locked = false;
    this.trailT = 0; this.age = 0;
    this.meat = [false, false];

    scene.fx.ring(x, y, 20, 280, 0.9, D.introColor ?? 0xff2a2a, 5, 0.25);
    scene.fx.burst(D.particle || 'dark', x, y, 26);
    Sfx.play('boss');
  }

  // --- utilitários de estado/pose ---
  go(state, t) {
    this.state = state; this.stateT = t || 0;
    if (state === 'chase') this.walkPose();
  }
  setPose(f) { this.sprite.anims.stop(); this.sprite.setFrame(f); }
  walkPose() { if (!this.sprite.anims.isPlaying) this.sprite.play(this.data.anim || 'boss_walk'); }
  rest(t, pose) {
    this.go('rest', t); this.setPose(pose === undefined ? 0 : pose);
    this.atkCd = this.fury ? 0.45 : 1.0;
  }

  // --- escolha de ataque ---
  chooseAttack(dist) {
    const opts = [];
    const add = (id, w) => opts.push([id, id === this.last ? w * 0.25 : w]);
    add('slash', dist < 260 ? 5 : 1);
    add('wave', dist > 220 ? 4 : 2);
    add('blast', 3);
    add('charge', dist > 280 ? 4 : 1.5);
    let total = 0; for (const o of opts) total += o[1];
    let r = Math.random() * total, id = opts[0][0];
    for (const o of opts) { r -= o[1]; if (r <= 0) { id = o[0]; break; } }
    this.last = id;
    if (id === 'slash') this.startSlash(false);
    else if (id === 'charge') this.startCharge(false);
    else if (id === 'wave') this.startWave();
    else this.startBlast();
  }

  // --- Golpe de Espada ---
  startSlash(chain) {
    const sc = this.scene, p = sc.player, D = this.data.slash;
    this.ang = Math.atan2(p.y - this.y, p.x - this.x);
    const w = (chain ? D.windup * 0.55 : D.windup) * (this.fury ? 0.8 : 1);
    if (!chain) this.combo = this.fury ? 1 : 0; else this.combo--;
    this.go('slash_wind', w); this.setPose(2);
    sc.fx.teleCone(this.x, this.y, this.ang, D.reach, D.half, w, 0xff2a2a);
    Sfx.play('warn');
  }
  slashStrike() {
    const sc = this.scene, p = sc.player, D = this.data.slash;
    this.setPose(3); this.go('slash_hit', 0.3);
    const dx = p.x - this.x, dy = p.y - this.y, dist = Math.hypot(dx, dy);
    if (!p.dead && dist <= D.reach + p.radius && Math.abs(angleDiff(Math.atan2(dy, dx), this.ang)) <= D.half) p.takeDamage(D.dmg * this.damageMul);
    const tx = this.x + Math.cos(this.ang) * D.reach * 0.7, ty = this.y + Math.sin(this.ang) * D.reach * 0.7;
    sc.fx.ring(tx, ty, 20, D.reach * 0.6, 0.25, 0xff4a4a, 5, 0.25);
    sc.fx.burst('dark', tx, ty, 14);
    sc.cameras.main.shake(140, 0.007);
    Sfx.play('boom');
  }

  // --- Investida Sombria ---
  startCharge(again) {
    if (!again) this.dashes = this.fury ? 2 : 1;
    this.locked = false;
    const w = this.data.charge.windup * (again ? 0.55 : 1) * (this.fury ? 0.8 : 1);
    this.go('charge_wind', w); this.setPose(2);
  }

  // --- Onda de Energia ---
  startWave() {
    this.go('wave_wind', this.data.wave.windup * (this.fury ? 0.8 : 1)); this.setPose(2);
    this.scene.fx.ring(this.x, this.y, 10, 90, 0.5, 0xff3a3a, 3, 0.2);
    Sfx.play('warn');
  }
  fireWave() {
    const sc = this.scene, p = sc.player, D = this.data.wave;
    const base = Math.atan2(p.y - this.y, p.x - this.x), n = this.fury ? D.fury : D.count;
    const volley = (extra) => {
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * D.spread + extra;
        const s = sc.enemyShots.fire('dark', this.x + Math.cos(a) * 50, this.y - 6 + Math.sin(a) * 40, a, 1,
          { tex: 'sh_wave', speed: D.speed * sc.difficulty.projectileMul, dmg: D.dmg * this.damageMul, radius: 22, life: 3.6, rot: true, scale: 1 });
        if (s) s.rotation = a + Math.PI; // a borda brilhante da onda aponta para a frente
      }
    };
    volley(0);
    sc.fx.ring(this.x, this.y, 20, 140, 0.3, 0xff4a4a, 4, 0.2);
    sc.cameras.main.shake(100, 0.005);
    Sfx.play('boom');
    this.rest(0.6, 3);
    if (this.fury) {
      sc.time.delayedCall(450, () => { if (this.alive && !sc.ended) { volley(D.spread / 2); Sfx.play('boom'); } });
    }
  }

  // --- Explosão Sombria ---
  startBlast() {
    const sc = this.scene, p = sc.player, D = this.data.blast, A = CONFIG.arena;
    const n = this.fury ? D.fury : D.count;
    this.go('blast_wind', D.windup); this.setPose(2);
    for (let i = 0; i < n; i++) {
      let x = p.x, y = p.y;
      if (i > 0) { const a = Math.random() * 6.283, r = rand(80, 300); x += Math.cos(a) * r; y += Math.sin(a) * r; }
      const d = Math.hypot(x - A.x, y - A.y), lim = A.r - 40;
      if (d > lim) { x = A.x + (x - A.x) / d * lim; y = A.y + (y - A.y) / d * lim; }
      sc.addHazard({ shape: 'circle', x, y, r: D.radius, delay: 0.85 + i * 0.17, dmg: D.dmg * this.damageMul, col: 0xb040ff, kind: 'dark' });
    }
    sc.fx.ring(this.x, this.y, 10, 120, 0.6, 0xb040ff, 4, 0.2);
    Sfx.play('warn');
  }

  // --- Fúria ---
  startFury() {
    this.furyDone = true;
    this.invuln = true;
    this.go('fury', 1.5); this.setPose(2);
    const sc = this.scene;
    sc.fx.teleCircle(this.x, this.y, 1, 0.01, this.data.furyColor ?? 0xff0000);
    sc.announce(this.data.furyMessage || ('O ' + this.data.name + ' entra em FÚRIA!'), this.data.furyColor ?? 0xff2a2a);
    sc.cameras.main.shake(1200, 0.006);
    Sfx.play('fury');
  }

  // --- dano recebido ---
  hurt(dmg) {
    if (!this.alive || this.invuln) { this.scene.fx.burst('spark', this.x + rand(-30, 30), this.y + rand(-30, 30), 2); return false; }
    this.hp -= dmg; this.flash = 0.06;
    const f = this.hp / this.maxHp;
    // carne que cura em 66% e 33% da vida
    if (!this.meat[0] && f <= 0.66) { this.meat[0] = true; this.dropMeat(); }
    if (!this.meat[1] && f <= 0.33) { this.meat[1] = true; this.dropMeat(); }
    if (!this.furyDone && f <= this.data.furyAt && this.hp > 0) this.startFury();
    if (this.hp <= 0) { this.hp = 0; this.die(); }
    return true;
  }
  dropMeat() {
    const A = CONFIG.arena;
    this.scene.gems.drop(A.x + rand(-120, 120), A.y + rand(-120, 120), 0, 'meat');
    this.scene.announce('Um banquete surge na arena!', 0x9aff9a);
  }

  die() {
    if (!this.alive) return;
    const sc = this.scene;
    const initialization=sc.initialization;
    this.alive = false; this.state = 'dead';
    // Lock the fatal-hit frame for every official boss, before delayed FX.
    if (sc.beginBossDefeat) sc.beginBossDefeat();
    else if (sc.stageId === 'forest') sc.beginForestVictory();
    sc.enemyShots.clear(); sc.hazards.length = 0; sc.fx.ground.length = 0;
    this.sprite.anims.stop(); this.sprite.setFrame(0).clearTint();
    this.aura.setAlpha(0);
    sc.announce(this.data.name + ' derrotado!', 0xffe070);
    let n = 0;
    sc.time.addEvent({
      delay: 150, repeat: 15, callback: () => {
        if(sc.initialization!==initialization||sc.boss&&sc.boss!==this)return;
        n++;
        const x = this.x + rand(-55, 55), y = this.y + rand(-60, 50);
        sc.fx.boom(x, y, rand(50, 110), this.data.deathColor ?? 0xff3a3a, this.data.particle || 'dark');
        sc.cameras.main.shake(130, 0.008);
        this.sprite.setTintFill(n % 2 ? 0xffffff : (this.data.deathTint ?? 0xff2a2a));
        Sfx.play('boom');
      },
    });
    sc.tweens.add({ targets: [this.sprite, this.shadow], alpha: 0, delay: 1800, duration: 700 });
    sc.time.delayedCall(2700, () => {
      if(sc.initialization!==initialization||sc.boss&&sc.boss!==this)return;
      sc.fx.boom(this.x, this.y, 240, 0xffffff, this.data.particle || 'dark'); sc.onBossDefeated();
    });
  }

  // --- atualização por frame ---
  update(dt) {
    if (!this.alive) return;
    const sc = this.scene, p = sc.player, D = this.data, F = this.fury;
    const dx = p.x - this.x, dy = p.y - this.y;
    const dist = Math.hypot(dx, dy) || 1, nx = dx / dist, ny = dy / dist;
    this.contactCd -= dt; this.flash -= dt; this.atkCd -= dt; this.stateT -= dt; this.age += dt;
    let mx = 0, my = 0, speed = 0;

    switch (this.state) {
      case 'intro': {
        const k = 1 - Math.max(0, this.stateT) / 2.4;
        this.sprite.setAlpha(k); this.shadow.setAlpha(k * 0.9);
        if (this.stateT > 0 && Math.random() < dt * 14) sc.fx.burst(D.particle || 'dark', this.x + rand(-50, 50), this.y + rand(-10, 60), 2);
        if (this.stateT <= 0) { this.invuln = false; this.go('chase'); this.atkCd = 0.8; }
        break;
      }
      case 'chase':
        speed = D.speed * (F ? 1.3 : 1);
        if (dist > this.radius + 36) { mx = nx; my = ny; }
        if (this.atkCd <= 0) this.chooseAttack(dist);
        break;
      case 'slash_wind':
        if (this.stateT <= 0) this.slashStrike();
        break;
      case 'slash_hit':
        if (this.stateT <= 0) { if (this.combo > 0) this.startSlash(true); else this.rest(F ? 0.5 : 0.8); }
        break;
      case 'charge_wind':
        if (!this.locked) {
          this.ang = Math.atan2(dy, dx);
          if (this.stateT <= 0.55) {
            this.locked = true;
            sc.fx.teleLine(this.x, this.y, this.ang, D.charge.speed * D.charge.dur + 40, this.radius * 1.7, Math.max(0.1, this.stateT), D.chargeColor ?? 0xff2a2a);
            Sfx.play('warn');
          }
        }
        if (this.stateT <= 0) { this.go('charge', D.charge.dur); this.setPose(3); this.hitDone = false; }
        break;
      case 'charge':
        speed = D.charge.speed; mx = Math.cos(this.ang); my = Math.sin(this.ang);
        this.trailT -= dt;
        if (this.trailT <= 0) { this.trailT = 0.04; sc.fx.burst(D.particle || 'dark', this.x, this.y + 24, 3); }
        if (!this.hitDone && !p.dead && dist < this.radius + p.radius + 4) {
          if (p.takeDamage(D.charge.dmg * this.damageMul)) { this.hitDone = true; sc.fx.burst('blood', p.x, p.y, 10); }
        }
        if (this.stateT <= 0) {
          this.dashes--;
          if (this.dashes > 0) this.startCharge(true);
          else { this.rest(D.charge.recover * (F ? 0.65 : 1)); sc.fx.ring(this.x, this.y, 20, 100, 0.3, D.recoverColor ?? 0x9a60ff, 3, 0.1); }
        }
        break;
      case 'wave_wind':
        if (this.stateT <= 0) this.fireWave();
        break;
      case 'blast_wind':
        if (this.stateT <= 0) this.rest(0.5, 3);
        break;
      case 'rest':
        if (this.stateT <= 0) this.go('chase');
        break;
      case 'fury':
        if (Math.random() < dt * 9) sc.fx.ring(this.x, this.y, 20, rand(160, 300), 0.5, D.furyColor ?? 0xff2a2a, 4, 0.12);
        if (Math.random() < dt * 24) sc.fx.burst(D.furyParticle || 'blood', this.x + rand(-40, 40), this.y + rand(-50, 40), 2);
        if (this.stateT <= 0) { this.invuln = false; this.fury = true; this.go('chase'); this.atkCd = 0.4; }
        break;
    }

    // movimento e limites (a arena prende o chefe)
    if (speed) { this.x += mx * speed * dt; this.y += my * speed * dt; }
    sc.world.constrain(this);

    // virar para o jogador (ou para a direção travada do ataque)
    const face = (this.state === 'chase' || this.state === 'rest' || this.state === 'intro' || this.state === 'fury') ? dx : Math.cos(this.ang);
    if (Math.abs(face) > 0.5) this.sprite.setFlipX(face < 0);

    // dano de contato
    if ((this.state === 'chase' || this.state === 'rest') && !p.dead && dist < this.radius + p.radius && this.contactCd <= 0) {
      if (p.takeDamage(D.contactDmg * this.damageMul)) this.contactCd = 0.8;
    }

    // visual
    let sx = this.x;
    if (this.state.indexOf('_wind') > 0) sx += Math.sin(this.age * 70) * 1.6; // treme ao preparar o ataque
    this.sprite.setPosition(sx, this.y).setDepth(this.y);
    this.shadow.setPosition(this.x, this.y + 54).setDepth(this.y - 1);
    this.aura.setPosition(this.x, this.y + 6);
    if (this.state !== 'intro') this.aura.setAlpha((F ? 0.5 : 0.22) + Math.sin(this.age * 5) * 0.06 + (this.state.indexOf('_wind') > 0 ? 0.2 : 0));
    if (this.flash > 0) this.sprite.setTintFill(0xffffff);
    else if (F) this.sprite.setTint(D.furyTint ?? 0xff9a9a);
    else this.sprite.clearTint();
  }
}
