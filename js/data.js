// ============================================================
//  DADOS — personagens, poderes, melhorias, inimigos, eventos.
//  Tudo aqui é editável sem mexer na lógica do jogo.
// ============================================================

// ---------- Personagens (nomes provisórios) ----------
const CHARACTERS = {
  vanguard: {
    id: 'vanguard', name: 'Vanguarda', title: 'Combatente corpo a corpo',
    desc: 'Armadura de aço e plumas rubras. Gira a lâmina ao redor de si e esmaga quem se aproxima.',
    startPower: 'slash',
    hp: 140, speed: 150, color: 0x7b8fb8,
    stats: { Vida: 0.8, Velocidade: 0.5, Alcance: 0.25, Área: 0.35 },
  },
  ranger: {
    id: 'ranger', name: 'Sombra Verde', title: 'Combatente de longo alcance',
    desc: 'Capuz esmeralda e olhar afiado. Dispara flechas automáticas antes que os inimigos cheguem perto.',
    startPower: 'arrows',
    hp: 90, speed: 175, color: 0x3f8a4a,
    stats: { Vida: 0.45, Velocidade: 0.85, Alcance: 0.9, Área: 0.2 },
  },
  mage: {
    id: 'mage', name: 'Arcanista', title: 'Combatente de dano em área',
    desc: 'Manto violeta e orbe flutuante. Detona explosões arcanas sobre grupos de inimigos.',
    startPower: 'arcane',
    hp: 100, speed: 160, color: 0x7b3fd0,
    stats: { Vida: 0.5, Velocidade: 0.6, Alcance: 0.6, Área: 0.95 },
  },
  channeler: {
    id: 'channeler', name: 'Canalizador', title: 'Condutor de energia',
    desc: 'Vestes carvão, foco ciano e plasma nas mãos. Dispara esferas elétricas que atravessam a horda.',
    startPower: 'plasma',
    hp: 110, speed: 165, color: 0x56e7f2,
    stats: { Vida: 0.6, Velocidade: 0.7, Alcance: 0.85, Área: 0.55 },
  },
};

// ---------- Melhorias passivas (atributos) ----------
// mods: multiplicadores aplicados a todos os poderes.
const PASSIVES = [
  { id: 'maxHp',  name: 'Vitalidade',       icon: 'heart',  desc: '+20 de vida máxima e cura 20.',    apply: (p) => { p.maxHp += 20; if (p.heal) p.heal(20); else p.hp = Math.min(p.maxHp, p.hp + 20); } },
  { id: 'damage', name: 'Força Bruta',      icon: 'sword',  desc: '+12% de dano em todos os poderes.', apply: (p) => { p.mods.damage += 0.12; } },
  { id: 'speed',  name: 'Passos Leves',     icon: 'boots',  desc: '+8% de velocidade de movimento.',   apply: (p) => { p.mods.speed += 0.08; } },
  { id: 'rate',   name: 'Frenesi',          icon: 'clock',  desc: '+10% de frequência de ataque.',     apply: (p) => { p.mods.rate += 0.10; } },
  { id: 'range',  name: 'Olhar Distante',   icon: 'target', desc: '+12% de alcance.',                  apply: (p) => { p.mods.range += 0.12; } },
  { id: 'area',   name: 'Aura Expansiva',   icon: 'area',   desc: '+12% de área de efeito.',           apply: (p) => { p.mods.area += 0.12; } },
];

// Run-local tradeoffs are derived from owned IDs, never written into passives.
const RELICS = {
  twin_seal: { id: 'twin_seal', name: 'Selo Gêmeo', icon: 'twin_seal', desc: 'Dobra flechas, lanças, bolas de fogo e plasma.', drawback: '−18% de velocidade de movimento.', multipliers: { speed: 0.82 } },
  blood_oath: { id: 'blood_oath', name: 'Juramento de Sangue', icon: 'blood_oath', desc: '+45% de dano com menos de 35% da vida.', drawback: '+15% de dano recebido.', multipliers: { incoming: 1.15 } },
  glass_heart: { id: 'glass_heart', name: 'Coração de Vidro', icon: 'glass_heart', desc: '+30% de dano.', drawback: '+25% de dano recebido.', multipliers: { damage: 1.3, incoming: 1.25 } },
  restless_clock: { id: 'restless_clock', name: 'Relógio Inquieto', icon: 'restless_clock', desc: '+25% de frequência de ataque.', drawback: '−15% de dano.', multipliers: { rate: 1.25, damage: 0.85 } },
  pilgrim_chain: { id: 'pilgrim_chain', name: 'Corrente do Peregrino', icon: 'pilgrim_chain', desc: '+20% de velocidade de movimento.', drawback: '−12% de frequência de ataque.', multipliers: { speed: 1.2, rate: 0.88 } },
  ashen_cup: { id: 'ashen_cup', name: 'Cálice das Cinzas', icon: 'ashen_cup', desc: '+20% de dano.', drawback: 'Curas 40% menores.', multipliers: { damage: 1.2, healing: 0.6 } },
};

