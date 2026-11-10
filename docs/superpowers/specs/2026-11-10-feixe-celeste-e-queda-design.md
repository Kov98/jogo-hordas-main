# Feixe celeste, chefe e queda na lava

Pedido explícito do usuário: o Feixe de Luz vem de cima, verificar onde está
o boss do Inferno e restaurar a animação antiga de cair na lava depois de
matar o chefe do Castelo, seguindo automaticamente para a terceira fase.

## Direção e contratos

- Feixe de Luz vira uma coluna branca/dourada que desce do alto sobre um
  ponto inimigo selecionado dentro do alcance. Um selo no chão anuncia
  brevemente o ponto; a coluna permanece nele durante os pulsos, mesmo se
  o jogador se mover. Causa dano na pegada circular visível, não na antiga
  linha personagem→alvo. Sem dano antes do impacto, nem depois de expirar.
  Preservar níveis, passiva, evolução, multiplicadores e budget reutilizado.
- A animação antiga `CastleFinale` já existe: rachaduras, abertura de lava,
  caminhada ao círculo e queda. Restaurá-la após a morte do Cavaleiro;
  terminar com fade e avanço automático explícito para `catacombs`/Inferno.
  Não conceder vitória no Castelo nem exigir a escadaria/E. Preservar runId,
  build, relíquias, dash, perfil, relógios e tratamento de falha de rede.
- Filmes usam tempo real, bloqueiam combate/menus e cancelam no shutdown.
  Cada passagem e recompensa ocorre no máximo uma vez; callbacks atrasados
  não podem reiniciar outra partida. A chegada na terceira fase restaura o
  herói, câmera e HUD após a queda.
- O Arquidemônio já existe e o agendamento é 900 s por padrão. Conferir
  aparição pelo relógio normal, sem chamar a fábrica diretamente no teste.
  A câmera da luta no Inferno deve enquadrar arena, herói e boss; a câmera
  anterior seguia o herói ao sul enquanto o boss nascia ao norte. Melhorar
  enquadramento, sem alterar atributos ou horário. Seleção informa 15:00.

Escolhas do implementador: coluna fixa no ponto do alvo, aviso curto e dano
circular; reutilizar o filme já presente; câmera fixa enquadrando a arena
do Inferno. Identificadores persistidos e acesso à fase permanecem iguais.
Nenhuma dependência nova. Trabalho autorizado pelo pedido, sem nova aprovação.

## Verificação

TDD de dano/posição/cancelamento/UID do feixe; transição idempotente após
queda, offline e shutdown. Chrome: coluna vindo do topo, pulsos nos níveis
1/8, rachaduras/lava/queda e chegada preservando build; boss disparado ao
cruzar 15:00 e visível na câmera real; campanha autenticada e ranking final.
