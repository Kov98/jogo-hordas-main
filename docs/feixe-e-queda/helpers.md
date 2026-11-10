# Regressões de browser: queda do Castelo

Os quatro helpers abaixo foram atualizados em 10/11/2026. Somente testes e
este relatório foram alterados nesta tarefa; a implementação ficou com os
agentes responsáveis por `game.js`, `finale.js` e pelo feixe.

- `tests/browser_catacombs.cjs`: mantém áudio, altares, segredo, quatro
  evoluções e vitória final. A morte real do Cavaleiro agora aguarda
  `CastleFinale`, registra lava e queda e espera a chegada automática ao
  Inferno. Confere build, relíquias, dash, perfil, tempo acumulado, herói,
  câmera e HUD. `MURALHA_FALL_FOCUS=1` executa o recorte da queda; a variável
  anterior `MURALHA_STAIRS_FOCUS=1` continua como alias.
- `tests/browser_journey.cjs`: mantém seleção bloqueada, porta da floresta,
  checkpoint após morte, almas finais, reinício, perfil e ranking. A campanha
  autenticada mata os três chefes reais, mantém `runId`, relíquia `twin_seal`,
  poder de gelo, dash e identidade de perfil. `ageRun` ajusta os três relógios
  independentes antes das mortes aceleradas; a vitória final ainda exige
  resultado salvo e classificado com pelo menos 2700 segundos acumulados.
- `tests/browser_forest.cjs`: preserva criaturas, minis, união, passivas,
  estatísticas, estresse de quinze minutos e reinício. As duas travessias
  autenticadas mantêm um início e dois avanços, incluindo tentativa duplicada
  de dano/morte no Cavaleiro sem reiniciar a sequência. A falha de rede agora
  acontece no avanço automático para `catacombs`: a campanha continua com o
  mesmo `runId`, tempo acumulado e indicação de partida fora do ranking.
- `tests/journey_regressions.cjs`: mata chefes reais, verifica relógio real
  com delta de 1000 ms, congelamento de tempo/pontos, atalhos e interação
  bloqueados, restauração após a queda e cancelamento durante `CastleFinale`.
  Um objeto antigo recebe `update(30)` após o reinício para comprovar que seu
  callback não afeta a nova campanha. As três regressões de resposta atrasada
  do perfil continuam presentes.

Nenhum caminho normal do Castelo marca `stageCleared` artificialmente, abre
a escadaria ou chama `enterNextStage`. A porta da floresta continua sendo
atravessada explicitamente. Os helpers aguardam a cena pronta e o término da
chegada antes de inspecionar o estado. A página anterior é fechada antes de
criar a próxima nos cenários com mais de uma página.

As novas imagens são gravadas em
`docs/feixe-e-queda/capturas/browser-catacombs/`, `browser-journey/`,
`browser-forest/` e `journey-regressions/`, com nomes distintos para campanha,
conta e falha de rede. As capturas antigas de outras verificações preservam
seus diretórios anteriores.

Verificação executada: `node --check` nos quatro arquivos, todos com código
de saída 0. Não foram abertos Chrome, servidor HTTP ou APIs por este agente.
A execução real dos quatro runners e a inspeção das imagens ficam pendentes
para o agente principal, que executará Chrome sequencialmente.
