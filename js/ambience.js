// Vida do menu: moradores durante o dia e pequenas cenas de perseguição à noite.
class MenuLife {
  constructor(scene) {
    this.scene = scene;
    this.rng = mulberry32(514);
    this.elapsed = 0;
    // Guarda a transparência das camadas que podem esconder um morador.
    // Isso evita um halo flutuando diante de árvores ou casas quando o corpo está atrás.
    const occluders = ['ls_hillB', 'ls_hillC', 'ls_ground', 'ls_village'];
    this.occluders = scene.children.list.filter(image => occluders.includes(image.texture?.key)).map(image => {
      const canvas = image.texture.getSourceImage();
      return { image, width: canvas.width, height: canvas.height,
        pixels: canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data };
    });
    this.villagers = Array.from({ length: 24 }, (_, id) => this.createActor('villager', id, Math.floor(id / 8), id % 8, 8));
    this.skeletons = Array.from({ length: 30 }, (_, id) => this.createActor('skeleton', id, Math.floor(id / 10), id % 10, 10));
    this.sparks = Array.from({ length: 16 }, () => ({
      sprite: scene.add.image(0, 0, 'menu_spark').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0), life: 0,
    }));
    scene.events.on('update', this.update, this);
    scene.events.once('shutdown', () => scene.events.off('update', this.update, this));
    this.update(0, 0);
  }

  createActor(kind, id, lane, index, count) {
    const villager = kind === 'villager';
    const x = 36 + index * (CONFIG.width - 72) / (count - 1);
    const sprite = this.scene.add.sprite(x, 0, villager ? 'menu_villager_' + id : 'e_skel_warrior', 0)
      .setOrigin(0.5, villager ? 18 / 20 : 22 / 24)
      .setScale(villager ? 0.45 + lane * 0.075 : 0.29 + lane * 0.07 + id % 2 * 0.025).setAlpha(0);
    sprite.actor = {
      kind, id, lane, x, target: x, terrain: [LS.topsA, LS.topsB, LS.topsC][lane],
      offset: id % 4 * (lane + 1), min: 24, max: CONFIG.width - 24,
      speed: 7 + lane * 2 + this.rng() * 4, pause: this.rng() * 0.5,
      defender: villager && id % 3 === 0, direction: id % 2 ? -1 : 1,
      state: 'wander', cooldown: this.rng(), attack: 0, health: 3, gone: 0, struck: false, flash: 0,
    };
    // Mantém os dados de rota acessíveis para inspeção do cenário.
    sprite.wander = sprite.actor;
    if (villager) {
      sprite.lamp = this.scene.add.image(0, 0, 'menu_lantern').setOrigin(0.5, 0).setScale(sprite.scaleX).setAlpha(0);
      sprite.lampGlow = this.scene.add.image(0, 0, 'glow').setTint(0xffbc60)
        .setBlendMode(Phaser.BlendModes.ADD).setScale(0.17 + lane * 0.04).setAlpha(0);
    }
    return sprite;
  }

  nearest(sprite, group) {
    let closest = null, gap = Infinity;
    for (const other of group) {
      if (other.actor.lane !== sprite.actor.lane || other.actor.gone > 0) continue;
      const distance = Math.abs(other.actor.x - sprite.actor.x);
      if (distance < gap) { gap = distance; closest = other; }
    }
    return { sprite: closest, gap };
  }

  move(sprite, direction, speed, dt) {
    const a = sprite.actor;
    if (!direction) return;
    a.direction = Math.sign(direction);
    a.x = clamp(a.x + a.direction * speed * dt, a.min, a.max);
    sprite.setFlipX(a.direction < 0);
  }

  wander(sprite, dt) {
    const a = sprite.actor;
    a.state = 'wander';
    if (a.pause > 0) { a.pause -= dt; return; }
    if (Math.abs(a.target - a.x) < 2) {
      a.target = clamp(a.x + (this.rng() - 0.5) * 440, a.min, a.max);
      a.pause = 0.3 + this.rng() * 1.2;
    } else this.move(sprite, a.target - a.x, Math.min(a.speed, Math.abs(a.target - a.x) / Math.max(dt, 0.001)), dt);
  }

  startAttack(sprite, target) {
    const a = sprite.actor;
    a.state = 'fight';
    a.direction = Math.sign(target.actor.x - a.x) || a.direction;
    sprite.setFlipX(a.direction < 0);
    if (a.cooldown <= 0 && a.attack <= 0) {
      a.attack = 0.38; a.struck = false; a.victim = target;
      a.cooldown = a.kind === 'villager' ? 0.85 + this.rng() * 0.35 : 1.35 + this.rng() * 0.4;
    }
  }

  strike(sprite) {
    const a = sprite.actor, target = a.victim;
    if (!target || target.actor.gone > 0 || Math.abs(target.actor.x - a.x) > 36) return;
    const b = target.actor;
    b.x = clamp(b.x + a.direction * 6, b.min, b.max);
    b.flash = 0.12;
    const spark = this.sparks.find(p => p.life <= 0);
    if (spark) {
      spark.life = 0.24;
      spark.sprite.setPosition((sprite.x + target.x) / 2, target.y - target.displayHeight * 0.5)
        .setDepth(Math.max(sprite.depth, target.depth) + 0.05).setScale(0.45 + a.lane * 0.1).setAlpha(0.9);
    }
    if (b.kind === 'skeleton' && --b.health <= 0) {
      b.gone = 2.6; b.state = 'fallen'; b.attack = 0;
    }
  }

  update(_time, delta) {
    const dt = Math.min(delta || 0, 100) / 1000;
    this.elapsed += dt;
    const phase = lsSample(LS.clock());
    const night = clamp((phase.n - 0.45) / 0.35, 0, 1);
    const dark = night > 0.3;
    this.scene.menuBats.forEach(bat => bat.setAlpha(clamp((phase.n - 0.72) / 0.28, 0, 1)));
    for (const sprite of [...this.villagers, ...this.skeletons]) {
      const a = sprite.actor;
      a.cooldown -= dt; a.flash = Math.max(0, a.flash - dt);
      if (a.gone > 0) {
        a.gone = Math.max(0, a.gone - dt);
        if (a.gone === 0) {
          a.x = this.rng() > 0.5 ? a.min + 8 : a.max - 8;
          a.target = CONFIG.width / 2; a.health = 3; a.state = 'wander'; a.attack = 0;
        }
        this.place(sprite, phase, night);
        continue;
      }
      if (a.attack > 0) {
        a.attack = Math.max(0, a.attack - dt);
        if (a.attack < 0.18 && !a.struck) { a.struck = true; this.strike(sprite); }
      }
      if (!dark) {
        a.attack = 0; a.victim = null;
        this.wander(sprite, dt);
      } else if (a.kind === 'villager') {
        const enemy = this.nearest(sprite, this.skeletons);
        if (a.defender && enemy.sprite && enemy.gap < 270) {
          a.state = 'fight';
          if (enemy.gap > 19 && a.attack <= 0) this.move(sprite, enemy.sprite.actor.x - a.x, a.speed * 1.6, dt);
          else this.startAttack(sprite, enemy.sprite);
        } else if (!a.defender && enemy.sprite && enemy.gap < 190) {
          a.state = 'flee';
          const away = Math.sign(a.x - enemy.sprite.actor.x) || a.direction;
          this.move(sprite, away, a.speed * 3.1, dt);
          if ((a.x === a.min && away < 0) || (a.x === a.max && away > 0)) {
            a.gone = 2; a.state = 'escaped';
          }
        } else this.wander(sprite, dt);
      } else {
        const enemy = this.nearest(sprite, this.villagers);
        if (enemy.sprite && enemy.gap < 240) {
          a.state = 'chase';
          if (enemy.gap > 20 && a.attack <= 0) this.move(sprite, enemy.sprite.actor.x - a.x, a.speed * 1.35, dt);
          else this.startAttack(sprite, enemy.sprite);
        } else this.wander(sprite, dt);
      }
      this.place(sprite, phase, night);
    }
    for (const spark of this.sparks) {
      spark.life = Math.max(0, spark.life - dt);
      spark.sprite.setAlpha(spark.life * 3.5).setRotation(this.elapsed * 2);
    }
  }

  isExposed(sprite, x, y) {
    return !this.occluders.some(({ image, width, height, pixels }) => {
      if (!image.visible || image.alpha === 0 || image.depth <= sprite.depth) return false;
      const px = Math.floor((x - image.x) / image.scaleX + image.displayOriginX);
      const py = Math.floor((y - image.y) / image.scaleY + image.displayOriginY);
      return px >= 0 && px < width && py >= 0 && py < height && pixels[(py * width + px) * 4 + 3] > 128;
    });
  }

  place(sprite, phase, night) {
    const a = sprite.actor, villager = a.kind === 'villager';
    const logicalX = clamp(a.x / LS.SC, 0, LS.W - 2), left = Math.floor(logicalX);
    let ground = lerp(a.terrain[left], a.terrain[left + 1], logicalX - left) * LS.SC + a.offset;
    const villageRoute = a.lane > 0 ? lsSmooth(Math.min(
      clamp((logicalX - 40) / 8, 0, 1), clamp((150 - logicalX) / 8, 0, 1))) : 0;
    ground = lerp(ground, Math.max(ground, LS.villageFrontY * LS.SC + a.offset), villageRoute);
    const depth = villageRoute > 0 ? -6.8 : [-7.9, -7.2, -6.8][a.lane];
    const alpha = villager ? (a.state === 'escaped' && a.gone > 0 ? 0 : 1) : night * (a.gone > 0 ? clamp((a.gone - 2) / 0.6, 0, 1) : 1);
    sprite.setPosition(Math.round(a.x), Math.round(ground)).setDepth(depth).setAlpha(alpha).setFlipX(a.direction < 0);
    const moving = a.state === 'flee' || a.state === 'chase' || (a.state === 'wander' && a.pause <= 0) || (a.state === 'fight' && a.attack <= 0);
    if (villager) {
      const walkFrame = moving ? Math.floor(this.elapsed * (a.state === 'flee' ? 13 : 7) + a.id) % 4 : 0;
      sprite.setFrame(a.attack > 0 ? 4 + Math.min(3, Math.floor((0.38 - a.attack) / 0.095)) : walkFrame);
    } else sprite.setFrame(moving || a.attack > 0 ? Math.floor(this.elapsed * 7 + a.id) % 2 : 0);
    sprite.setAngle(a.state === 'fallen' && a.gone > 0 ? a.direction * 80 : 0);
    const carrying = villager;
    const tint = lsLerpColor(phase.tint, phase.hor, 0.2);
    sprite.setTint(a.flash > 0 ? 0xffefc4 : lsLerpColor(tint, 0xffffff, carrying ? night * 0.3 : night * 0.08));
    if (villager) {
      // A alça se prende à mão livre, do lado oposto à ferramenta.
      // A posição usa o mesmo quadro e espelhamento do corpo, sem oscilação independente.
      const frame = Number(sprite.frame.name);
      const bob = frame < 4 ? frame % 2 : 0;
      const handX = sprite.x + (sprite.flipX ? 1 : -1) * 10 * sprite.scaleX;
      const handY = sprite.y + (-10 + 2 * bob) * sprite.scaleY;
      const exposed = this.isExposed(sprite, sprite.x, sprite.y - sprite.displayHeight * 0.4)
        && this.isExposed(sprite, handX, handY);
      const lampAlpha = night * (a.gone <= 0 && exposed ? alpha : 0);
      sprite.lamp.setPosition(handX, handY).setDepth(depth + 0.03).setAlpha(lampAlpha);
      const flicker = 0.32 + 0.025 * Math.sin(this.elapsed * 8 + a.id);
      sprite.lampGlow.setPosition(handX, handY + sprite.lamp.displayHeight * 0.55)
        .setDepth(depth + 0.02).setAlpha(lampAlpha * flicker);
    }
  }
}
