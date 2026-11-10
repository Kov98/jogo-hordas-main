// Fases da campanha. Dados de inimigos e arte são registrados antes deste arquivo.
const STAGES = {
  forest: {
    id: 'forest', number: 1, name: 'Floresta dos Esquecidos', shortName: 'Floresta Sombria',
    boss: 'forest', bossName: FOREST_BOSS.name, next: 'castle',
    enemyIds: FOREST_ENEMY_IDS, events: FOREST_EVENTS,
    minis: ['forest_matriarch', 'forest_huntsman'], color: 0x8dc8ae,
  },
  castle: {
    id: 'castle', number: 2, name: 'Castelo do Cavaleiro Sombrio', shortName: 'Castelo',
    boss: 'castle', bossName: BOSS.name, next: 'catacombs',
    enemyIds: Object.keys(ENEMIES).filter(id => !ENEMIES[id].stage || ENEMIES[id].stage === 'castle'), events: EVENTS,
    minis: ['storm_warden', 'crypt_lord'], color: 0xe4bf87,
  },
  catacombs: {
    id: 'catacombs', number: 3, name: 'Inferno — Fortaleza das Correntes', shortName: 'Inferno',
    boss: 'catacombs', bossName: CATACOMB_BOSS.name, next: null,
    enemyIds: CATACOMB_ENEMY_IDS, events: CATACOMB_EVENTS,
    minis: ['crypt_executioner', 'crypt_soulkeeper'], color: 0xff9a50,
  },
};
function resolveStage(id) { return Object.prototype.hasOwnProperty.call(STAGES, id) ? STAGES[id] : STAGES.forest; }

function capturePlayerState(p) {
  return {
    maxHp: p.maxHp, baseSpeed: p.baseSpeed, mods: { ...p.mods },
    level: p.level, xp: p.xp, passives: { ...p.passives }, kills: p.kills,
    powers: p.powers.map(w => ({ id: w.def.id, level: w.level })),
    dashLevel: p.dashLevel, dashSmoke: p.dashSmoke,
    relics: [...(p.relics || [])], loadout: p.loadout ? {...p.loadout} : null,
  };
}
function restorePlayerState(p, saved) {
  p.maxHp = saved.maxHp; p.hp = saved.maxHp; p.baseSpeed = saved.baseSpeed;
  p.mods = { ...saved.mods }; p.level = saved.level; p.xp = saved.xp;
  p.xpNext = CONFIG.xpNeeded(p.level); p.passives = { ...saved.passives }; p.kills = saved.kills;
  p.dashLevel = saved.dashLevel; p.dashSmoke = saved.dashSmoke; p.invuln = 2;
  p.relics = [];
  for (const id of [...new Set(saved.relics || [])]) p.addRelic?.(id);
  p.loadout = saved.loadout ? {...saved.loadout} : null;
  for (const item of saved.powers) {
    const w = p.addPower(item.id);
    while (w.level < item.level && !w.maxed) w.levelUp();
  }
}
