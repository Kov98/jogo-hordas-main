// Geometry uses the production World builders and collision code. The CLI only
// substitutes the renderer; the browser export also exercises real Phaser builds.
function checkGeometry() {
  const scene = GAME.scene.getScene('Game'), before = new Set(scene.children.list);
  const check = (ok, message) => { if (!ok) throw Error(message); };
  const reports = [];
  const travel = (world, point, dx, dy, steps = 80) => {
    const entity = { ...point };
    for (let i = 0; i < steps; i++) {
      entity.x += dx; entity.y += dy; world.constrain(entity);
    }
    return entity;
  };
  try {
    const forest = new ForestWorld(scene);
    for (const radius of [12, 24, 40]) {
      for (const x of [200, 800, 1450, 1870, 2000, 2130, 2550, 3200, 3800]) {
        const entity = travel(forest, { x, y: 700, radius }, 0, -6);
        check(entity.y >= 500 + radius - .01, `Closed facade crossed: r${radius} x${x}, y${entity.y}`);
      }
    }
    reports.push('closed facade blocks all widths and radii 12/24/40');

    check(forest.entry === undefined, 'Forest inherited the castle south entrance');
    for (const radius of [12, 24, 40]) {
      check(forest.isAtCastleDoor({ x: 2000, y: 580, radius }), 'Legacy approach point is outside door reach');
      for (const x of [1750, 1900, 2100, 2250]) {
        check(!forest.isAtCastleDoor({ x, y: 480, radius }), 'Door can be activated through a flank');
      }
    }
    forest.openCastleGate();
    for (const radius of [12, 24, 40]) {
      const center = travel(forest, { x: 2000, y: 650, radius }, 0, -6);
      check(center.y <= 450 && center.y >= 400 + radius - .01, 'Open threshold is blocked or allows access onto the roof');
      check(forest.isAtCastleDoor(center), 'Open threshold is not an interaction point');
      for (const x of [200, 800, 1450, 1870, 2130, 2550, 3200, 3800]) {
        const flank = travel(forest, { x, y: 650, radius }, 0, -6);
        check(flank.y >= 500 + radius - .01, 'Open gate also opened a lateral wall');
      }
      for (const direction of [-1, 1]) {
        const inside = travel(forest, { x: 2000, y: 460, radius }, direction * 6, 0);
        check(Math.abs(inside.x - 2000) <= 72 - radius + .01, 'Player escaped corridor sideways onto wall');
        const corner = travel(forest, { x: 2000 + direction * 160, y: 640, radius }, -direction * 4, -4);
        check(corner.y >= 400 + radius - .01, 'Diagonal motion crossed the castle back wall');
        if (corner.y < 500) check(Math.abs(corner.x - 2000) <= 72 - radius + .01, 'Diagonal motion cut through a jamb');
      }
      // Dash uses substeps of at most radius / 2 in Player.update.
      const dash = travel(forest, { x: 1800, y: 540 + radius, radius }, 0, -radius / 2, Math.ceil(130 / (radius / 2)));
      check(dash.y >= 500 + radius - .01, 'Dash substeps crossed a lateral wall');
      for (const point of [{ x: -500, y: 2000 }, { x: 4500, y: 2000 }, { x: 2000, y: -500 }, { x: 2000, y: 4500 }]) {
        const entity = { ...point, radius }; forest.constrain(entity);
        check(entity.x >= 150 + radius && entity.x <= 3850 - radius && entity.y >= 150 + radius && entity.y <= 3850 - radius, 'World border escaped after facade/tree resolution');
      }
    }
    reports.push('open gate admits only central corridor, including diagonal and dash substeps');

    for (const [x, y] of [[350, 300], [1550, 470], [2000, 350], [2450, 470], [3650, 300]]) {
      check(forest.inCastle(x, y), 'Facade placement mask leaves a wall interior exposed');
      check(!forest.free(x, y, 0, 0, 0), 'Random prop can spawn inside the facade');
    }
    // The old main trail stays clear until the physical doorway itself.
    for (const point of forest.pathBranches[0].points.filter(p => p.y >= 640)) {
      const entity = { ...point, radius: 12 }; forest.constrain(entity);
      check(Math.hypot(entity.x - point.x, entity.y - point.y) < 1, 'Main forest trail is obstructed');
    }
    reports.push('facade mask reserves wall interior and preserves the forest trail');

    const castle = new World(scene), entry = castle.entry;
    check(entry && entry.x === 2000 && entry.startY > entry.endY, 'Castle south entrance contract is missing');
    check(entry.startY > 3750 && entry.endY < 3700, 'Castle entrance does not emerge from the south wall');
    for (const radius of [12, 24, 40]) {
      for (const dx of [-24, 0, 24]) {
        for (let y = entry.startY; y >= entry.endY - 40; y -= 4) {
          const entity = { x: entry.x + dx, y, radius }; castle.constrain(entity);
          check(Math.hypot(entity.x - entry.x - dx, entity.y - y) < .01, `Castle arrival blocked: r${radius} at ${dx},${y}`);
          check(!castle.free(entry.x + dx, y, 0, 0, 0), 'Castle arrival corridor is not reserved for future random props');
        }
      }
    }
    reports.push('castle south arrival remains free for radii 12/24/40');
    for (const radius of [12, 24, 40]) {
      for (const x of [200, 800, 1700, 2300, 3200, 3800]) {
        const entity = travel(castle, { x, y: 3600, radius }, 0, 6);
        check(entity.y <= 3750 - radius + .01, 'Castle south wall can be crossed beside the inset door');
      }
    }
    reports.push('inset castle door shares solid south wall with a free central opening');
    return reports;
  } finally {
    for (const child of [...scene.children.list]) if (!before.has(child)) child.destroy();
  }
}