// ---------- Poderes ----------
// base: atributos iniciais. upgrades[i] aplica-se ao subir do nível i+1 para i+2.
// Efetivos: damage*mods.damage | cooldown/mods.rate | range*mods.range | radius,size*mods.area
const POWERS = {
  slash: {
    id: 'slash', name: 'Golpe Giratório', icon: 'slash',
    desc: 'Golpeia ao redor do personagem, empurrando inimigos.',
    base: { damage: 16, cooldown: 1.3, range: 95, knock: 240, hits: 1 },
    upgrades: [
      { text: '+6 de dano',                 apply: (s) => { s.damage += 6; } },
      { text: 'Golpeia 15% mais rápido',    apply: (s) => { s.cooldown *= 0.85; } },
      { text: '+18 de alcance',             apply: (s) => { s.range += 18; } },
      { text: 'Golpe duplo: ataca 2 vezes', apply: (s) => { s.hits = 2; } },
      { text: '+8 de dano',                 apply: (s) => { s.damage += 8; } },
      { text: '+22 de alcance e empurrão',  apply: (s) => { s.range += 22; s.knock += 120; } },
      { text: 'Golpe triplo: ataca 3 vezes',apply: (s) => { s.hits = 3; s.damage += 4; } },
    ],
  },
  arrows: {
    id: 'arrows', name: 'Flechas', icon: 'arrows',
    desc: 'Dispara flechas automáticas no inimigo mais próximo.',
    base: { damage: 11, cooldown: 0.95, count: 1, speed: 560, range: 560, pierce: 1, spread: 0.14 },
    upgrades: [
      { text: '+1 flecha por disparo',      apply: (s) => { s.count += 1; } },
      { text: '+4 de dano',                 apply: (s) => { s.damage += 4; } },
      { text: 'Atira 12% mais rápido',      apply: (s) => { s.cooldown *= 0.88; } },
      { text: 'Flechas atravessam +1 alvo', apply: (s) => { s.pierce += 1; } },
      { text: '+1 flecha por disparo',      apply: (s) => { s.count += 1; } },
      { text: '+100 vel. e +80 alcance',    apply: (s) => { s.speed += 100; s.range += 80; } },
      { text: '+6 de dano',                 apply: (s) => { s.damage += 6; } },
    ],
  },
  arcane: {
    id: 'arcane', name: 'Nova Arcana', icon: 'arcane',
    desc: 'Marca e detona uma explosão arcana sobre o grupo mais denso.',
    base: { damage: 20, cooldown: 2.2, radius: 75, count: 1, range: 440 },
    upgrades: [
      { text: '+15 de raio',                apply: (s) => { s.radius += 15; } },
      { text: '+8 de dano',                 apply: (s) => { s.damage += 8; } },
      { text: '+1 explosão por conjuração', apply: (s) => { s.count += 1; } },
      { text: 'Conjura 15% mais rápido',    apply: (s) => { s.cooldown *= 0.85; } },
      { text: '+20 de raio',                apply: (s) => { s.radius += 20; } },
      { text: '+1 explosão por conjuração', apply: (s) => { s.count += 1; } },
      { text: '+12 de dano',                apply: (s) => { s.damage += 12; } },
    ],
  },
  blades: {
    id: 'blades', name: 'Lâminas Giratórias', icon: 'blades',
    desc: 'Lâminas orbitam o personagem e cortam inimigos próximos.',
    base: { damage: 9, count: 2, radius: 80, speed: 3.4, hitCd: 0.4 },
    upgrades: [
      { text: '+1 lâmina',                  apply: (s) => { s.count += 1; } },
      { text: '+4 de dano',                 apply: (s) => { s.damage += 4; } },
      { text: '+16 de raio de órbita',      apply: (s) => { s.radius += 16; } },
      { text: 'Giram mais rápido',          apply: (s) => { s.speed += 0.7; s.hitCd *= 0.85; } },
      { text: '+1 lâmina',                  apply: (s) => { s.count += 1; } },
      { text: '+5 de dano',                 apply: (s) => { s.damage += 5; } },
      { text: '+1 lâmina',                  apply: (s) => { s.count += 1; } },
    ],
  },
  lightning: {
    id: 'lightning', name: 'Relâmpago', icon: 'lightning',
    desc: 'Atinge inimigos automaticamente e salta entre alvos próximos.',
    base: { damage: 18, cooldown: 1.5, targets: 1, chains: 2, chainRange: 170, range: 420 },
    upgrades: [
      { text: '+1 salto',                   apply: (s) => { s.chains += 1; } },
      { text: '+7 de dano',                 apply: (s) => { s.damage += 7; } },
      { text: 'Cai 15% mais rápido',        apply: (s) => { s.cooldown *= 0.85; } },
      { text: '+1 raio por disparo',        apply: (s) => { s.targets += 1; } },
      { text: '+2 saltos',                  apply: (s) => { s.chains += 2; s.chainRange += 30; } },
      { text: '+10 de dano',                apply: (s) => { s.damage += 10; } },
      { text: '+1 raio por disparo',        apply: (s) => { s.targets += 1; } },
    ],
  },
  fireball: {
    id: 'fireball', name: 'Bola de Fogo', icon: 'fireball',
    desc: 'Projétil que explode ao atingir um inimigo ou chegar ao destino.',
    base: { damage: 22, cooldown: 1.7, count: 1, speed: 340, range: 520, radius: 62 },
    upgrades: [
      { text: '+14 de raio da explosão',    apply: (s) => { s.radius += 14; } },
      { text: '+8 de dano',                 apply: (s) => { s.damage += 8; } },
      { text: '+1 bola de fogo',            apply: (s) => { s.count += 1; } },
      { text: 'Dispara 13% mais rápido',    apply: (s) => { s.cooldown *= 0.87; } },
      { text: '+18 de raio da explosão',    apply: (s) => { s.radius += 18; } },
      { text: '+1 bola de fogo',            apply: (s) => { s.count += 1; } },
      { text: '+12 de dano',                apply: (s) => { s.damage += 12; } },
    ],
  },
  orbs: {
    id: 'orbs', name: 'Orbes Mágicos', icon: 'orbs',
    desc: 'Orbes giram ao redor do jogador causando dano por contato.',
    base: { damage: 7, count: 3, radius: 125, speed: -2.4, hitCd: 0.3, knock: 90 },
    upgrades: [
      { text: '+3 de dano',                 apply: (s) => { s.damage += 3; } },
      { text: '+1 orbe',                    apply: (s) => { s.count += 1; } },
      { text: '+18 de raio de órbita',      apply: (s) => { s.radius += 18; } },
      { text: '+4 de dano',                 apply: (s) => { s.damage += 4; } },
      { text: '+1 orbe',                    apply: (s) => { s.count += 1; } },
      { text: 'Giram 20% mais rápido',      apply: (s) => { s.speed *= 1.2; } },
      { text: '+5 de dano',                 apply: (s) => { s.damage += 5; } },
    ],
  },
  pierce: {
    id: 'pierce', name: 'Projétil Perfurante', icon: 'pierce',
    desc: 'Lança perfurante na direção com mais inimigos; atravessa vários.',
    base: { damage: 14, cooldown: 1.1, count: 1, speed: 640, range: 700, pierce: 4 },
    upgrades: [
      { text: 'Atravessa +2 inimigos',      apply: (s) => { s.pierce += 2; } },
      { text: '+5 de dano',                 apply: (s) => { s.damage += 5; } },
      { text: 'Dispara 12% mais rápido',    apply: (s) => { s.cooldown *= 0.88; } },
      { text: '+1 lança por disparo',       apply: (s) => { s.count += 1; } },
      { text: 'Atravessa +3 inimigos',      apply: (s) => { s.pierce += 3; } },
      { text: '+7 de dano',                 apply: (s) => { s.damage += 7; } },
      { text: '+1 lança por disparo',       apply: (s) => { s.count += 1; } },
    ],
  },
  burst: {
    id: 'burst', name: 'Explosão de Energia', icon: 'burst',
    desc: 'Pulso de energia ao redor do personagem causando dano em área.',
    base: { damage: 24, cooldown: 3.2, radius: 140, knock: 260, pulses: 1 },
    upgrades: [
      { text: '+25 de raio',                apply: (s) => { s.radius += 25; } },
      { text: '+10 de dano',                apply: (s) => { s.damage += 10; } },
      { text: 'Pulsa 15% mais rápido',      apply: (s) => { s.cooldown *= 0.85; } },
      { text: 'Pulso duplo',                apply: (s) => { s.pulses = 2; } },
      { text: '+30 de raio',                apply: (s) => { s.radius += 30; } },
      { text: '+14 de dano',                apply: (s) => { s.damage += 14; } },
      { text: 'Pulsa 15% mais rápido',      apply: (s) => { s.cooldown *= 0.85; } },
    ],
  },
};

