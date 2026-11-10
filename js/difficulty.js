// Multiplicadores aplicados uma única vez no sistema responsável.
const DIFFICULTIES = {};
for (const [id, name, desc, color, values] of [
  ['easy', 'Fácil', 'Mais cura e espaço para aprender.', 0x83d994, [.65,.6,.85,.7,.8,1.15,1.7,1,.7,.65,.75]],
  ['medium', 'Médio', 'A experiência clássica de sobrevivência.', 0xe8cc89, [1,1,1,1,1,1,1,1,1,1,1]],
  ['hard', 'Difícil', 'Hordas maiores e inimigos mais resistentes.', 0xff9658, [1.5,1.4,1.15,1.5,1.5,1.1,.75,1,1.3,1.35,1.5]],
  ['hardcore', 'Hardcore', 'Uma maré de monstros desde o primeiro instante.', 0xff4565, [2.6,2.2,1.35,2.8,2.6,1.3,.4,1.25,1.8,1.8,2.5]],
]) {
  const d = { id, name, desc, color };
  ['hpMul','dmgMul','speedMul','spawnMul','capMul','xpMul','healMul','projectileMul','bossHpMul','bossDmgMul','scoreMul'].forEach((key,i) => d[key] = values[i]);
  DIFFICULTIES[id] = Object.freeze(d);
}
function resolveDifficulty(id) { return Object.prototype.hasOwnProperty.call(DIFFICULTIES, id) ? DIFFICULTIES[id] : DIFFICULTIES.medium; }
