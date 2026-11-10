# Inferno e magia — direção visual

O usuário pediu substituir a fase das Catacumbas pelo Inferno e melhorar
o tornado e o feixe de luz. Escolheu explicitamente **fortaleza demoníaca
com correntes e fogo**. Implementação autorizada pelo pedido; escolhas
artísticas abaixo são decisões do implementador dentro dessa direção.

## Abordagem

Reconstruir a identidade visual da terceira fase sobre as rotas e os
sistemas existentes: muralhas de basalto, pisos de obsidiana, correntes,
grades, espinhos, fornalhas, brasas e luz vermelha/laranja. O contraste deve
preservar leitura de chão, jogador, projéteis e avisos. A alternativa de
cavernas vulcânicas abertas foi descartada em favor da escolha do usuário.
Uma simples troca de nomes/cores não satisfaz o pedido: props, arena,
entrada, criaturas e chefe ganham desenho demoníaco próprio.

Nome apresentado: **Inferno — Fortaleza das Correntes**; nome curto:
**Inferno**. Chefe final: **Arquidemônio das Cinzas**, com silhueta de
demônio coroado/chifrudo e armadura negra incandescente. Seis comuns e dois
minibosses conservam funções de combate, com desenhos e nomes infernais.
Textos de seleção, desbloqueio, ranking, HUD, intro e desfecho acompanham
a troca. A escadaria do Castelo passa a emitir luz de fogo.

Os identificadores persistidos `catacombs`, `crypt_*`, classes e chaves de
textura são preservados para carregar resultados, progresso e checkpoints
existentes. Isso é detalhe interno; a interface apresenta Inferno. Nenhuma
migração de conta nem mudança de duração, acesso, dano ou dificuldade.

## Poderes

- Mini Tornado: funil volumoso em espirais animadas, redemoinho no solo,
  sombra, correntes de ar e pequenos detritos orbitais; núcleo claro com
  contorno contrastante. Movimento e área de dano continuam iguais.
- Feixe de Luz: núcleo branco/dourado, halo em camadas, emissor luminoso,
  faíscas ao longo do feixe e impacto visível nos alvos. O brilho acompanha
  o intervalo real de atividade; largura perigosa continua legível.
- As evoluções relacionadas podem receber acabamento coerente. Todos os
  objetos extras são reutilizados, limitados e destruídos com o poder.

Arte procedural pixel art usando os recursos atuais; sem dependências ou
downloads. Emissores/correntes do cenário são limitados e o trabalho por
frame respeita câmera e pools. Sem novas mecânicas de dano de lava.

## Verificação

Rodar checks de poderes/evoluções, rotas/armadilhas/campanha, spawns,
entrada e controles. Conferir no Chrome o desenho do Inferno, seleção,
chefe e ambos os poderes nos níveis 1/8; transição Castelo → Inferno,
desfecho e progresso existente. Conferir capturas e limpeza/repetição de
poderes. Chrome e testes HTTP pesados continuam sequenciais.
