# Revisão independente — feixe celeste e queda

Revisão contra o backup `pre-feixe-celeste-queda-lava-20261110-165133.zip`, lendo apenas os membros relevantes com `zipfile`, e contra a especificação e o plano de 2026-11-10. Fontes revisadas: `js/powers.js`, `js/progression.js`, `js/data.js`, `js/game.js`, `js/finale.js`, `js/selection.js` e `js/ui.js`. Nenhuma fonte foi editada nesta revisão.

## Achado

- **P2 — o avanço pode cortar o fade em um quadro longo** — `js/finale.js:119-122`. O primeiro `update` que cruza 9,4 s inicia um fade de 1.400 ms; se esse mesmo quadro já alcançar 11 s, chama a conclusão imediatamente. Como a conclusão agora avança/reinicia automaticamente para o Inferno, o fade recém-iniciado não tem tempo de aparecer ou terminar. O contrato exige fade seguido de avanço e filmes pelo tempo real, inclusive com baixa taxa de quadros. Evidência em VM com a fixture de `castle_fall_checks.cjs`, sem mudar arquivos: iniciar a queda, executar `frame(9)` e depois `frame(2)` produziu `{before:{fades:0,restarts:0},after:{fades:1,restarts:1,filmElapsed:11}}`. A fixture não renderiza; a evidência comprova a chamada de reinício no mesmo quadro em que o fade é criado. Sincronizar a opacidade com o tempo do filme ou garantir preto ao ultrapassar o fim evita cortar a transição sem estender artificialmente o relógio do filme.

Não foram identificados outros problemas concretos no escopo revisto. O feixe guarda coordenadas fixas, aplica aviso antes do dano circular, mantém os multiplicadores e usa sprites reutilizados; a queda preserva o carry e as identidades, evita vitória no Castelo, bloqueia combate e cancela esperas no shutdown. A câmera do Inferno mantém as posições originais e o gatilho normal de 900 s.

## Evidência e limites

- `node tests/new_powers_checks.cjs`: 22 verificações passaram.
- `node tests/castle_fall_checks.cjs`: 10 verificações passaram.
- `node tests/catacombs_checks.cjs`: 16 verificações passaram.
- `node tests/state_transfer_checks.cjs`: 3 verificações passaram.
- `forest_cinema_checks.cjs` não executou: falhou no carregamento de `playwright`, ausente neste shell. `finale_checks.cjs` exporta uma função de browser; executá-lo diretamente não verifica a renderização.
- Não foram abertos Chrome, servidor ou API. Aspecto visual real, campanha autenticada, persistência de ranking e comportamento de efeitos do Phaser dependem da verificação de integração do root. As fixtures VM simulam câmera, temporizadores, tweens e renderização.
