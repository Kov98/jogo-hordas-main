# Imagens das fases e porta na parede — 06/11/2026

Os cartões usam texturas de 312×154 geradas por canvas com a mesma pixel art
dos mapas. Floresta: árvores de espécies variadas, trilha, folhas, rochas,
aldeão caído, luar, névoa e lampiões. Castelo: piso de pedra, círculo ritual,
colunas, estandartes, entulho e tochas. Em breve: ruínas, ponte na névoa e lua.
O recorte fixo impede sair do cartão; o bloqueio mantém a imagem legível.

A porta interna do castelo fica embutida na faixa de pedra da parede sul.
A face física começa em y3750, com abertura central de 144 pixels. A arte
usa escala 1,2 para corresponder à mesma abertura (60×2×1,2). O jogador
continua chegando de y3806 até y3640, com o corredor livre e flancos sólidos.

Arquivos: `js/stage-art.js`, `js/selection.js`, `js/map.js` e `index.html`.
Colisão testada em `tests/gates_checks.cjs`; capturas conferidas em
`/tmp/muralha-visuais/fases.png` e `/tmp/muralha-visuais/porta.png`.

TDD da parede: teste atravessava ao lado da porta antes; cinco grupos VM
passaram depois. Conferência Chrome: miniaturas dentro dos cartões,
colisões/dash e chegada sem erros JavaScript. Revisor independente aprovou
e executou 121 verificações focais com World/Player reais: raios/intervalos,
dash 1–3 normal/fumaça, corredor, cantos e flags ghost/noObs/voo.

Jornada completa: 6/6 grupos, zero erros JavaScript, em servidor e banco
descartáveis separados. Duas tentativas anteriores do runner foram
interrompidas com SIGTERM do processo que mantinha o servidor temporário;
a execução final com fixture independente concluiu todos os cenários.

Base anterior: e194cbf. Sem mudanças no backend ou nos dados das contas.
