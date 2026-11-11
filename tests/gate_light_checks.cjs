// Runs the production pixel pen, forest textures and world builder without a browser.
// Catches a dark/outlined core, a white rectangle over masonry, tinting the white
// core grey, and portal light leaking into the still-closed gate.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const textures = new Map();
const gradients = new Map();
const context = vm.createContext({ Math, console, Phaser: { BlendModes: { ADD: 1 } } });
for (const file of ['config.js', 'util.js', 'sprites.js', 'forest-art.js', 'map.js', 'forest.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context, { filename: file });
}
context.captureTexture = (scene, key, w, h, frames, scale, draw) => textures.set(key, { w, h, scale, draw });
context.captureCanvas = (scene, key, w, h, draw) => {
  if (key !== 'forest_glow_white') return;
  const stops = [];
  draw({ createRadialGradient: () => ({ addColorStop: (offset, color) => stops.push({ offset, color }) }), fillRect() {} });
  gradients.set(key, stops);
};
vm.runInContext('SPR.make = captureTexture; SPR.canvas = captureCanvas; drawForestAssets({});', context);

function raster(key) {
  const texture = textures.get(key);
  assert.ok(texture, 'Missing procedural texture: ' + key);
  const pixels = Array(texture.w * texture.h).fill(null);
  let points = [];
  const color = value => /^#[\da-f]{3}$/i.test(value) ? '#' + value.slice(1).split('').map(c => c + c).join('').toLowerCase() : value.toLowerCase();
  const graphics = {
    fillStyle: '#000000',
    fillRect(x, y, w, h) {
      for (let yy = Math.max(0, Math.ceil(y)); yy < Math.min(texture.h, y + h); yy++) {
        for (let xx = Math.max(0, Math.ceil(x)); xx < Math.min(texture.w, x + w); xx++) pixels[yy * texture.w + xx] = color(this.fillStyle);
      }
    },
    beginPath() { points = []; },
    moveTo(x, y) { points.push([x, y]); },
    lineTo(x, y) { points.push([x, y]); },
    closePath() {},
    fill() {
      for (let y = 0; y < texture.h; y++) for (let x = 0; x < texture.w; x++) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const a = points[i], b = points[j], px = x + .5, py = y + .5;
          if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
        }
        if (inside) pixels[y * texture.w + x] = color(this.fillStyle);
      }
    },
  };
  context.rasterGraphics = graphics;
  context.drawTexture = texture.draw;
  vm.runInContext(`drawTexture(makePen(rasterGraphics, ${texture.w}, ${texture.h}), 0);`, context);
  return { ...texture, pixels, at: (x, y) => pixels[y * texture.w + x] };
}

const open = raster('forest_gate_open');
// Hand-checked visible spans, after the arch stones and jamb bases cover their
// edges. This checks every interior pixel, including the narrow stepped crown.
const opening = new Set();
for (const [fromY, toY, fromX, toX] of [
  [88, 88, 125, 129], [89, 89, 125, 130], [90, 91, 122, 137],
  [92, 95, 118, 137], [96, 97, 114, 145], [98, 104, 110, 145],
  [105, 106, 108, 151], [107, 148, 104, 151], [149, 153, 107, 148],
]) {
  for (let y = fromY; y <= toY; y++) for (let x = fromX; x <= toX; x++) {
    opening.add(y * open.w + x);
    assert.equal(open.at(x, y), '#ffffff', `Open gate must be solid white at ${x},${y}`);
  }
}
for (let i = 0; i < open.pixels.length; i++) {
  if (!opening.has(i)) assert.notEqual(open.pixels[i], '#ffffff', `White core spills over the stone frame at ${i % open.w},${Math.floor(i / open.w)}`);
}
const dark = raster('forest_gate_dark');
const closed = raster('forest_gate_closed');
for (const i of opening) {
  assert.notEqual(dark.pixels[i], '#ffffff', 'Closed gate backing must remain dark');
  assert.notEqual(closed.pixels[i], '#ffffff', 'Closed gate must not show portal light');
}
for (let i = 0; i < open.pixels.length; i++) {
  if (!opening.has(i)) assert.equal(open.pixels[i], dark.pixels[i], 'Opening the white core must preserve the stone facade');
}
assert.equal(open.scale, 3, 'Door stays on the original pixel-art grid');
console.log(`OK: all ${opening.size} aperture pixels are pure white; the complete stone frame stays intact and closed variants stay dark`);

const stops = gradients.get('forest_glow_white');
assert.ok(stops?.length >= 3, 'White portal needs a soft radial halo');
for (const stop of stops) {
  const rgba = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(stop.color);
  assert.ok(rgba, 'Expected an RGBA portal halo color');
  assert.deepEqual(rgba.slice(1, 4).map(Number), [255, 255, 255], 'Portal halo must stay neutral white');
}
assert.equal(Number(/,\s*([\d.]+)\s*\)$/.exec(stops.at(-1).color)[1]), 0, 'Portal halo must fade to transparent');
console.log('OK: portal halo fades from neutral white to transparent');

const scene = {
  children: { list: [] }, add: {},
  cameras: { main: { worldView: { x: 0, y: 0, right: 4000, bottom: 4000 } } },
  tweens: { add: () => ({ stop() {}, remove() {} }), killTweensOf() {} },
};
function display(x, y, key) {
  const target = { x, y, texture: { key }, alpha: 1, visible: true, tint: 0xffffff, anims: { setProgress() {} } };
  const image = new Proxy(target, { get(object, method) {
    if (method in object) return object[method];
    return (...args) => {
      if (method === 'setAlpha') object.alpha = args[0];
      if (method === 'setVisible') object.visible = args[0];
      if (method === 'setTint') object.tint = args[0];
      if (method === 'clearTint') object.tint = 0xffffff;
      if (method === 'setTexture') object.texture = { key: args[0] };
      return image;
    };
  } });
  scene.children.list.push(image);
  return image;
}
scene.add.image = scene.add.sprite = display;
scene.add.tileSprite = (x, y, w, h, key) => display(x, y, key);
scene.add.graphics = () => display();
context.scene = scene;
vm.runInContext('SPR.canvas = () => {}; this.world = new ForestWorld(scene);', context);
const world = context.world;
assert.equal(world.gateOpen, false);
assert.equal(world.gateImage.texture.key, 'forest_gate_dark', 'Closed leaves need a dark backing while they animate');
assert.equal(world.gateBeacon.gl.texture.key, 'forest_glow_white');
assert.equal(world.gateSpill.texture.key, 'forest_glow_white');
world.update(.1, 1);
assert.equal(world.gateBeacon.a, 0);
assert.equal(world.gateBeacon.gl.alpha, 0, 'Closed portal must emit no white halo even after world updates');
assert.equal(world.gateSpill.alpha, 0, 'Closed portal must emit no floor light');
assert.ok(world.gateLeaves.every(leaf => leaf.visible), 'Closed wooden leaves remain visible');
world.openCastleGate();
world.update(.1, 2);
assert.equal(world.gateOpen, true);
assert.equal(world.gateImage.texture.key, 'forest_gate_open');
assert.equal(world.gateImage.tint, 0xffffff, 'Forest tint must not turn the white opening grey');
assert.ok(world.gateBeacon.gl.alpha > 0 && world.gateSpill.alpha > 0, 'Opened door lights its halo and the ground');
assert.ok(world.gateLeaves.every(leaf => !leaf.visible), 'Opened leaves leave the entire white opening visible');
console.log('OK: closed gate emits no portal light; opening reveals an untinted white core, halo and floor spill');
