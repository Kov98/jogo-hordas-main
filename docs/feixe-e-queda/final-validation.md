# Feixe celeste, queda e chefe — verificação integrada

O fechamento desta etapa foi integrado à [auditoria de 11/11/2026](../auditoria-2026-11-11/README.md).

- O Feixe de Luz desce de cima da câmera e atinge o ponto marcado no chão,
  sem sair do herói. Níveis 1/8, dano real, aviso, UID reciclado, movimento da
  câmera, evolução, expiração e destruição foram verificados.
- O Cavaleiro inicia o filme de rachaduras, lava e queda. A passagem para o
  Inferno acontece automaticamente, mantendo build, identidade e relógios.
- O Arquidemônio aparece pelo gatilho normal de 900 s e a câmera mostra
  chefe e jogador. Sua derrota inicia o filme final e só então a tela de resultado.
- O achado de fade da revisão anterior foi corrigido; a auditoria também
  corrigiu o acesso a uma legenda destruída entre filmes consecutivos.

Evidências visuais:

- [Feixe vindo do alto](../auditoria-2026-11-11/capturas/inferno/radiant_beam-nivel-8.png)
- [Queda na lava](../auditoria-2026-11-11/capturas/jornada/castelo-queda.png)
- [Arquidemônio](../auditoria-2026-11-11/capturas/inferno/arquidemonio.png)

Os relatórios de implementação desta pasta preservam os testes e decisões
originais; a auditoria contém os resultados da rodada mais recente e os limites
da validação. Os identificadores internos `catacombs` continuam compatíveis
com as partidas e contas anteriores.