// Quatro conjurações comuns; sete melhorias próprias levam cada uma ao nível 8.
Object.assign(POWERS, {
  cyclone: {
    id: 'cyclone', name: 'Mini Tornado', icon: 'cyclone',
    desc: 'Vórtices móveis varrem a horda e puxam levemente inimigos comuns.',
    base: { damage: 8, cooldown: 2.4, count: 1, speed: 115, range: 390, radius: 38, duration: 2.3, hitCd: 0.3, pull: 35 },
    upgrades: [
      { text: '+4 de dano por volta', apply: s => { s.damage += 4; } },
      { text: '+12 de raio do vórtice', apply: s => { s.radius += 12; } },
      { text: 'Dois tornados por conjuração', apply: s => { s.count = 2; } },
      { text: 'Ventos 18% mais frequentes', apply: s => { s.cooldown *= 0.82; } },
      { text: '+35 de velocidade e +90 de alcance', apply: s => { s.speed += 35; s.range += 90; } },
      { text: '+6 de dano e +0,5 s de duração', apply: s => { s.damage += 6; s.duration += 0.5; } },
      { text: 'Três tornados e voltas 15% mais rápidas', apply: s => { s.count = 3; s.hitCd *= 0.85; } },
    ],
  },
  radiant_beam: {
    id: 'radiant_beam', name: 'Feixe de Luz', icon: 'radiant_beam',
    desc: 'Um selo anuncia uma coluna de luz vinda do alto, com pulsos na área marcada.',
    base: { damage: 10, cooldown: 2.6, range: 440, radius: 26, warning: 0.25, duration: 0.8, hitCd: 0.2 },
    upgrades: [
      { text: '+5 de dano por pulso', apply: s => { s.damage += 5; } },
      { text: '+14 de raio da área iluminada', apply: s => { s.radius += 14; } },
      { text: '+0,25 s de coluna de luz', apply: s => { s.duration += 0.25; } },
      { text: 'Invoca a luz 15% mais frequentemente', apply: s => { s.cooldown *= 0.85; } },
      { text: '+110 de alcance da luz', apply: s => { s.range += 110; } },
      { text: '+7 de dano por pulso', apply: s => { s.damage += 7; } },
      { text: 'Pulsos 20% mais rápidos e +10 de raio', apply: s => { s.hitCd *= 0.8; s.radius += 10; } },
    ],
  },
  plasma: {
    id: 'plasma', name: 'Plasma', icon: 'plasma',
    desc: 'Esferas ciano com núcleo elétrico perfuram a horda e deixam rastros.',
    base: { damage: 16, cooldown: 1.1, count: 1, speed: 440, range: 570, radius: 10, pierce: 1, spread: 0.13 },
    upgrades: [
      { text: '+1 esfera por descarga', apply: s => { s.count += 1; } },
      { text: '+6 de dano de plasma', apply: s => { s.damage += 6; } },
      { text: 'Perfura +1 alvo', apply: s => { s.pierce += 1; } },
      { text: 'Descargas 16% mais rápidas', apply: s => { s.cooldown *= 0.84; } },
      { text: '+1 esfera e +90 de alcance', apply: s => { s.count += 1; s.range += 90; } },
      { text: '+8 de dano e +4 de raio', apply: s => { s.damage += 8; s.radius += 4; } },
      { text: 'Perfura +2 alvos e +100 de velocidade', apply: s => { s.pierce += 2; s.speed += 100; } },
    ],
  },
  meteor: {
    id: 'meteor', name: 'Chuva de Meteoros', icon: 'meteor',
    desc: 'Anuncia impactos no chão antes de uma queda de fogo e ondas de choque.',
    base: { damage: 38, cooldown: 3.4, count: 1, range: 460, radius: 66, warning: 0.78 },
    upgrades: [
      { text: '+14 de dano de impacto', apply: s => { s.damage += 14; } },
      { text: '+18 de raio da cratera', apply: s => { s.radius += 18; } },
      { text: 'Dois meteoros por chuva', apply: s => { s.count = 2; } },
      { text: 'Chuvas 16% mais frequentes', apply: s => { s.cooldown *= 0.84; } },
      { text: '+100 de alcance e aviso 0,1 s menor', apply: s => { s.range += 100; s.warning -= 0.1; } },
      { text: '+20 de dano e +12 de raio', apply: s => { s.damage += 20; s.radius += 12; } },
      { text: 'Três meteoros e +10 de dano', apply: s => { s.count = 3; s.damage += 10; } },
    ],
  },
});

