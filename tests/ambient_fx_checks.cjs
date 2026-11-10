// Exercita o agendamento real; o emissor é o limite externo observado pelo teste.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ Math });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/fx.js'), 'utf8') + '\nthis.FX = FX;', context);
const emissions = [];
const fx = Object.create(context.FX.prototype);
fx.scene = {
  cameras: { main: { worldView: { x: 0, y: 0, right: 1280, bottom: 720 } } },
  world: { fireSources: [{ x: 100, y: 200, rate: 4 }, { x: 5000, y: 5000, rate: 4 }] },
};
fx.embers = (x, y, count) => emissions.push({ x, y, count });
for (let i = 0; i < 4; i++) fx.updateFireSources(.25);
assert.equal(emissions.reduce((sum, item) => sum + item.count, 0), 4,
  'Uma fonte visível deve emitir suas brasas ao longo do tempo');
assert(emissions.every(item => item.x === 100 && item.y === 200),
  'Fontes fora da câmera não devem emitir');
emissions.length = 0;
fx.scene.cameras.main.worldView = { x: 4500, y: 4500, right: 5780, bottom: 5220 };
fx.updateFireSources(.25);
assert.equal(emissions.reduce((sum, item) => sum + item.count, 0), 1,
  'Uma fonte que entra na câmera não deve compensar o tempo distante');
emissions.length = 0;
fx.scene.world.fireSources = Array.from({ length: 300 }, (_, i) => ({ x: 4700 + i % 20, y: 4800, rate: 20 }));
fx.updateFireSources(10);
assert(emissions.reduce((sum, item) => sum + item.count, 0) <= 12,
  'Salto no relógio e fontes numerosas devem respeitar um orçamento por atualização');
console.log('OK: brasas visíveis, sem emissão distante/acúmulo e orçamento limitado');
