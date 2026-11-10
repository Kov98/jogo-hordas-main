# Task 1 — Fortaleza das Correntes

Plano: `docs/superpowers/plans/2026-11-10-inferno-e-magia.md`.
Spec: `docs/superpowers/specs/2026-11-10-inferno-e-magia-design.md`.

## Alterações

- `js/catacombs-art.js`: piso de placas de obsidiana, muralha de basalto e ferro, monólitos acorrentados substituindo sarcófagos, grades-fornalha substituindo nichos, braseiros espinhosos, pilares de chifres, correntes com elos vazados, fogo vermelho/laranja em quatro quadros, alçapões de espinhos e escadaria de forja com selo acorrentado.
- `js/catacombs.js`: faces de muralha no perímetro real da união caminhável, pilares externos, correntes suspensas com oscilação discreta, fontes de brasas no emissor compartilhado e iluminação quente abaixo dos personagens e dos avisos. A arena tem anéis de ferro, raios rebitados e selo de forja próprios.
- `CatacombWorld`, `drawCatacombAssets`, `crypt_*`, cinco câmaras, seis corredores, entrada, rotas, dezesseis sólidos e regras de armadilhas foram preservados. Somente a cor e a explosão visual das armadilhas passam a fogo.

## Limites e limpeza

- 14 texturas de ambiente: 1.609.216 pixels, aproximadamente 6,14 MiB RGBA, incluindo todos os quadros de fogo; exclui os assets do chefe, gerados pelo arquivo dele.
- 44 sprites de fogo reutilizados (limite explícito 44), 26 correntes (limite explícito 26), 44 props com revelação do herói e 45 luzes; 248 objetos de cena no fixture do cenário completo. Nenhum objeto novo é criado em `update`.
- Fogo, correntes e props são ocultados fora da câmera; apenas os visíveis recebem quadros, rotação ou ajustes de transparência. Os braseiros/monólitos ficam em alpha 0,32 quando encobrem o herói; fogo frontal em alpha 0,30. Correntes, grades e pilares decorativos ficam atrás dos personagens.
- 44 `fireSources` alimentam o emissor de brasas já existente: cap global de 128 partículas e orçamento de oito emissões por atualização em `FX.updateFireSources`. Nenhum novo emissor ou timer.
- Os objetos pertencem à cena Phaser e seguem sua destruição normal. Um listener `once('shutdown')` esvazia referências de fogo, correntes, props, fontes de brasas e luzes.

## Verificação executada

- `node --check js/catacombs-art.js` e `node --check js/catacombs.js`: sem erro.
- `node tests/catacombs_checks.cjs`: 16/16 passaram na primeira execução após a implementação; inclui rotas e entrada para raios 12/24/40 e cap/suspensão das armadilhas.
- `node tests/safe_spawns_checks.cjs`: seis checks passaram, incluindo projeção com raio real dos minibosses e spawns das três fases.
- Fixture de runtime em Node/VM: vermelho antes da implementação por ausência de fontes de brasas; depois verde para quantidade constante de objetos após 100 updates, quadros animados, revelação do herói, culling de fogo/correntes e limpeza no shutdown.
- Callbacks reais de todas as 14 texturas executados com Canvas/Pen instrumentados: 2.530 operações, geometria numérica finita, nenhuma exceção.

Ruling: não adicionar testes que espelham cores ou a composição da arte — instrução explícita do controlador e mudança visual reversível; testar os comportamentos novos de reutilização, visibilidade e limpeza — risco residual: qualidade visual depende da inspeção no navegador coordenada pelo root.

Nenhum Chrome, servidor HTTP, API ou Git foi utilizado por este agente. A captura visual e a integração dos menus/filmes/áudio pertencem ao root.
