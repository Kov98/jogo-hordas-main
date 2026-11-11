// A sobreposição tem câmera própria: o zoom do mundo não desloca as barras.
class FinaleOverlayScene extends Phaser.Scene {
  constructor() { super('FinaleOverlay'); }
  create(data = {}) {
    this.add.rectangle(CONFIG.width / 2, 21, CONFIG.width, 42, 0x000000);
    this.add.rectangle(CONFIG.width / 2, CONFIG.height - 21, CONFIG.width, 42, 0x000000);
    this.caption = mkText(this, CONFIG.width / 2, CONFIG.height - 66, data.caption || 'O SILÊNCIO NÃO ERA O FIM.', 19, '#dec9a6').setOrigin(.5);
    // ScenePlugin launches are queued. Callers may see this scene between a
    // shutdown and its next create; never expose the destroyed Text then.
    this.events.once('shutdown', () => { this.caption = null; });
  }
}

// Desfecho do castelo: o mesmo círculo ritual se rompe sob os pés do herói.
class CastleFinale {
  constructor(scene, onComplete) {
    this.scene = scene; this.onComplete = onComplete; this.elapsed = 0;
    this.initialization = scene.initialization;
    this.opening = 0; this.complete = false; this.sparkClock = 0;
    const A = CONFIG.arena, p = scene.player;
    this.A = A; this.start = { x: p.x, y: p.y };
    this.cracks = scene.add.graphics().setDepth(-5006);
    this.void = scene.add.graphics().setDepth(-5005);
    this.rim = scene.add.graphics().setDepth(-5002);
    this.maskShape = scene.make.graphics({ x: 0, y: 0, add: false });
    this.mask = this.maskShape.createGeometryMask();
    SPR.canvas(scene, 'finale_lava', 256, 256, ctx => {
      const rng = mulberry32(0x1af103);
      ctx.fillStyle = '#5f160e'; ctx.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 2) for (let x = 0; x < 256; x += 2) {
        const wave = Math.sin(x * .13 + Math.sin(y * .08) * 2.8) + Math.cos(y * .17 - x * .035);
        ctx.fillStyle = wave > 1.35 ? '#ffce61' : wave > .8 ? '#ff922c' : wave > .15 ? '#d64c13' : wave > -.6 ? '#992b0e' : '#39100e';
        ctx.fillRect(x, y, 2, 2);
        if (rng() < .015) { ctx.fillStyle = '#ffe3a0'; ctx.fillRect(x, y, 1, 1); }
      }
    });
    this.lava = scene.add.tileSprite(A.x, A.y, A.r * 2, A.r * 2, 'finale_lava')
      .setTileScale(4).setDepth(-5004).setMask(this.mask).setVisible(false);
    this.heat = scene.add.image(A.x, A.y, 'glow').setTint(0xff7d20).setScale(9).setAlpha(0)
      .setDepth(-5001).setBlendMode(Phaser.BlendModes.ADD);
    scene.scene.launch('FinaleOverlay');
    this.overlay = scene.scene.get('FinaleOverlay');
    this.paths = [];
    const rng = mulberry32(CONFIG.seed ^ 0xf1ae);
    for (let i = 0; i < 18; i++) {
      const angle = i / 18 * Math.PI * 2, points = [{ x: A.x, y: A.y }];
      for (let j = 1; j <= 11; j++) {
        const r = j / 11 * A.r, a = angle + (rng() - .5) * .16;
        points.push({ x: Math.round((A.x + Math.cos(a) * r) / 4) * 4, y: Math.round((A.y + Math.sin(a) * r) / 4) * 4 });
      }
      this.paths.push(points);
    }
    scene.cameras.main.stopFollow();
    scene.cameras.main.pan(A.x, A.y, 1500, 'Sine.easeInOut');
    scene.cameras.main.zoomTo(.6, 1600);
    scene.cameras.main.shake(1800, .0018);
    p.sprite.clearTint().setAlpha(1).setAngle(0);
    scene.events.once('shutdown', () => {
      this.complete = true; this.onComplete = null;
      scene.scene.stop('FinaleOverlay'); this.mask.destroy(); this.maskShape.destroy();
    });
  }

  polygon(g, radius) {
    const A = this.A;
    g.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = i / 48 * Math.PI * 2, r = radius * (1 + .028 * Math.sin(i * 3.7));
      const x = Math.round((A.x + Math.cos(a) * r) / 4) * 4, y = Math.round((A.y + Math.sin(a) * r) / 4) * 4;
      if (!i) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
  }

  update(dt) {
    if (this.complete) return;
    if (this.scene.initialization !== this.initialization) { this.complete = true; this.onComplete = null; return; }
    this.elapsed += dt;
    const t = this.elapsed, A = this.A, sc = this.scene, p = sc.player;
    const crackProgress = clamp((t - 1.2) / 3.5, 0, 1);
    this.cracks.clear();
    for (const path of this.paths) {
      const count = Math.floor(crackProgress * (path.length - 1));
      if (!count) continue;
      for (const [w, color, alpha] of [[16, 0x11090b, 1], [7, 0xa52d11, .9], [3, 0xffa844, .9]]) {
        this.cracks.lineStyle(w, color, alpha).beginPath().moveTo(path[0].x, path[0].y);
        for (let i = 1; i <= count; i++) this.cracks.lineTo(path[i].x, path[i].y);
        this.cracks.strokePath();
      }
    }
    this.opening = clamp((t - 4.5) / 2.9, 0, 1) * (A.r - 55);
    this.maskShape.clear(); this.void.clear(); this.rim.clear();
    if (this.opening > 0) {
      this.lava.setVisible(true).setTilePosition(Math.floor(t * 8), -Math.floor(t * 13));
      this.void.fillStyle(0x120809, 1); this.polygon(this.void, this.opening + 24); this.void.fillPath();
      this.maskShape.fillStyle(0xffffff, 1); this.polygon(this.maskShape, this.opening); this.maskShape.fillPath();
      this.rim.lineStyle(18, 0x25110e, 1); this.polygon(this.rim, this.opening + 7); this.rim.strokePath();
      this.rim.lineStyle(5, 0xff7620, .85); this.polygon(this.rim, this.opening); this.rim.strokePath();
      this.heat.setAlpha(.09 + Math.sin(t * 11) * .015).setScale(4 + this.opening / 70);
      this.sparkClock -= dt;
      if (this.sparkClock <= 0) {
        this.sparkClock = .12;
        const a = t * 7.3, r = this.opening * .85;
        sc.fx.burst('fire', A.x + Math.cos(a) * r, A.y + Math.sin(a) * r, 7);
      }
    }
    if (t < 6.8) {
      const approach = clamp((t - 1.5) / 4, 0, 1);
      p.x = this.start.x + (A.x - this.start.x) * approach;
      p.y = this.start.y + (A.y + 35 - this.start.y) * approach;
      if (approach > 0 && approach < 1) p.sprite.anims.resume(); else p.sprite.anims.pause();
      p.sprite.setPosition(p.x, p.y).setDepth(p.y + 20);
      p.shadow.setPosition(p.x, p.y + 20);
    } else {
      const fall = clamp((t - 6.8) / 2.5, 0, 1);
      p.sprite.anims.pause(); p.shadow.setVisible(false);
      p.sprite.setPosition(A.x, A.y + 35 + fall * fall * 150).setScale(1 - fall * .94)
        .setRotation(fall * 1.6).setAlpha(1 - fall * fall).setTint(0xffaf6b);
    }
    if (t > 3.5) this.overlay.caption?.setText(t < 7 ? 'O SELO SE ROMPEU.' : 'SOB A ÚLTIMA MURALHA…');
    if (t > 9.4) this.overlay.caption?.setAlpha(clamp((10.8 - t) / 1.4, 0, 1));
    if (t >= 9.4 && !this.fading) { this.fading = true; sc.cameras.main.fadeOut(1400, 0, 0, 0); }
    // Camera effects update before the scene. Catch up the first long frame to
    // the film clock, including a frame that crosses the complete transition.
    const fade = sc.cameras.main.fadeEffect;
    if (t >= 9.4 && fade?.isRunning) fade.update(0, Math.max(0, (t - 9.4) * 1000 - fade.progress * fade.duration));
    if (t >= 11) {
      this.complete = true; sc.scene.stop('FinaleOverlay');
      const complete = this.onComplete; this.onComplete = null; complete?.();
    }
  }
}

