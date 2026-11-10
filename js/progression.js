// Chest rewards and transformations. No timers advance while a reward menu is open.
class ProgressionSystem {
  constructor(scene) {
    this.scene = scene; this.chests = []; this.consumed = new Set(); this.completed = new Set(); this.supplemental = new Set();
  }
  canOfferPower(id) { return !!POWERS[id] && POWERS[id].obtainable !== false && !this.consumed.has(id); }
  eligible(recipe) {
    const p = this.scene.player;
    if (!recipe || this.scene.t < 300 || this.completed.has(recipe.id)) return false;
    if (recipe.passive && !(p.passives[recipe.passive] >= 1)) return false;
    if (recipe.kind === 'dash') return p.dashLevel >= 3 && !p.smokeDash;
    return !p.hasPower(recipe.result) && recipe.ingredients.every(id => { const w = p.hasPower(id); return w && w.maxed; });
  }
  getOffers(canEvolve = true) {
    const offers = canEvolve ? PROGRESSION_RECIPES.filter(r => this.eligible(r)).slice(0, 3).map(r => ({ type: 'evolution', id: r.id, key: 'e:' + r.id })) : [];
    const keys = new Set(offers.map(o => o.key));
    // rollChoices knows current slots and passive caps. Filter defensively for callers
    // that still use an older choice roller.
    for (let attempt = 0; offers.length < 3 && attempt < 4; attempt++) {
      for (const o of this.scene.rollChoices()) {
        if (offers.length >= 3) break;
        if (o.type === 'new' && !this.canOfferPower(o.id)) continue;
        const key = o.key || o.type + ':' + (o.id || '');
        if (keys.has(key)) continue;
        keys.add(key); offers.push(o);
      }
    }
    if (!offers.length) offers.push({ type: 'heal', key: 'heal' });
    return offers;
  }
  applyRecipe(id) {
    const recipe = PROGRESSION_RECIPES.find(r => r.id === id);
    if (!this.eligible(recipe)) return false;
    const p = this.scene.player;
    if (recipe.kind === 'dash') {
      if (typeof p.enableSmokeDash !== 'function') return false;
      p.enableSmokeDash();
    } else {
      const ingredients = p.powers.filter(w => recipe.ingredients.includes(w.def.id));
      for (const w of ingredients) w.destroy();
      p.powers = p.powers.filter(w => !recipe.ingredients.includes(w.def.id));
      for (const base of recipe.ingredients) this.consumed.add(base);
      p.addPower(recipe.result);
    }
    this.completed.add(id);
    if (typeof MetaProgress !== 'undefined') MetaProgress.record({type:'evolution',id},this.scene.metaProfileKey);
    return true;
  }
  dropChest(x, y, canEvolve = true) {
    if (this.chests.length >= 8 || this.scene.ended) return null;
    const sc = this.scene, radius = sc.player.radius;
    // Use player clearance so the pickup position is walkable, including arena locks.
    // Recheck after obstacle pushes: a push near a wall can leave the map again.
    const candidates = [{ x, y }, { x: sc.player.x, y: sc.player.y }];
    let position = null;
    for (const candidate of candidates) {
      const point = { ...candidate, radius };
      for (let attempt = 0; attempt < 16; attempt++) {
        const previous = { x: point.x, y: point.y };
        sc.world.constrain(point);
        if (Math.hypot(point.x - previous.x, point.y - previous.y) < .01) {
          const blocked = !sc.world.arenaLock && sc.world.solids.query(point.x, point.y, radius, []).some(o => Math.hypot(point.x - o.x, point.y - o.y) < radius + o.radius - .01);
          if (!blocked) position = point;
          break;
        }
      }
      if (position) break;
    }
    if (!position) return null; // Undelivered supplies retry on the next update.
    ({ x, y } = position);
    const sprite = sc.add.image(x, y, 'progression_chest').setDepth(y + 10);
    const chest = { x, y, canEvolve, sprite }; this.chests.push(chest); return chest;
  }
  update(dt) {
    const sc = this.scene;
    if (sc.levelUpOpen || sc.chestOpen || sc.ended) return;
    for (const t of [180, 420, 720]) if (sc.t >= t && !this.supplemental.has(t)) {
      const p = sc.player;
      if (this.dropChest(p.x + 70, p.y + 20, true)) this.supplemental.add(t);
    }
    for (let i = this.chests.length - 1; i >= 0; i--) {
      const c = this.chests[i];
      c.sprite.setScale(1 + Math.sin(sc.t * 4) * 0.06);
      if (Math.hypot(sc.player.x - c.x, sc.player.y - c.y) > 36) continue;
      if (sc.openEvolutionChest(c)) { c.sprite.destroy(); this.chests.splice(i, 1); break; }
    }
  }
  destroy() { for (const c of this.chests) c.sprite.destroy(); this.chests.length = 0; }
}