// Armas adicionais: oito níveis completos.
for (const [id, name, desc, base] of [
  ['axes', 'Machados do Crepúsculo', 'Machados descrevem arcos e retornam, cortando na ida e na volta.', { damage: 20, cooldown: 1.8, count: 2, range: 280, radius: 22 }],
  ['frost', 'Estilhaços de Gelo', 'Uma onda congela o avanço dos inimigos com lentidão.', { damage: 14, cooldown: 2.1, range: 260, radius: 95 }],
  ['poison', 'Jardim Venenoso', 'Deixa poças persistentes sob os inimigos mais próximos.', { damage: 9, cooldown: 2.8, range: 360, radius: 65, duration: 3.8 }],
]) {
  POWERS[id] = { id, name, desc, icon: id, base, upgrades: [
    { text: '+6 de dano', apply: s => { s.damage += 6; } },
    { text: '+20% de área', apply: s => { s.radius *= 1.2; } },
    { text: 'Ataca 15% mais rápido', apply: s => { s.cooldown *= 0.85; } },
    { text: '+70 de alcance', apply: s => { s.range += 70; } },
    { text: '+9 de dano', apply: s => { s.damage += 9; } },
    { text: '+25% de área', apply: s => { s.radius *= 1.25; } },
    { text: 'Maestria: +30% de dano e frequência', apply: s => { s.damage *= 1.3; s.cooldown *= 0.7; if (s.count) s.count++; if (s.duration) s.duration += 2; } },
  ] };
}
for (const [id, name, desc, base] of [
  ['soulblade', 'Lâmina das Almas', 'Cortes sucessivos roubam vida dos inimigos atingidos.', { damage: 72, cooldown: 1.1, range: 185 }],
  ['tempest', 'Tempestade Eterna', 'Raios orbitam o jogador e castigam uma ampla região.', { damage: 58, cooldown: 0.65, range: 470, radius: 85 }],
  ['inferno', 'Inferno Vivo', 'Erupções deixam brasas persistentes no chão.', { damage: 42, cooldown: 1.5, range: 520, radius: 115, duration: 4 }],
  ['reaper_axes', 'Machados Ceifadores', 'Quatro foices retornam em espiral e executam feridos.', { damage: 85, cooldown: 1.5, count: 4, range: 390, radius: 38 }],
  ['blizzard', 'Nevasca', 'Uma frente glacial persistente persegue o jogador.', { damage: 28, cooldown: 0.55, range: 330, radius: 220 }],
  ['miasma', 'Miasma Imortal', 'Nuvens venenosas se espalham de vítimas mortas.', { damage: 32, cooldown: 1.8, range: 430, radius: 100, duration: 6 }],
  ['celestial_ring', 'Anel Celestial', 'Duas coroas oscilantes de estrelas protegem o jogador.', { damage: 42, count: 8, radius: 155, speed: 2.7, hitCd: 0.22 }],
  ['singularity', 'Singularidade', 'Um vórtice atrai hordas antes de implodir.', { damage: 100, cooldown: 3.8, range: 470, radius: 180, duration: 2.6 }],
  ['fire_hurricane', 'Furacão de Fogo', 'Vórtices incandescentes arrastam a horda e deixam zonas de brasas.', { damage: 34, cooldown: 1.6, count: 3, speed: 150, range: 580, radius: 62, duration: 3.6, hitCd: 0.22, pull: 45, emberDuration: 2.5 }],
  ['celestial_judgment', 'Julgamento Celestial', 'Três selos anunciam colunas celestiais e uma explosão de luz.', { damage: 110, cooldown: 2.2, count: 3, range: 650, radius: 98, warning: 0.7, duration: 0.32 }],
  ['plasma_storm', 'Tempestade de Plasma', 'Três núcleos orbitais ligam inimigos por arcos elétricos.', { damage: 48, cooldown: 0.75, count: 3, range: 410, radius: 105, coreRadius: 22, chains: 4, chainRange: 160, speed: 2.8 }],
  ['meteor_cataclysm', 'Cataclismo', 'Quatro meteoros anunciados rompem o chão com duas ondas expansivas.', { damage: 130, cooldown: 2.8, count: 4, range: 620, radius: 110, warning: 0.72 }],
]) POWERS[id] = { id, name, desc, icon: id, base, upgrades: [], obtainable: false };

