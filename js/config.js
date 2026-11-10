// ============================================================
//  CONFIG — valores de balanceamento e limites (fáceis de ajustar)
// ============================================================
const CONFIG = {
  title: 'A Última Muralha',   // nome do jogo (aparece no menu, na abertura e na aba do navegador)

  // Tela de abertura (créditos). Edite os textos aqui.
  intro: {
    welcome: 'Bem-vindo ao trabalho de',
    author: 'Kaike Oliveira Cabral Araújo',
    school: 'Aluno do Colégio Estadual Barbosa Ferraz',
    course: 'Curso: 2º DS',
    description: 'Quatro heróis atravessam a Floresta dos Esquecidos, enfrentam o Cavaleiro Sombrio e invadem uma fortaleza no Inferno. Siga os lampiões, descubra segredos e rompa as correntes do Arquidemônio das Cinzas.',
    wish: 'Desejo a você uma ótima experiência de jogo!',
    okAfterMs: 5200,    // quando o botão OK aparece
    autoMs: 15000,      // segue sozinho depois desse tempo
    slideMs: 2600,      // duração da subida que revela o menu
  },

  width: 1280,
  height: 720,

  world: { w: 4000, h: 4000, border: 150 },     // mapa grande; borda = muralha
  arena: { x: 2000, y: 2000, r: 520 },          // arena da batalha final (centro do mapa)

  bossTime: 900,          // segundos até o chefe de cada fase despertar (?boss=30 para testar)
  seed: 20260,            // semente do cenário (mesmo cenário em toda partida)

  // Limites de desempenho
  maxEnemies: 240,
  maxEnemyShots: 140,
  maxPlayerShots: 160,
  maxGems: 320,
  maxPowers: 6,
  maxDamageNumbers: 36,

  levelUpChoices: 3,
  maxPowerLevel: 8,
  maxPassiveLevel: 5,

  healthDropChance: 0.05,     // 5% de chance de cura por inimigo derrotado

  player: { radius: 12, invuln: 0.6, pickupRadius: 70, start: { x: 2000, y: 3000 } },

  // Diretor de hordas
  spawn: {
    baseRate: 1.1,        // inimigos por segundo no início
    growth: 0.0115,       // aumento por segundo de partida
    minDist: 620,         // distância mínima do jogador para nascer (fora da tela)
    maxDist: 780,
    hpPerMinute: 0.22,    // +22% de vida dos inimigos por minuto
    dmgPerMinute: 0.07,
  },

  // XP necessário para o próximo nível
  xpNeeded: (lvl) => Math.floor(8 + (lvl - 1) * 6 + Math.pow(lvl - 1, 1.6) * 2),
};