function drawProgressionAssets(scene) {
  const colors = { axes: '#aebbd0', frost: '#8eeaff', poison: '#8bcc60', soulblade: '#bdf8e0', tempest: '#a4cfff', inferno: '#ff8845', reaper_axes: '#e2bae8', blizzard: '#c3f5ff', miasma: '#b5db67', celestial_ring: '#ffdd81', singularity: '#c393ee', smoke_dash: '#aab6c9', cyclone: '#b9ead9', radiant_beam: '#ffe4a0', plasma: '#5aeaff', meteor: '#ff9a43', fire_hurricane: '#ff9951', celestial_judgment: '#fff2bb', plasma_storm: '#76efff', meteor_cataclysm: '#ff6e43', twin_seal: '#dfb374', blood_oath: '#d45c75', glass_heart: '#c5e9f2', restless_clock: '#e2ce93', pilgrim_chain: '#a8b4cc', ashen_cup: '#b9a0a0' };
  for (const [id, color] of Object.entries(colors)) {
    SPR.make(scene, 'i_' + id, 16, 16, 1, 3, P => {
      P.r(1, 1, 14, 14, '#171323'); P.r(2, 2, 12, 1, '#4b3f61');
      if (id === 'fire_hurricane') { P.r(3, 4, 10, 2, color); P.r(4, 7, 8, 2, '#ca4f30'); P.r(6, 10, 5, 2, color); P.r(7, 12, 2, 2, '#fff1ac'); P.line(3, 10, 3, 6, '#ffc365'); P.line(12, 9, 12, 3, '#fff1ac'); }
      else if (id === 'celestial_judgment') { P.line(5, 3, 5, 12, '#b98743', 3); P.line(8, 2, 8, 13, color, 2); P.line(11, 3, 11, 12, '#b98743', 3); P.line(3, 12, 13, 12, color, 2); P.p(8, 1, '#ffffff'); }
      else if (id === 'plasma_storm') { P.line(4, 5, 12, 6, color); P.line(12, 6, 8, 12, color); P.line(8, 12, 4, 5, color); for (const [x,y] of [[4,5],[12,6],[8,12]]) { P.disc(x, y, 3, '#2879b7'); P.disc(x, y, 2, color); P.p(x,y,'#ffffff'); } }
      else if (id === 'meteor_cataclysm') { P.line(3, 2, 7, 8, color, 2); P.line(8, 2, 12, 8, '#ffbe6e', 2); P.disc(7, 9, 3, color); P.disc(12, 9, 2, '#9c463f'); P.line(2, 13, 13, 13, '#ffbd67', 2); }
      else if (id === 'twin_seal') { P.disc(5,8,4,color); P.disc(11,8,4,color); P.disc(5,8,2,'#4c3540'); P.disc(11,8,2,'#4c3540'); P.line(6,7,10,9,'#fff2ca'); }
      else if (id === 'blood_oath') { P.line(8,2,4,10,color,3); P.line(8,2,12,10,color,3); P.disc(8,10,4,color); P.line(8,7,8,12,'#ffe2df'); }
      else if (id === 'glass_heart') { P.disc(5,6,3,color); P.disc(10,6,3,color); P.line(3,7,8,13,color,3); P.line(12,7,8,13,color,3); P.line(8,4,6,8,'#537d9d'); P.line(6,8,9,10,'#537d9d'); }
      else if (id === 'restless_clock') { P.disc(8,8,6,color); P.disc(8,8,4,'#403346'); P.line(8,4,8,8,'#fff2ca'); P.line(8,8,11,6,'#fff2ca'); P.r(6,1,4,2,color); }
      else if (id === 'pilgrim_chain') { for (let n=0;n<3;n++) { P.disc(5+n*3,4+n*4,3,color); P.disc(5+n*3,4+n*4,1,'#282333'); } }
      else if (id === 'ashen_cup') { P.r(4,4,8,5,color); P.r(5,8,6,2,'#857078'); P.r(7,9,2,3,color); P.r(4,12,8,2,color); P.r(6,3,4,2,'#e9d4cb'); P.p(9,1,'#e9d4cb'); }
      else if (id === 'cyclone') { P.r(3, 4, 10, 2, color); P.r(4, 7, 8, 2, '#6caeab'); P.r(6, 10, 5, 2, color); P.r(7, 12, 2, 2, '#effff6'); P.r(4, 4, 5, 1, '#f2fff5'); }
      else if (id === 'radiant_beam') { P.line(8, 1, 8, 12, '#b98239', 5); P.line(8, 1, 8, 12, color, 3); P.line(9, 1, 9, 12, '#ffffff', 1); P.line(3, 13, 13, 13, color); P.p(5, 12, '#fff9de'); P.p(11, 12, '#fff9de'); }
      else if (id === 'plasma') { P.line(3, 12, 9, 6, '#277fbb', 3); P.disc(9, 7, 5, '#196ca0'); P.disc(9, 7, 4, color); P.disc(9, 7, 2, '#f4ffff'); P.p(13, 11, color); P.p(3, 5, color); }
      else if (id === 'meteor') { P.line(3, 3, 10, 10, '#d6542d', 4); P.line(6, 3, 11, 9, '#ffc66a', 2); P.disc(10, 10, 4, color); P.disc(10, 10, 2, '#5b3943'); P.p(12, 9, '#ffe2a2'); }
      else if (id.includes('axes')) { P.line(5, 13, 10, 3, '#8b6849', 2); P.r(5, 3, 7, 4, color); P.r(4, 4, 2, 4, color); P.r(10, 3, 3, 6, color); }
      else if (id === 'frost' || id === 'blizzard') { P.line(8, 3, 8, 13, color); P.line(3, 5, 12, 11, color); P.line(3, 11, 12, 5, color); P.r(7, 6, 3, 4, '#f1ffff'); }
      else if (id === 'poison' || id === 'miasma' || id === 'smoke_dash') { P.disc(6, 8, 3, color); P.disc(10, 7, 3, color); P.disc(9, 11, 3, color); P.p(5, 7, '#f0ffd6'); }
      else if (id === 'soulblade') { P.line(5, 12, 11, 3, color, 2); P.line(4, 9, 9, 12, '#b9904a'); }
      else if (id === 'tempest') { P.line(10, 3, 5, 8, color, 2); P.line(5, 8, 10, 8, color, 2); P.line(10, 8, 6, 13, color, 2); }
      else { P.disc(8, 8, 5, color); P.disc(8, 8, 3, '#24192f'); P.r(7, 2, 2, 3, '#fff2d5'); P.r(7, 11, 2, 3, color); }
    });
    if (['axes', 'reaper_axes', 'celestial_ring'].includes(id)) SPR.make(scene, 'p_' + id, 16, 16, 1, 2, P => {
      if (id === 'celestial_ring') { P.disc(8, 8, 6, color); P.disc(8, 8, 4, '#352542'); P.line(8, 0, 8, 15, '#fff3cc'); P.line(0, 8, 15, 8, '#fff3cc'); return; }
      P.line(4, 13, 11, 2, '#9f7953', 2); P.r(5, 3, 8, 4, color); P.r(3, 4, 3, 5, color); P.r(11, 2, 3, 7, color); P.line(5, 3, 12, 3, '#ffffff');
    });
    if (['poison','inferno','miasma','singularity'].includes(id)) SPR.make(scene, 'fx_' + id, 24, 24, 1, 2, P => {
      P.disc(12, 12, 11, '#251b30'); P.disc(12, 12, 9, color); P.disc(12, 12, 6, '#302339');
      for (let i = 0; i < 6; i++) P.disc(12 + Math.round(Math.cos(i) * 8), 12 + Math.round(Math.sin(i) * 8), 2, color);
    });
  }
  // Shaded volume and a continuous six-turn helix, shared with the fire evolution.
  // Individual sheets keep the footprint, wind and orbiting debris reusable.
  const drawFunnel = (P, f, frames, fire = false) => {
    const phase = f / frames * Math.PI * 2;
    const col = fire
      ? ['#432933', '#8b3c35', '#d86436', '#ffad52', '#ffe7a6', '#fff7da']
      : ['#203844', '#38636e', '#62958f', '#a8d5c6', '#e1f8e3', '#ffffff'];
    for (let y = 12; y <= 65; y++) {
      const t = (y - 12) / 53, half = Math.round(25 * Math.pow(1 - t, .78) + 3);
      const cx = 32 + Math.round(Math.sin(t * 8 + phase) * 2);
      P.r(cx - half, y, half * 2, 1, col[0]);
      P.r(cx - half + 2, y, half * 2 - 4, 1, col[1]);
      P.r(cx - half + 3, y, Math.max(2, half * .9), 1, col[2]);
      if (y % 4 < 2) P.r(cx - 2, y, 3, 1, col[3]);
    }
    for (let n = 0; n < 250; n++) {
      const t = n / 249, angle = t * Math.PI * 12.4 - phase;
      const radius = 25 * Math.pow(1 - t, .78) + 3;
      const x = 32 + Math.cos(angle) * radius + Math.sin(t * 8 + phase) * 2;
      const y = 10 + t * 55 + Math.sin(angle) * 3;
      const front = Math.sin(angle) > -.1;
      P.r(Math.round(x), Math.round(y), front ? 3 : 2, front ? 3 : 2, front ? col[3] : col[0]);
      if (front && Math.cos(angle) < .35) P.r(Math.round(x), Math.round(y), 2, 1, col[4]);
    }
    // Open eye at the crown, with a dark far rim and a bright near rim.
    for (let n = 0; n < 52; n++) {
      const a = n * Math.PI / 26, x = Math.round(32 + Math.cos(a) * 25);
      const y = Math.round(11 + Math.sin(a) * 5);
      P.r(x, y, 2, 2, Math.sin(a) > 0 ? col[4] : col[0]);
    }
    P.line(30, 62, 33, 67, col[4], 2); P.p(32, 65, col[5]);
    if (fire) for (let n = 0; n < 5; n++) {
      const x = 12 + n * 9 + Math.sin(phase + n) * 2, y = 10 + n % 2 * 8;
      P.line(x, y, x + 3, y - 5 - (n + f) % 3, col[3], 2); P.p(x + 3, y - 4, col[5]);
    }
  };
  SPR.make(scene, 'fx_cyclone', 64, 80, 8, 2, (P, f) => drawFunnel(P, f, 8));
  SPR.make(scene, 'fx_cyclone_ground', 64, 64, 8, 2, (P, f) => {
    P.disc(32, 32, 29, 'rgba(8,18,26,0.24)');
    P.disc(32, 32, 21, 'rgba(8,18,26,0.28)');
    for (let arm = 0; arm < 3; arm++) for (let n = 0; n < 44; n++) {
      const t = n / 43, a = arm * Math.PI * 2 / 3 + t * 3.8 - f * Math.PI / 4;
      const r = 6 + t * 23;
      P.r(Math.round(32 + Math.cos(a) * r), Math.round(32 + Math.sin(a) * r), 2, 1,
        n < 24 ? '#477a80' : n < 37 ? '#91c5b5' : '#d5edcd');
    }
    for (let n = 0; n < 40; n++) {
      const a = n * Math.PI / 20;
      if ((n + f) % 5 < 3) P.p(Math.round(32 + Math.cos(a) * 30), Math.round(32 + Math.sin(a) * 30), '#6bada4');
    }
  });
  SPR.make(scene, 'fx_cyclone_wind', 64, 80, 8, 2, (P, f) => {
    for (let arm = 0; arm < 4; arm++) for (let n = 0; n < 24; n++) {
      const a = f * Math.PI / 4 + arm * 1.7 + n * .055;
      const r = 29 - arm * 5, y = 13 + arm * 13;
      P.r(Math.round(32 + Math.cos(a) * r), Math.round(y + Math.sin(a) * 4), 2, 1,
        n > 16 ? '#edffe7' : '#719f9b');
    }
    const x = 9 + (f * 7) % 43;
    P.line(x, 6, x + 5, 4, '#d7f0da'); P.line(53 - x / 2, 49, 57 - x / 2, 43, '#a5dccc');
  });
  SPR.make(scene, 'fx_cyclone_debris', 64, 80, 8, 2, (P, f) => {
    for (let n = 0; n < 6; n++) {
      const a = f * Math.PI / 4 + n * 2.1, radius = 28 - n * 3.1;
      const x = Math.round(32 + Math.cos(a) * radius), y = Math.round(13 + n * 8 + Math.sin(a) * 5);
      P.line(x - Math.sin(a) * 4, y + Math.cos(a) * 2, x, y, '#7caca4');
      P.r(x - 1, y, 4, 3, n % 2 ? '#43555e' : '#6e694e');
      P.r(x, y, 2, 1, n % 2 ? '#b2c4bf' : '#d7c88a');
      if (n % 2 === 0) P.line(x, y, x + 2, y - 2, '#b6c581');
    }
  });
  SPR.make(scene, 'fx_radiant_beam', 160, 24, 8, 1, (P, f) => {
    P.r(0, 0, 160, 24, '#614321'); P.r(0, 2, 160, 20, '#ab7632');
    P.r(0, 4, 160, 16, '#e5b65a'); P.r(0, 7, 160, 10, '#fff0b4');
    P.r(0, 10, 160, 4, '#ffffff');
    for (let n = 0; n < 12; n++) {
      const x = (n * 17 + f * 9) % 157;
      P.r(x, 1, 7, 1, '#ffda80'); P.r((x + 13) % 154, 22, 6, 1, '#ffda80');
      P.line(x, 5, x + 9, 8, '#fff9de'); P.line(x - 5, 18, x + 4, 15, '#ffe59b');
      P.r((x + 41) % 153, 11, 7, 2, '#ffffff');
    }
    P.r(0, 7, 3, 10, '#ffffff'); P.r(157, 8, 3, 8, '#fff9de');
  });
  SPR.make(scene, 'fx_radiant_halo', 160, 40, 8, 1, (P, f) => {
    P.r(0, 6, 160, 28, '#39271b'); P.r(0, 10, 160, 20, '#715027');
    P.r(0, 14, 160, 12, '#c68c42'); P.r(0, 18, 160, 4, '#ffe8a3');
    for (let n = 0; n < 10; n++) {
      const x = (n * 19 + f * 7) % 148, offset = (n + f) % 3;
      P.line(x, 5 - offset, x + 12, 7, '#6f4c27'); P.line(x + 4, 33, x + 15, 35 + offset, '#6f4c27');
    }
  });
  SPR.make(scene, 'fx_radiant_source', 48, 48, 8, 1, (P, f) => {
    P.disc(24, 24, 13, '#58401e'); P.disc(24, 24, 9, '#b58d42');
    for (let n = 0; n < 8; n++) {
      const a = n * Math.PI / 4 + f * Math.PI / 32, reach = n % 2 ? 17 : 22;
      P.line(24 + Math.cos(a) * 8, 24 + Math.sin(a) * 8, 24 + Math.cos(a) * reach, 24 + Math.sin(a) * reach, '#c99b46', 2);
      P.line(24 + Math.cos(a) * 6, 24 + Math.sin(a) * 6, 24 + Math.cos(a) * (reach - 3), 24 + Math.sin(a) * (reach - 3), '#fff0ad');
    }
    for (let n = 0; n < 36; n++) {
      const a = n * Math.PI / 18 - f * Math.PI / 16;
      if (n % 9 < 6) P.p(Math.round(24 + Math.cos(a) * 15), Math.round(24 + Math.sin(a) * 15), '#ffe2a0');
    }
    P.disc(24, 24, 6, '#ffe5a0'); P.disc(24, 24, 3, '#ffffff');
    P.line(14, 24, 34, 24, '#fff9db'); P.line(24, 14, 24, 34, '#fff9db');
  });
  SPR.make(scene, 'fx_radiant_seal', 64, 64, 8, 1, (P, f) => {
    // The outer gold boundary is the circular damage footprint in world space.
    for (let n = 0; n < 160; n++) {
      const a = n * Math.PI / 80;
      P.p(Math.round(31.5 + Math.cos(a) * 31), Math.round(31.5 + Math.sin(a) * 31), '#ffe9ac');
      if ((n + f * 3) % 20 < 13) P.p(Math.round(31.5 + Math.cos(a) * 26), Math.round(31.5 + Math.sin(a) * 26), '#bb8b42');
    }
    for (let n = 0; n < 8; n++) {
      const a = n * Math.PI / 4, x = 31.5 + Math.cos(a) * 20, y = 31.5 + Math.sin(a) * 20;
      P.line(x - Math.sin(a) * 3, y + Math.cos(a) * 3, x + Math.sin(a) * 3, y - Math.cos(a) * 3, '#ffe2a0');
      P.line(x, y, 31.5 + Math.cos(a) * 23, 31.5 + Math.sin(a) * 23, '#fff6d7');
    }
    P.line(27, 32, 37, 32, '#ffe8a4'); P.line(32, 27, 32, 37, '#ffe8a4');
    P.disc(32, 32, 2, '#fff9de');
  });
  SPR.make(scene, 'fx_radiant_mote', 20, 12, 8, 1, (P, f) => {
    const pulse = f % 4 < 2 ? 0 : 1;
    P.line(1, 6, 17, 6, '#9f7435'); P.line(5, 5, 15, 5, '#ffe19a');
    P.line(8, 6, 17, 6, '#ffffff'); P.line(12, 2 + pulse, 12, 9 - pulse, '#fff3c4');
    P.r(11, 5, 3, 3, '#ffffff');
  });
  SPR.make(scene, 'fx_radiant_impact', 48, 48, 8, 1, (P, f) => {
    for (let n = 0; n < 8; n++) {
      const a = n * Math.PI / 4 + f * .055, r = 12 + f;
      P.line(24 + Math.cos(a) * 7, 24 + Math.sin(a) * 7, 24 + Math.cos(a) * r, 24 + Math.sin(a) * r, '#c48d3b', 2);
      P.p(Math.round(24 + Math.cos(a) * (r + 2)), Math.round(24 + Math.sin(a) * (r + 2)), '#fff0ad');
    }
    for (let n = 0; n < 24; n++) {
      const a = n * Math.PI / 12;
      if ((n + f) % 4 < 2) P.p(Math.round(24 + Math.cos(a) * (10 + f)), Math.round(24 + Math.sin(a) * (10 + f)), '#ffe2a0');
    }
    P.disc(24, 24, Math.max(2, 7 - f), '#ffe3a0'); P.disc(24, 24, Math.max(1, 4 - f / 2), '#ffffff');
    P.line(14 + f, 24, 34 - f, 24, '#fff8d3'); P.line(24, 14 + f, 24, 34 - f, '#fff8d3');
  });
  SPR.make(scene, 'p_plasma', 24, 18, 4, 2, (P, f) => {
    P.line(0, 8, 11, 8, '#195a97', 3);
    P.line(2, 6 + f % 2, 8, 10 - f % 2, '#58cdec');
    P.disc(13, 9, 7, '#174b80'); P.disc(13, 9, 6, '#279bcc');
    P.disc(13, 9, 4, '#6ff5ff'); P.disc(14, 8, 2, '#f1ffff');
    const a = f * Math.PI / 2;
    P.line(13 + Math.cos(a) * 4, 9 + Math.sin(a) * 4, 13 + Math.cos(a + .6) * 8, 9 + Math.sin(a + .6) * 8, '#caffff');
    P.p(2 + f, 13 - f, '#88efff');
  });
  SPR.make(scene, 'p_meteor', 28, 40, 1, 2, P => {
    P.line(4, 0, 18, 28, '#9b3428', 7); P.line(10, 2, 22, 29, '#f77936', 5);
    P.line(13, 9, 22, 29, '#ffc56a', 3); P.line(2, 12, 13, 29, '#f77936', 3);
    P.disc(18, 30, 9, '#b44d30'); P.disc(18, 30, 7, '#ffbc55');
    P.disc(19, 31, 5, '#61404a'); P.r(15, 27, 5, 3, '#977168');
    P.line(16, 31, 20, 34, '#ef783d', 2); P.p(22, 28, '#ffedb5');
  });
  SPR.make(scene, 'fx_meteor_mark', 48, 48, 4, 2, (P, f) => {
    for (let n = 0; n < 36; n++) {
      const a = n * Math.PI / 18;
      const x = Math.round(24 + Math.cos(a) * 21), y = Math.round(24 + Math.sin(a) * 21);
      P.r(x, y, 2, 2, n % 3 === f % 3 ? '#ffe1a4' : '#b77535');
    }
    for (let n = 0; n < 4; n++) {
      const a = n * Math.PI / 2 + f * .08;
      P.line(24 + Math.cos(a) * 12, 24 + Math.sin(a) * 12, 24 + Math.cos(a) * 17, 24 + Math.sin(a) * 17, '#ffe1a4', 2);
    }
    P.line(20, 24, 28, 24, '#e8b16b'); P.line(24, 20, 24, 28, '#e8b16b');
  });
  SPR.make(scene, 'fx_fire_hurricane', 64, 80, 4, 2, (P, f) => drawFunnel(P, f, 4, true));
  SPR.make(scene, 'fx_fire_hurricane_embers', 48, 32, 4, 2, (P, f) => {
    P.disc(24,17,13,'#342029'); P.line(7,21,40,21,'#95412f',5); P.line(10,17,37,17,'#c56135',3);
    for (let n=0;n<7;n++) { const x=8+n*5,y=18+(n%2)*4; P.r(x,y,3,2,'#f2a44e'); P.line(x,y,x+1,y-3-((n+f)%3)*2,'#ffcf7e',2); }
  });
  SPR.make(scene, 'fx_celestial_judgment', 48, 128, 4, 2, (P, f) => {
    P.r(5,0,38,120,'#43331f'); P.r(9,0,30,122,'#96703a'); P.r(14,0,20,124,'#dfbf70');
    P.r(18,0,12,125,'#fff0b2'); P.r(22,0,4,126,'#ffffff');
    for (let n=0;n<10;n++) {
      const y=(n*17+f*13)%118, x=n%2?10:36;
      P.line(x,y,x+(n%2?5:-5),y+9,'#fff2b5',2); P.p(x+(n%2?-3:3),y+4,'#ffe19a');
    }
    for (let n=0;n<28;n++) {
      const a=n*Math.PI/14, r=18+(n%3===f%3?2:0);
      P.r(Math.round(24+Math.cos(a)*r),Math.round(121+Math.sin(a)*4),2,1,'#ffe6a4');
    }
    P.line(3,123,45,123,'#fff4d0',3); P.line(24,108,24,127,'#fff8da',2); P.disc(24,121,4,'#ffffff');
  });
  SPR.make(scene, 'p_plasma_storm', 32, 32, 4, 2, (P,f) => {
    P.disc(16,16,12,'#174765'); P.disc(16,16,9,'#3289ad'); P.disc(16,16,6,'#6feeff'); P.disc(16,16,3,'#f4ffff');
    for (let n=0;n<3;n++) { const a=n*Math.PI*2/3+f*Math.PI/2; P.line(16+Math.cos(a)*7,16+Math.sin(a)*7,16+Math.cos(a+.3)*15,16+Math.sin(a+.3)*15,'#b5f9ff',2); }
  });
  SPR.make(scene, 'p_meteor_cataclysm', 40, 56, 1, 2, P => {
    P.line(5,0,26,40,'#9b3437',10); P.line(13,2,29,40,'#f16a35',7); P.line(20,10,29,40,'#ffd58a',4);
    P.disc(26,42,12,'#ec8850'); P.disc(26,42,9,'#6d3942'); P.disc(26,42,6,'#a05849');
    P.line(21,35,25,41,'#ffd599',2); P.line(25,41,33,45,'#f18d48',2);
  });
  SPR.make(scene, 'fx_cataclysm_wave', 64, 64, 4, 2, (P,f) => {
    for (let n=0;n<48;n++) {
      const a=n*Math.PI/24,r=28+(n%3===f%3?2:0),x=32+Math.cos(a)*r,y=32+Math.sin(a)*r;
      P.r(x,y,3,3,n%3===f%3?'#ffe2a1':'#b85a3e');
      if (n%4===f) P.line(32+Math.cos(a)*22,32+Math.sin(a)*22,x,y,'#f4a05a',2);
    }
  });
  SPR.make(scene, 'progression_chest', 20, 16, 1, 2, P => {
    P.r(2, 5, 16, 10, '#1c1426'); P.r(3, 6, 14, 8, '#65435e'); P.r(4, 3, 12, 4, '#9c6c6b');
    P.r(3, 7, 14, 2, '#d6ac61'); P.r(5, 4, 2, 10, '#bd9857'); P.r(13, 4, 2, 10, '#bd9857');
    P.r(8, 7, 4, 5, '#edce83'); P.r(9, 8, 2, 2, '#35263f');
  });
}
