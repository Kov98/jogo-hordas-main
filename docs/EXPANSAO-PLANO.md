# Expansão: sobrevivência de 15 minutos

## Escopo autorizado

User pediu pesquisa de Vampire Survivors (wiki/guias e post Reddit), snapshot anterior, mais armas/evoluções/uniões/inimigos, dash curto, evolução de fumaça com imunidade apenas durante o dash, 2 minibosses aos5/10min e chefe final aos15min, dificuldades Fácil/Médio/Difícil/Hardcore insano. Não copiar artes ou textos do outro jogo; adaptar sistemas à Última Muralha. Sem perguntas de aprovação adicionais.

Snapshot já feito do commit `ec950d0`: tag `snapshot/pre-expansao-20261103-100040`, arquivo `/home/escola/Downloads/backups-jogo-hordas/jogo-hordas-20261103-100040.tar.gz`. Banco/credencial têm backup privado em `~/.local/share/a-ultima-muralha/backups/20261103-100040/`.

## Pesquisa e adaptação

Wiki https://vampire.survivors.wiki/w/Evolution e /w/Level_up: arma max + passiva, uniões com duas armas max consumidas em um só slot, passivas preservadas, baús liberam a transformação. Wiki /w/Treasure_Chest: chefes largam baús; em geral evoluem depois de10min, com exceções por fase. Adaptação nossa: baús podem evoluir a partir de5min numa partida de15min. Cuphead Smoke Bomb: dash curto com desaparecimento/fumaça e imunidade durante o movimento (https://cuphead.fandom.com/wiki/Smoke_Bomb). Reddit fornecido foi consultado com ferramenta web após Exa indisponível para essa URL: https://www.reddit.com/r/VampireSurvivors/comments/12rhmjs/quick_reference_for_evolutions_and_unions_what/.

## Interfaces entre tarefas

- `DIFFICULTIES` e `resolveDifficulty(id)` em `js/difficulty.js`: IDs easy/medium/hard/hardcore. Cada objeto tem id,name,desc,color,hpMul,dmgMul,speedMul,spawnMul,capMul,xpMul,healMul,projectileMul,bossHpMul,bossDmgMul,scoreMul. Médio1; fácil mais leve; hardcore hp2.6,dmg2.2,speed1.35,spawn2.8,cap2.6,heal0.4,xp1.3 e bossHP1.8,bossDmg1.8. Máximo real de inimigos240 (preservar desempenho).
- Root define `GameScene.difficultyId` e `.difficulty` antes de criar Player/EnemyManager; passa IDs ao servidor/ranking. `CONFIG.bossTime=900` e defaults/migração de regras legadas540→900 no servidor (sem apagar contas/records).
- `EncounterDirector(scene)` em `js/encounters.js`: `.update(dt)`, `.onKill(enemy)` (chamado por EnemyManager.kill só não-silent). Agenda exatamente2 minibosses em300/600s, não em900. Enemies extras adicionados por Object.assign(ENEMIES/ENEMY_ART), sem editar data.js/sprites.js. Ativos usam pool e grid existentes; `e.isMiniBoss`, `e.miniIndex` opcionais. Ao morrer: XP direto250/600 * dificuldade.xpMul, baú via `scene.progression?.dropChest(x,y,true)` e anúncio. Minibosses vivos ficam disponíveis por `.active` (array de Enemy); HUDroot mostra barras. Chefe final limpa minis silenciosamente sem recompensar.
- `ProgressionSystem(scene)` em `js/progression.js`: `.update(dt)`, `.dropChest(x,y,canEvolve=true)`, `.getOffers(canEvolve=true)` (choice objects igual rollChoices + `{type:'evolution',id:recipe.id}`), `.applyRecipe(id)`, `.canOfferPower(id)`, `.recipes` ou `PROGRESSION_RECIPES` global. Baús limitados8; suprimentos extras180/420/720s; proximidade chama `scene.openEvolutionChest(chest)`; só remove/consome baú se retorna true. Esperar não-levelUpOpen/não-chestOpen/não-ended. Evolução min300s e requisitos revalidados. União destrói instâncias antigas/pending/orbitais, consome ambas e libera1slot, bloqueia reaquisição dos ingredientes consumidos. Passiva não consumida. Ingredientes/resultados identificados por IDs.
- Novas armas base `axes`, `frost`, `poison` níveis1..8. Evoluções6: slash+maxHp→soulblade; lightning+rate→tempest; fireball+damage→inferno; axes+area→reaper_axes; frost+range→blizzard; poison+maxHp→miasma. Uniões2: blades+orbs→celestial_ring; arcane+burst→singularity. Resultados têm `obtainable:false`, não aparecem como novos no level-up; são poderosos mas com efeitos diferentes. Definições POWERS/impl pertencem tarefa1. Ícones próprios são registrados por `drawProgressionAssets(scene)` da tarefa1 (root chama em SPR.generateAll antes geração normal). Arquivo progression.js é carregado depois powers.js e antes cenas.
- Dash Player sempre disponível: `dashLevel`1..3, `dashT`, `dashCd`, `dashSmoke`, `.upgradeDash()` e `.enableSmokeDash()`. `Player.update` recebe input `{x,y,dash}`. Rootkeys incluem SHIFT/SPACE, JustDown e `.requestDash` para botão touch. Dashbase~100px/.15s, cooldown1.8s; evolução exige dashLevel3 + passiva speed>=1 + baúapós300s. Player `takeDamage` bloqueia durante dash apenas se dashSmoke; sem travessar obstáculos/mapa (subpassos). `slowT` de gelo decai e reduz movimento normal, sem travar dash. Pool visual em FX, texturas via `drawDashAssets(scene)` (rootregistra).
- Receitade dash: PROGRESSION_RECIPES inclui smoke_dash kinddash com `name,desc,icon:'smoke_dash'`, condiçõesdashLevel3 e speed>=1; aplicar chama enableSmokeDash, não consome slot de arma. Upgrade dash normal entra na tabela rollChoices como `{type:'dash'}` enquanto nível<3.

## Ownership

1. Agente progressão: data.js,powers.js,novo progression.js (com arte própria via drawProgressionAssets). Não edita outrosarquivos.
2. Agente encontros: enemies.js,novos encounters.js,difficulty.js. Não edita data.js,game.js,UI,server.
3. Agente dash: player.js,fx.js,novo dash-art.js. Não edita game.js,UI,data.
4. Root: Game/config/UI/cenas/boot/assets hooks/index/server/portal/admin/grimório/testes/docs e revisão integrada. Root gerencia tela dificuldade, cronograma final900, barras minibosses, HUD dash, tela baús, menus de evolução, score/ranking por dificuldade/migração.

## Validação obrigatória

Testar arma nova e efeitos, receita incompleta não evolui, receita completa evolui, união libera slot e destróiorbitais, fumaça não é invencibilidade permanente, dash não cruza paredes e não fica preso após diálogos, minibosses únicos300/600 comXP/baú e semspawn900, final900, escalas hardcore superiores, dificuldades persistidas e rankingfiltrado, login/admin semregressões, partida15min simulada/estresse com240inimigos semerros. Snapshot preservado e tudo commitado na main após conclusão.