const PROGRESSION_RECIPES = [
  ...[['slash','maxHp','soulblade'], ['lightning','rate','tempest'], ['fireball','damage','inferno'], ['axes','area','reaper_axes'], ['frost','range','blizzard'], ['poison','maxHp','miasma'], ['cyclone','area','fire_hurricane'], ['radiant_beam','range','celestial_judgment'], ['plasma','rate','plasma_storm'], ['meteor','damage','meteor_cataclysm']].map(([ingredient, passive, result]) => ({ id: result, kind: 'evolution', ingredients: [ingredient], passive, result, name: POWERS[result].name, desc: POWERS[result].desc, icon: result })),
  ...[['blades','orbs','celestial_ring'], ['arcane','burst','singularity']].map(([a,b,result]) => ({ id: result, kind: 'union', ingredients: [a,b], result, name: POWERS[result].name, desc: POWERS[result].desc, icon: result })),
  { id: 'smoke_dash', kind: 'dash', name: 'Passo de Fumaça', desc: 'Esquiva máxima + Passos Leves: deixa fumaça ao esquivar.', icon: 'smoke_dash', ingredients: [], passive: 'speed' },
];

// ---------- Projéteis inimigos ----------
const ENEMY_SHOTS = {
  arrow: { tex: 'sh_arrow', speed: 270, dmg: 6,  radius: 6,  life: 2.6, rot: true },
  bolt:  { tex: 'sh_bolt',  speed: 360, dmg: 12, radius: 7,  life: 2.8, rot: true },
  magic: { tex: 'sh_magic', speed: 210, dmg: 8,  radius: 8,  life: 3.4, rot: false },
  dark:  { tex: 'sh_dark',  speed: 230, dmg: 9,  radius: 9,  life: 3.4, rot: false },
};

