// Utilitários gerais: aleatório com semente, matemática e grade espacial.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function fmtTime(s) {
  s = Math.max(0, Math.floor(s));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

// Grade espacial: acelera colisões entre muitas entidades.
// Entidades precisam ter x, y, radius.
class Grid {
  constructor(cell) { this.cell = cell; this.map = new Map(); this.used = []; }
  clear() { for (const a of this.used) a.length = 0; this.used.length = 0; }
  _key(cx, cy) { return (cx + 64) * 256 + (cy + 64); }
  insert(e) {
    const k = this._key(Math.floor(e.x / this.cell), Math.floor(e.y / this.cell));
    let a = this.map.get(k);
    if (!a) { a = []; this.map.set(k, a); }
    if (a.length === 0) this.used.push(a);
    a.push(e);
  }
  // Preenche `out` com as entidades cujo círculo toca o círculo (x, y, r).
  query(x, y, r, out) {
    out.length = 0;
    const c = this.cell, m = r + 70; // 70 = maior raio de entidade
    const x0 = Math.floor((x - m) / c), x1 = Math.floor((x + m) / c);
    const y0 = Math.floor((y - m) / c), y1 = Math.floor((y + m) / c);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const a = this.map.get(this._key(cx, cy));
        if (!a) continue;
        for (let i = 0; i < a.length; i++) {
          const e = a[i];
          const dx = e.x - x, dy = e.y - y, rr = r + e.radius;
          if (dx * dx + dy * dy <= rr * rr) out.push(e);
        }
      }
    }
    return out;
  }
}
