# Task 1 — evoluções e relíquias

Implementação concluída em `js/data.js`, `js/powers.js`, `js/progression.js`
e `js/player.js`; testes em `tests/evolutions_relics_checks.cjs`. Nenhum
script novo precisa entrar em `index.html`.

## Contratos de integração

- `RELICS` é um objeto por ID em `data.js`, carregado antes de exploração.
  Cada entrada oferece `id`, `name`, `icon`, `desc`, `drawback`, `multipliers`.
  `drawback` contém a contrapartida pronta para exibir antes de confirmar.
- `player.relics` contém IDs; `addRelic(id):boolean` recusa IDs desconhecidos,
  repetidos e o quarto item. `removeRelic(id):boolean` remove sem reaplicar
  efeitos. `relicMultiplier(stat)` aceita `damage`, `speed`, `rate`,
  `incoming`, `healing`; outros nomes retornam 1.
- `projectileCount(base)` dobra a quantidade com `twin_seal`. Flechas,
  perfurantes, fogo e plasma consultam essa função e usam o pool de 160.
- Não há escrita de relíquias em `player.mods` nem em `passives`. Dano,
  velocidade, frequência, dano recebido e cura são derivados na utilização.
  O limiar do Juramento de Sangue é estritamente menor que 35% de HP.
- `PowerInstance.cd(interval = this.s.cooldown)` permite também aplicar a
  frequência a contatos de lâminas, orbes e Anel Celestial. Fixtures antigas
  sem métodos de relíquias continuam válidas por fallback para 1/base.
- Root deve salvar/restaurar apenas IDs via `addRelic` antes de reconstruir
  poderes, preservando a prioridade do checkpoint. Este owner não editou
  `stages.js`; carry/retry integrado fica na verificação do controlador.
- Cura comum passa por `Player.heal`, inclusive Vitalidade (com fallback
  para fixtures antigas). A cura de `GameScene.startBossFight` foi avisada
  ao root, que já a encaminhou por `heal`. Recuperação na entrada de fase
  continua regra separada do checkpoint. Comida, baús e roubo de vida já
  chamavam `heal`.
- Hook cosmético pedido pelo root: `player.appearanceTint = null` por
  padrão; o flash de dano tem prioridade e, ao terminar, o tint reaparece.
  Root aplica/salva/restaura a preferência de aparência.
- `ProgressionSystem.applyRecipe` permanece o ponto único de transformação;
  root pode acrescentar o evento opcional de `MetaProgress` em sequência.

## Conteúdo e limites

Todas as quatro receitas exigem a arma base no nível 8, passiva nível 1 e
tempo de fase de pelo menos 300 segundos. Resultados são exclusivos de baú,
com `obtainable:false`. Transformar destrói a base e seus ataques/visuais.

| Evolução | Receita | Efeito e limite por instância |
| --- | --- | --- |
| `fire_hurricane` | cyclone + area | 6 vórtices móveis, atração de comuns e até 6 zonas de brasas |
| `celestial_judgment` | radiant_beam + range | Até 3 colunas anunciadas com explosão; coordenadas capturadas |
| `plasma_storm` | plasma + rate | 3 núcleos orbitais e arcos encadeados que deduplicam UIDs por pulso |
| `meteor_cataclysm` | meteor + damage | 4 slots de meteoro; cada um usa um anel reutilizado para duas ondas sucessivas, máximo 4 anéis |

Não se criam sprites durante o combate dessas quatro evoluções. Seus
limites de sprites persistentes são 12/6/3/12 respectivamente; faíscas,
raios e anéis transitórios usam pools existentes. Destruir a instância
limpa os slots e impede impactos/ondas atrasadas. Avisos mantêm posições,
sem referências a inimigos reciclados. Chefes oficiais, minis e chefes de
exploração não são atraídos, incluindo correção da Singularidade antiga.

As seis relíquias são `twin_seal`, `blood_oath`, `glass_heart`,
`restless_clock`, `pilgrim_chain`, `ashen_cup`, com os valores da spec.

`drawProgressionAssets(scene)` gera os dez novos ícones e as texturas
`fx_fire_hurricane`, `fx_fire_hurricane_embers`,
`fx_celestial_judgment`, `p_plasma_storm`, `p_meteor_cataclysm`,
`fx_cataclysm_wave`. Já era chamado pelo bootstrap; não há outro hook de
arte a integrar. Marcas de aviso reutilizam `fx_meteor_mark` existente.

## Verificação executada

RED inicial observado: `node tests/evolutions_relics_checks.cjs` falhou com
`missing recipe fire_hurricane`. Após implementação de combate, o mesmo
arquivo falhou na ausência do ícone de `fire_hurricane`; a arte completou
esse ciclo. Regressões adicionais observadas em RED e corrigidas: aparência
sem tint persistente; Singularidade deslocando boss; Relógio não mudando
frequência dos contatos orbitais.

Comandos e resultados finais:

- `node tests/evolutions_relics_checks.cjs`: 19 checks passaram após correção de revisão.
- `node tests/new_powers_checks.cjs`: 17 checks passaram, incluindo fixtures
  antigas sem métodos de relíquias.
- `node tests/new_creatures_checks.cjs`: catálogo, diretor, AI e seleção passaram.
- `node tests/ambient_fx_checks.cjs`: orçamento/limpeza passaram.
- `node tests/forest_cinema_checks.cjs --unit`: bloqueios de cinema/HUD passaram.
- `node tests/gates_checks.cjs --unit`: cinco verificações de colisão passaram.
- `node --check` em quatro arquivos de produto e no teste novo: cinco arquivos passaram.

Os 19 checks novos cobrem receitas e fronteira de tempo/nível/passiva,
transformação única, cancelamento, dano/modificadores, vida/cura, inventário,
remoção sem deriva, limites de efeitos/pool, UID reciclado, coordenadas de
avisos, duas ondas com dano único por meteoro e arte executada pelo gerador.
Self-review estática conferiu ownership, cleanup e ausência de novos timers,
dependências ou multiplicadores persistidos em `mods`.

Sem execução de Chrome, API ou instalação nesta tarefa. Renderização real,
UI de altares, carry/retry e persistência integrados precisam das verificações
do root após unir os owners. Não há `package.json` ou comando de suíte geral
no repositório; foram executados os checks VM pertinentes acima.

## Correção após revisão independente — Cataclismo

A revisão reproduziu dano da segunda onda a 170px enquanto o anel ainda
estava perto de 110px: os discos fixos de dano usavam tempos distintos da
expansão visual. Novo check observou RED com a frente calculada em
103,8125px para esse acerto antecipado.

Agora cada slot mostra duas expansões sucessivas: 0,02–0,38s e 0,46–0,94s
após o impacto. Há um intervalo visível e reset do anel entre as ondas.
O dano acompanha a passagem da frente, com UIDs deduplicados separadamente
por onda. A escala compensa a margem transparente da textura existente.
Permanecem quatro slots/quatro anéis e nenhum sprite criado durante combate.
O teste novo verifica as duas expansões e que o inimigo distante só recebe
dano quando a frente o alcança. `progression.js` não foi alterado nessa
correção, preservando o hook de metaprogressão integrado pelo root.
