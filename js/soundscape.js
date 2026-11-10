// Ambiência procedural compartilhando o volume de Sfx. O relógio da cena,
// sem setInterval, agenda no máximo dois loops e seis vozes musicais.
class Soundscape {
  constructor(scene) {
    this.scene = scene;
    this.loops = [];
    this.voices = new Set();
    this.owner = Symbol('soundscape');
    this.dead = false; this.paused = false; this.blurred = false;
    this.beat = 0; this.accent = 3; this.step = 0; this.clock = 0;
    this.bindings = [];
    const bind = (emitter, event, fn) => {
      if (!emitter?.on) return;
      emitter.on(event, fn); this.bindings.push(() => emitter.off(event, fn));
    };
    const pause = () => { this.paused = true; this.syncBlock(); };
    const resume = () => { this.paused = false; this.syncBlock(); };
    const blur = () => { this.blurred = true; this.syncBlock(); };
    const focus = () => { this.blurred = false; this.syncBlock(); };
    bind(scene.events, 'pause', pause); bind(scene.events, 'resume', resume);
    bind(scene.events, 'sleep', pause); bind(scene.events, 'wake', resume);
    bind(scene.events, 'shutdown', () => this.destroy());
    bind(scene.game?.events, 'blur', blur); bind(scene.game?.events, 'focus', focus);
    const listen = (target, event, fn) => {
      if (!target?.addEventListener) return;
      target.addEventListener(event, fn); this.bindings.push(() => target.removeEventListener(event, fn));
    };
    listen(window, 'blur', blur); listen(window, 'focus', focus);
    listen(document, 'visibilitychange', () => this.syncBlock());
    // Portal dialogs can also open while another scene owns the Phaser pause.
    if (typeof MutationObserver !== 'undefined' && document.body) {
      this.observer = new MutationObserver(() => this.syncBlock());
      this.observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    this.onMute = () => { if (Sfx.muted) this.silence(); };
    Sfx.listeners.add(this.onMute);
    this.syncBlock();
  }

  blocked() {
    const sc = this.scene;
    return this.dead || this.paused || this.blurred || !!document.hidden || !!sc.ended || !!sc.cinematic || !!sc.transitioning ||
      !!sc.levelUpOpen || !!sc.chestOpen || !!sc.explorationOpen || !!(typeof GamePortal !== 'undefined' && GamePortal.dialogOpen) ||
      !!sc.scene?.isPaused?.();
  }

  syncBlock() {
    const blocked = this.blocked();
    Sfx.setSuspended(this.owner, blocked);
    if (blocked || Sfx.muted) this.silence();
    return blocked;
  }

  dispose(entry, stop = true) {
    this.voices.delete(entry);
    if (stop) { try { entry.source.stop(); } catch (_) {} }
    for (const node of entry.nodes) { try { node.disconnect(); } catch (_) {} }
  }

  silence() {
    for (const entry of this.loops.splice(0)) this.dispose(entry);
    for (const entry of [...this.voices]) this.dispose(entry);
    this.beat = 0; this.accent = 3;
  }

  startLoops() {
    const c = Sfx.ctx;
    const create = (source, volume, filter) => {
      const gain = c.createGain(), nodes = [source, gain];
      gain.gain.setValueAtTime(volume, c.currentTime);
      if (filter) { nodes.push(filter); source.connect(filter); filter.connect(gain); }
      else source.connect(gain);
      gain.connect(Sfx.master);
      const entry = { source, gain, nodes }; this.loops.push(entry);
      source.start();
      return entry;
    };
    try {
      const wind = c.createBufferSource(), filter = c.createBiquadFilter();
      wind.buffer = Sfx.noiseBuf; wind.loop = true;
      filter.type = 'lowpass'; filter.frequency.value = this.scene.stageId === 'forest' ? 420 : this.scene.stageId === 'catacombs' ? 340 : 210;
      create(wind, .035, filter);
      const drone = c.createOscillator(); drone.type = this.scene.stageId === 'catacombs' ? 'triangle' : 'sine';
      drone.frequency.value = this.scene.stageId === 'catacombs' ? 41.2 : this.scene.stageId === 'castle' ? 49 : 55;
      create(drone, .045);
    } catch (_) { this.silence(); }
  }

  note(frequency, duration, volume, type = 'sine', noise = false) {
    if (this.voices.size >= 6 || this.blocked() || Sfx.silent || !Sfx.ctx) return;
    const c = Sfx.ctx, now = c.currentTime;
    let source, gain, filter;
    try {
      source = noise ? c.createBufferSource() : c.createOscillator();
      gain = c.createGain();
      if (noise) {
        source.buffer = Sfx.noiseBuf;
        filter = c.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = 2;
        source.connect(filter); filter.connect(gain);
      } else {
        source.type = type; source.frequency.setValueAtTime(frequency, now); source.connect(gain);
      }
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + .08);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      gain.connect(Sfx.master);
      const entry = { source, nodes: filter ? [source, filter, gain] : [source, gain], until: this.clock + duration + .05 };
      this.voices.add(entry);
      source.onended = () => this.dispose(entry, false);
      source.start(); source.stop(now + duration + .02);
    } catch (_) {
      for (const node of [source, gain, filter]) { try { node?.disconnect(); } catch (_) {} }
    }
  }

