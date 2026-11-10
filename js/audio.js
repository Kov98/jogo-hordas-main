// ============================================================
//  ÁUDIO — efeitos sonoros sintetizados (WebAudio), sem arquivos.
//  Sfx.play('nome'). Tecla M liga/desliga. Falhas de áudio nunca
//  quebram o jogo (tudo protegido por try/catch).
// ============================================================
const Sfx = {
  ctx: null, master: null, _muted: false, last: {}, noiseBuf: null,
  blocked: new Set(), nodes: new Set(), listeners: new Set(),

  get muted() { return this._muted; },
  set muted(value) {
    this._muted = !!value;
    this.applyMaster();
    if (this._muted) this.stopAll();
    for (const notify of this.listeners) { try { notify(); } catch (_) {} }
  },
  get silent() { return this._muted || this.blocked.size > 0; },
  applyMaster() {
    if (!this.master || !this.ctx) return;
    try {
      // Master volume is a switch, not an envelope. Clear prior automation so
      // its last rendered value cannot mask mute while the audio clock stalls.
      this.master.gain.cancelScheduledValues(0);
      this.master.gain.value = this.silent ? 0 : 0.22;
    } catch (_) { this.master.gain.value = this.silent ? 0 : 0.22; }
  },
  setSuspended(owner, suspended) {
    if (suspended) this.blocked.add(owner); else this.blocked.delete(owner);
    this.applyMaster();
    if (suspended) this.stopAll();
  },
  track(source, nodes) {
    const entry = { source, nodes };
    this.nodes.add(entry);
    source.onended = () => {
      this.nodes.delete(entry);
      for (const node of nodes) { try { node.disconnect(); } catch (_) {} }
    };
  },
  stopAll() {
    for (const entry of [...this.nodes]) {
      try { entry.source.stop(); } catch (_) {}
      for (const node of entry.nodes) { try { node.disconnect(); } catch (_) {} }
    }
    this.nodes.clear();
  },

  resume() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.applyMaster();
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate * 0.5;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { /* sem áudio */ }
  },

  toggle() { this.muted = !this.muted; return this.muted; },

  tone(f0, f1, dur, type, vol, delay) {
    if (this.silent || !this.ctx) return;
    const c = this.ctx, t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    this.track(o, [o, g]);
    o.start(t); o.stop(t + dur + 0.02);
  },

  noise(dur, vol, freq) {
    if (this.silent || !this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    s.buffer = this.noiseBuf; f.type = 'lowpass'; f.frequency.value = freq || 900;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    this.track(s, [s, f, g]);
    s.start(t); s.stop(t + dur);
  },

  GAP: { hurt: 120, boom: 90, kill: 70, zap: 90, warn: 200, pick: 60, shot: 70 },

  play(name) {
    if (this.silent || !this.ctx) return;
    try {
      const now = performance.now(), gap = this.GAP[name] || 0;
      if (gap && now - (this.last[name] || 0) < gap) return;
      this.last[name] = now;
      switch (name) {
        case 'hurt':    this.tone(220, 80, 0.18, 'sawtooth', 0.5); break;
        case 'kill':    this.tone(300, 120, 0.07, 'square', 0.12); break;
        case 'boom':    this.noise(0.28, 0.6, 700); this.tone(120, 40, 0.25, 'sine', 0.5); break;
        case 'zap':     this.tone(900, 200, 0.12, 'sawtooth', 0.18); break;
        case 'shot':    this.tone(700, 300, 0.06, 'triangle', 0.15); break;
        case 'pick':    this.tone(700, 1100, 0.05, 'square', 0.08); break;
        case 'warn':    this.tone(180, 140, 0.25, 'square', 0.25); break;
        case 'ui':      this.tone(520, 780, 0.07, 'square', 0.2); break;
        case 'levelup': [440, 554, 659, 880].forEach((f, i) => this.tone(f, f, 0.14, 'square', 0.22, i * 0.09)); break;
        case 'boss':    this.tone(90, 35, 1.2, 'sawtooth', 0.7); this.noise(1.0, 0.5, 400); break;
        case 'fury':    this.tone(70, 30, 1.0, 'sawtooth', 0.7); this.tone(140, 60, 1.0, 'square', 0.3); break;
        case 'win':     [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, f, 0.22, 'square', 0.25, i * 0.13)); break;
        case 'lose':    [330, 262, 196, 130].forEach((f, i) => this.tone(f, f * 0.9, 0.3, 'sawtooth', 0.3, i * 0.2)); break;
      }
    } catch (e) { /* ignora */ }
  },
};
window.addEventListener('pointerdown', () => Sfx.resume());
window.addEventListener('keydown', () => Sfx.resume());