module.exports = async function gatesChecks(page) {
  const reports = await page.evaluate(checkGeometry);
  reports.push(await page.evaluate(() => {
    const scene = GAME.scene.getScene('Game'), before = new Set(scene.children.list);
    try {
      const world = new ForestWorld(scene), player = new Player(scene, CHARACTERS.mage, 2000, 560);
      const dash = (x, y, dx, dy, open) => {
        world.gateOpen = open; player.x = x; player.y = y;
        player.dashCd = 0; player.dashT = 0; player.slowT = 0;
        player.update(.15, { x: dx, y: dy, dash: true }, world);
      };
      for (const smoke of [false, true]) for (const level of [1, 2, 3]) {
        player.dashLevel = level; player.dashSmoke = smoke;
        dash(2000, 552, 0, -1, false);
        if (player.y < 512) throw Error('Player dash crossed the closed door');
        dash(1800, 552, 0, -1, true);
        if (player.y < 512) throw Error('Player dash crossed an open gate flank');
        dash(2000, 552, 0, -1, true);
        if (player.y >= 512 || player.y < 412) throw Error('Player dash cannot enter the open threshold safely');
        dash(2000, 450, -1, 0, true);
        if (player.x < 1940) throw Error('Player dash escaped the doorway sideways');
        dash(2000, 450, 0, -1, true);
        if (player.y < 412) throw Error('Player dash climbed onto the gate roof');
      }
      return 'actual Player dash levels 1/2/3 and smoke obey the closed door, jambs and roof';
    } finally {
      for (const child of [...scene.children.list]) if (!before.has(child)) child.destroy();
    }
  }));
  for (const report of reports) console.log('OK: ' + report);
  return reports;
};

if (require.main === module) {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
  const scene = { children: { list: [] }, add: {}, tweens: { add: () => ({ stop() {}, remove() {} }), killTweensOf() {} } };
  const display = () => {
    const object = { alpha: 1, anims: { setProgress() {} }, destroy() { scene.children.list.splice(scene.children.list.indexOf(proxy), 1); } };
    const proxy = new Proxy(object, { get(target, key) { return key in target ? target[key] : (...args) => { if (key === 'setAlpha') target.alpha = args[0]; return proxy; }; } });
    scene.children.list.push(proxy); return proxy;
  };
  for (const kind of ['image', 'tileSprite', 'graphics', 'sprite']) scene.add[kind] = display;
  const context = vm.createContext({ console, Math, Map, Set, Phaser: { BlendModes: { ADD: 1 } }, SPR: { canvas() {} }, GAME: { scene: { getScene: () => scene } } });
  for (const file of ['config.js', 'util.js', 'map.js', 'forest.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'), context, { filename: file });
  for (const report of vm.runInContext('(' + checkGeometry.toString() + ')()', context)) console.log('OK: ' + report);
}