// ---------- Inimigos (24 tipos) ----------
// kind: melee | flyer | ranged | caster | summoner | gunner | reaper
// from: segundo em que começa a aparecer | weight: chance relativa | maxAlive: limite simultâneo
// charge: investida {range,min,windup,dur,mul,cd,recover} | shield: bloqueia dano frontal
const ENEMIES = {
  skel_warrior:   { name: 'Esqueleto Guerreiro',      kind: 'melee',  hp: 14,  speed: 58,  dmg: 6,  radius: 13, xp: 1,  from: 0,   weight: 10 },
  bat:            { name: 'Morcego Sombrio',          kind: 'flyer',  hp: 6,   speed: 105, dmg: 4,  radius: 10, xp: 1,  from: 20,  weight: 6,
                    charge: { range: 260, min: 80, windup: 0.15, dur: 0.45, mul: 2.2, cd: 2.2, recover: 0.2 } },
  skel_archer:    { name: 'Esqueleto Arqueiro',       kind: 'ranged', hp: 10,  speed: 48,  dmg: 3,  radius: 12, xp: 2,  from: 35,  weight: 5, keep: 260,
                    shot: { type: 'arrow', cd: 2.2, range: 420, count: 1 } },
  spider:         { name: 'Aranha da Noite',          kind: 'melee',  hp: 12,  speed: 100, dmg: 6,  radius: 12, xp: 2,  from: 55,  weight: 5,
                    charge: { range: 190, min: 60, windup: 0.25, dur: 0.3, mul: 3.2, cd: 2.6, recover: 0.2 } },
  skel_shield:    { name: 'Esqueleto com Escudo',     kind: 'melee',  hp: 34,  speed: 50,  dmg: 8,  radius: 14, xp: 3,  from: 80,  weight: 4, shield: true },
  cultist:        { name: 'Cultista Sombrio',         kind: 'caster', hp: 18,  speed: 55,  dmg: 4,  radius: 12, xp: 3,  from: 100, weight: 4, keep: 170,
                    shot: { type: 'magic', cd: 2.0, range: 260, count: 1 } },
  skel_mage:      { name: 'Esqueleto Mago',           kind: 'ranged', hp: 14,  speed: 42,  dmg: 3,  radius: 12, xp: 3,  from: 120, weight: 4, keep: 280,
                    shot: { type: 'magic', cd: 2.6, range: 450, count: 1 } },
  skel_fighter:   { name: 'Guerreiro Esqueleto',      kind: 'melee',  hp: 30,  speed: 78,  dmg: 9,  radius: 14, xp: 3,  from: 140, weight: 5 },
  dark_knight:    { name: 'Cavaleiro Sombrio',        kind: 'melee',  hp: 70,  speed: 52,  dmg: 12, radius: 16, xp: 5,  from: 170, weight: 4, kb: 0.5 },
  cultist_thrower:{ name: 'Cultista Arremessador',    kind: 'ranged', hp: 20,  speed: 60,  dmg: 3,  radius: 12, xp: 4,  from: 190, weight: 4, keep: 230,
                    shot: { type: 'dark', cd: 1.9, range: 380, count: 1 } },
  giant_bat:      { name: 'Morcego Gigante',          kind: 'flyer',  hp: 46,  speed: 85,  dmg: 10, radius: 18, xp: 5,  from: 210, weight: 3, kb: 0.6,
                    charge: { range: 300, min: 100, windup: 0.3, dur: 0.5, mul: 2.4, cd: 2.8, recover: 0.3 } },
  crossbowman:    { name: 'Besteiro Sombrio',         kind: 'ranged', hp: 26,  speed: 46,  dmg: 3,  radius: 12, xp: 5,  from: 230, weight: 3, keep: 340,
                    shot: { type: 'bolt', cd: 3.0, range: 520, count: 1 } },
  specter:        { name: 'Espectro do Castelo',      kind: 'flyer',  hp: 34,  speed: 70,  dmg: 9,  radius: 13, xp: 5,  from: 250, weight: 3, ghost: true, kb: 0 },
  giant_spider:   { name: 'Aranha Gigante',           kind: 'melee',  hp: 85,  speed: 72,  dmg: 14, radius: 20, xp: 7,  from: 280, weight: 3, kb: 0.6,
                    charge: { range: 260, min: 80, windup: 0.35, dur: 0.4, mul: 3.0, cd: 3.2, recover: 0.4 } },
  floating_skull: { name: 'Caveira Flutuante',        kind: 'ranged', hp: 26,  speed: 66,  dmg: 5,  radius: 13, xp: 6,  from: 300, weight: 3, keep: 220, fly: true,
                    shot: { type: 'magic', cd: 2.8, range: 400, count: 3, spread: 0.28 } },
  mounted_knight: { name: 'Cavaleiro Esqueleto Montado', kind: 'melee', hp: 100, speed: 62, dmg: 18, radius: 22, xp: 9, from: 320, weight: 3, kb: 0.4,
                    charge: { range: 480, min: 160, windup: 0.7, dur: 0.75, mul: 4.6, cd: 4.2, recover: 0.7 } },
  reaper:         { name: 'Ceifador Sombrio',         kind: 'reaper', hp: 120, speed: 62,  dmg: 8,  radius: 16, xp: 9,  from: 350, weight: 2, kb: 0.5, fly: true,
                    sweep: { range: 150, windup: 0.65, cd: 3.4, half: 0.9, dmg: 22 } },
  elite_knight:   { name: 'Cavaleiro de Elite',       kind: 'melee',  hp: 230, speed: 66,  dmg: 18, radius: 17, xp: 12, from: 380, weight: 2, kb: 0.4 },
  gargoyle:       { name: 'Gárgula',                  kind: 'flyer',  hp: 170, speed: 88,  dmg: 16, radius: 19, xp: 12, from: 400, weight: 2, kb: 0.5,
                    charge: { range: 380, min: 120, windup: 0.5, dur: 0.6, mul: 3.0, cd: 3.6, recover: 0.5 } },
  gunner:         { name: 'Artilheiro do Castelo',    kind: 'gunner', hp: 140, speed: 44,  dmg: 5,  radius: 16, xp: 12, from: 420, weight: 2, keep: 360, maxAlive: 5,
                    shell: { cd: 3.6, range: 520, radius: 80, delay: 1.1, dmg: 24 } },
  necromancer:    { name: 'Necromante',               kind: 'summoner', hp: 110, speed: 50, dmg: 4, radius: 14, xp: 14, from: 440, weight: 2, keep: 320, maxAlive: 3,
                    summon: { cd: 6.5, count: 2, type: 'skel_warrior' } },
  stone_golem:    { name: 'Golem de Pedra',           kind: 'melee',  hp: 260, speed: 34,  dmg: 22, radius: 28, xp: 15, from: 300, weight: 1.5, kb: 0.15, maxAlive: 6 },
  giant_skeleton: { name: 'Gigante Esqueleto',        kind: 'melee',  hp: 420, speed: 42,  dmg: 26, radius: 30, xp: 20, from: 460, weight: 1.2, kb: 0.1, maxAlive: 5 },
  dark_beast:     { name: 'Fera Sombria',             kind: 'melee',  hp: 150, speed: 150, dmg: 15, radius: 20, xp: 12, from: 480, weight: 2, kb: 0.4,
                    charge: { range: 340, min: 120, windup: 0.3, dur: 0.5, mul: 2.2, cd: 3.4, recover: 0.3 } },
};

