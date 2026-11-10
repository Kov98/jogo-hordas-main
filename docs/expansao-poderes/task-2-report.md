# Task 2 — criaturas e Canalizador

Implementados `forest_witch` e `forest_storm_mage`, exclusivos da floresta. O catálogo preserva os 12 comuns anteriores e passa a 14. A bruxa aparece após 185 s, mantém distância e marca três selos violetas simultâneos com 1,5 s de aviso. O mago aparece após 310 s, mantém distância e marca três raios ciano em linha com avisos de 1,2 / 1,42 / 1,64 s. As ondas próprias chegam aos 235 s e 405 s. Os ataques capturam as coordenadas anunciadas, respeitam cooldown e usam o dano/limites de perigos existentes.

Arte procedural própria com quatro quadros: chapéu torto/cajado violeta da bruxa, cabelos brancos/ombreiras e bastão bifurcado do mago, roupas carvão/detalhes ciano/foco de plasma do Canalizador. Texturas `c_channeler`, `e_forest_witch`, `e_forest_storm_mage` e animações `walk_*` registradas pelo fluxo existente. Paleta e luzes da floresta preservadas.

Seleção reorganizada em quatro cartões com margem, descrição, poder inicial, HP, velocidade e barras de atributos. Clique/toque, setas, A/D, Enter/Espaço e atalhos 1–4 preservam o personagem escolhido em `lastChar`. Título reposicionado abaixo da barra de contas. Abertura e LEIA-ME atualizados para quatro heróis.

## Verificação

- TDD: `node tests/new_creatures_checks.cjs` observou quatro falhas esperadas antes da implementação: catálogo 12/14, duas criaturas ausentes e seleção 3/4.
- Após implementação, os quatro checks passam: catálogo/isolamento/progressão/ondas, ataques da bruxa, ataques do mago e quatro cartões/atalhos/clique/lastChar.
- Chrome headless em perfil descartável e APIs interceptadas: todos os textos contidos nos cartões; wrap real pela seta esquerda e tecla 4 chegando ao Canalizador no seletor de fase; toque real no primeiro cartão; retorno restaura `lastChar=channeler`; as três novas texturas têm quatro quadros; avisos e ataques renderizam sem erros JavaScript.
- Capturas: `docs/expansao-poderes/capturas/task-2-select.png` e `task-2-creatures.png`.

Os testes completos de API/campanha e revisão integrada pertencem ao coordenador. Balanceamento temporal é inicial; não foi medida taxa de quadros em dispositivo físico.

## Arquivos

`js/forest-enemies.js`, `js/enemies.js`, `js/art.js`, `js/sprites.js`, `js/scenes.js`, `js/config.js`, `LEIA-ME.txt`, `tests/new_creatures_checks.cjs`.