// O Arquidemônio cai e as correntes da fornalha deixam de prender as almas.
class SoulFinale {
  constructor(scene,onComplete) {
    this.scene=scene;this.onComplete=onComplete;this.elapsed=0;this.complete=false;
    this.initialization=scene.initialization;this.A=CONFIG.arena;
    this.runes=scene.add.graphics().setDepth(-5000);
    this.light=scene.add.image(this.A.x,this.A.y,'crypt_glow').setBlendMode(Phaser.BlendModes.ADD).setScale(6).setAlpha(.18).setDepth(8400);
    this.souls=[];this.start={x:scene.player.x,y:scene.player.y};
    for(let i=0;i<24;i++){
      const a=i*Math.PI*2/24,r=110+(i%4)*65;
      const image=scene.add.image(this.A.x+Math.cos(a)*r,this.A.y+Math.sin(a)*r,'crypt_soul').setAlpha(0).setDepth(8500);
      this.souls.push({image,a,r});
    }
    scene.cameras.main.stopFollow();scene.cameras.main.pan(this.A.x,this.A.y,1200,'Sine.easeInOut');scene.cameras.main.zoomTo(.82,1500);
    scene.player.sprite.clearTint().setAlpha(1);scene.player.sprite.anims.pause();
    scene.scene.get('FinaleOverlay').caption?.setText('AS CORRENTES DO ARQUIDEMÔNIO CEDEM.');
    scene.events.once('shutdown',()=>{this.complete=true;this.onComplete=null;});
  }
  update(dt) {
    const sc=this.scene;
    if(this.complete||sc.initialization!==this.initialization)return;
    this.elapsed+=dt;const t=this.elapsed,A=this.A,p=sc.player;
    this.runes.clear();
    const release=clamp((t-1.3)/4.5,0,1);
    for(let i=0;i<3;i++){this.runes.lineStyle(3,0xffae62,(1-release)*.45);this.runes.strokeCircle(A.x,A.y,90+i*90+release*140);}
    // Reuse the rune graphics for six breaking chains; no new per-frame objects.
    this.runes.lineStyle(3,0xb88a68,(1-release)*.7);
    for(let arm=0;arm<6;arm++)for(let link=0;link<9;link++){
      const angle=arm*Math.PI/3,along=100+link*30+release*(70+link*9);
      const x=A.x+Math.cos(angle)*along,y=A.y+Math.sin(angle)*along+release*release*(link%2?90:-60);
      this.runes.strokeCircle(x,y,link%2?9:6);
    }
    this.light.setScale(6+release*7).setAlpha(.15+Math.sin(Math.min(t,6)/6*Math.PI)*.22);
    for(let i=0;i<this.souls.length;i++){
      const o=this.souls[i],rise=clamp((t-1-i*.035)/4.8,0,1),a=o.a+t*.16,r=o.r*(1-rise*.7);
      o.image.setPosition(A.x+Math.cos(a)*r,A.y+Math.sin(a)*r-rise*rise*950).setAlpha(Math.sin(rise*Math.PI)*.9).setScale(1+rise*.5);
    }
    const step=clamp((t-1)/3,0,1);p.x=this.start.x+(A.x-this.start.x)*step;p.y=this.start.y+(A.y+70-this.start.y)*step;
    if(step>0&&step<1)p.sprite.anims.resume();else p.sprite.anims.pause();sc.syncCinematicPlayer();
    if(t>4)sc.scene.get('FinaleOverlay').caption?.setText('NENHUMA ALMA PERTENCE À FORNALHA.');
    if(t>=7&&!this.fading){this.fading=true;sc.cameras.main.fadeOut(1800,24,8,7);}
    const fade=sc.cameras.main.fadeEffect;
    if(t>=7&&fade?.isRunning)fade.update(0,Math.max(0,(t-7)*1000-fade.progress*fade.duration));
    if(t>=9){this.complete=true;sc.scene.stop('FinaleOverlay');this.onComplete?.();}
  }
}