// ---------- Eventos especiais (hordas pontuais) ----------
// ring: círculo ao redor do jogador | swarm: bando vindo de um lado | pack: lista mista
const EVENTS = [
  { t: 50,  type: 'swarm', enemy: 'bat',          count: 14, msg: 'Morcegos se aproximam!' },
  { t: 120, type: 'ring',  enemy: 'skel_warrior', count: 26, msg: 'Esqueletos cercam você!' },
  { t: 195, type: 'swarm', enemy: 'spider',       count: 18, msg: 'Aranhas descem das muralhas!' },
  { t: 270, type: 'ring',  enemy: 'skel_shield',  count: 16, msg: 'Muralha de escudos!' },
  { t: 340, type: 'pack',  list: { elite_knight: 2, necromancer: 1, cultist: 6 }, msg: 'A guarda de elite chegou!' },
  { t: 410, type: 'swarm', enemy: 'giant_bat',    count: 10, msg: 'Revoada sombria!' },
  { t: 470, type: 'pack',  list: { dark_beast: 4, mounted_knight: 2 }, msg: 'Cavalaria das trevas!' },
];

// ---------- Chefe ----------
const BOSS = {
  name: 'Cavaleiro Sombrio',
  hp: 7000, speed: 105, radius: 52, contactDmg: 20,
  furyAt: 0.35,
  slash:  { range: 175, windup: 0.75, dmg: 30, half: 0.85, reach: 200 },
  charge: { windup: 0.9, dur: 0.6, speed: 760, dmg: 34, recover: 0.8 },
  wave:   { windup: 0.7, dmg: 22, speed: 330, count: 3, spread: 0.32, fury: 5 },
  blast:  { windup: 1.2, dmg: 32, radius: 105, count: 4, fury: 7 },
};