  update(dt) {
    if (this.dead) return;
    if (this.syncBlock() || Sfx.muted || !Sfx.ctx) return;
    const step = Math.min(.25, Math.max(0, Number(dt) || 0)); this.clock += step;
    for (const entry of [...this.voices]) if (entry.until <= this.clock) this.dispose(entry);
    if (!this.loops.length) this.startLoops();
    if (this.loops.length !== 2) return;
    const sc = this.scene, p = sc.player;
    let proximity = 0;
    if (p) for (const e of sc.enemies?.pool || []) {
      if (e.alive && Math.hypot(e.x - p.x, e.y - p.y) < 390) proximity = Math.min(1, proximity + .1);
    }
    const fury = !!(sc.boss?.fury || sc.boss?.enraged || (sc.boss?.hp > 0 && sc.boss.hp < sc.boss.maxHp * .35));
    const intensity = Math.min(1, proximity * .5 + (sc.bossStarted || sc.exploration?.getStatus?.().boss ? .6 : 0) + (fury ? .4 : 0));
    try {
      this.loops[0].gain.gain.setValueAtTime(.025 + .02 * Math.sin(this.clock * .23) ** 2, Sfx.ctx.currentTime);
      this.loops[1].gain.gain.setValueAtTime(.04 + .035 * intensity, Sfx.ctx.currentTime);
    } catch (_) { this.silence(); return; }
    this.beat -= step; this.accent -= step;
    if (this.beat <= 0) {
      this.beat = 1.8 - intensity * .85;
      const scale = sc.stageId === 'catacombs' ? [0,1,6,7,0,10,6,1] : sc.stageId === 'castle' ? [0,3,7,2,0,10,7,3] : [0,7,10,5,0,3,7,12];
      const base = sc.stageId === 'catacombs' ? 82.41 : sc.stageId === 'castle' ? 98 : 110;
      const f = base * Math.pow(2, scale[this.step++ % scale.length] / 12);
      this.note(f, 2.6, .055 + intensity * .035, 'triangle');
      if (intensity > .55) this.note(f * 2, 1.25, .035, 'sine');
    }
    if (this.accent <= 0) {
      this.accent = 6 + Math.random() * 7;
      this.note(sc.stageId === 'forest' ? 1200 : 700, .3 + Math.random() * .6, .045, 'sine', true);
    }
  }

  destroy() {
    if (this.dead) return;
    this.dead = true; this.silence();
    for (const unbind of this.bindings.splice(0)) unbind();
    this.observer?.disconnect();
    Sfx.listeners.delete(this.onMute);
    Sfx.setSuspended(this.owner, false);
  }
}
