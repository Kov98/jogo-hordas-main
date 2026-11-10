# Poderes, criaturas e passagem cinematográfica

## Pedido e intenção

Adicionar quatro poderes chamativos, dois inimigos comuns à floresta, um quarto
herói disponível desde o início, mais efeitos e partículas, uma cutscene ao
derrotar o guardião da floresta e uma travessia contínua da porta para o castelo.
Manter a floresta escura e seus lampiões laranja, ajustados nesta conversa.

O usuário indicou mini tornado, feixe de luz e plasma como referências para os
poderes, e escolheu bruxa e mago elétrico como os dois inimigos.

## Conteúdo aprovado

O usuário aprovou com “sim bora” a Chuva de Meteoros como quarto poder e o
Canalizador como novo herói, começando com Plasma. Os parâmetros não definidos
pelo usuário ficam a cargo do implementador, conforme a seção final.

## Abordagem

Estender os sistemas atuais do Phaser: catálogos, implementações de poderes,
pixel art procedural, pools de efeitos, portas físicas e cenas. Esta é a
abordagem recomendada porque a build, a câmera e as portas já existem no mundo.
A sequência de saída do castelo, atualmente de 1,25 s, será parte da travessia.
Uma animação pré-renderizada exigiria sincronizar um segundo mundo visual;
trocar a fase instantaneamente não fornece a entrada/transição/saída pedida.

## Conteúdo jogável

Quatro armas comuns novas, disponíveis nas escolhas de nível nas duas fases,
com sete melhorias próprias cada uma (níveis 1–8), ícones e efeitos próprios:

| ID | Nome | Comportamento |
| --- | --- | --- |
| cyclone | Mini Tornado | Vórtices pequenos avançam em direção à horda, causam dano por intervalos e puxam levemente inimigos comuns. |
| radiant_beam | Feixe de Luz | Feixe branco e dourado, sustentado por um instante, atravessa os alvos ao longo de uma faixa. |
| plasma | Plasma | Esferas ciano com núcleo claro, rastros elétricos e impactos energéticos; melhorias ampliam disparos, dano e perfuração. |
| meteor | Chuva de Meteoros | Marcas breves anunciam meteoros que descem e explodem com brasas e ondas de choque. |

Usar os modificadores existentes de dano, frequência, alcance e área; dano passa
por damageEnemy. Respeitar seis armas e os limites globais de tiros e efeitos.
Poderes ativos são destruídos ao mudar de fase e reconstruídos com o mesmo ID e
nível. Não acrescentar receitas/evoluções além dos quatro poderes pedidos.

Canalizador (`channeler`): quarto herói, disponível desde a primeira seleção;
roupas carvão, detalhes ciano e foco de plasma visível. Começa com Plasma,
110 HP e velocidade 165. Seleção redesenhada para quatro cartões na tela de
1280×720, clique/toque, setas e atalhos 1–4. Atualizar os textos de três heróis.

Dois comuns exclusivos da floresta, com quatro quadros e silhuetas próprias:

| ID | Nome | Padrão |
| --- | --- | --- |
| forest_witch | Bruxa da Névoa | Mantém distância e anuncia selos de maldição no chão antes de detoná-los; chapéu, cajado e magia violeta. |
| forest_storm_mage | Mago da Tempestade | Marca a posição do jogador antes de raios ciano atingirem o solo; intervalos e avisos claros para esquivar. |

Introdução progressiva nas hordas e duas ondas próprias. Os 12 comuns atuais
continuam presentes. Incluir IDs no servidor e nas ferramentas administrativas;
o novo personagem pode iniciar e registrar partidas autenticadas. Sem mudança
no esquema SQLite nem alteração das contas e do progresso existentes.

## Efeitos e partículas

Brasas pequenas subindo de tochas e lampiões, mais rastros de fogo e plasma,
partículas nos impactos, faíscas elétricas e pulsos nos novos poderes. Fontes
ambientais usam um emissor compartilhado e limitado, emitindo apenas perto da
câmera. Nenhum emissor novo por inimigo, por projétil ou por quadro. Conservar
a legibilidade dos avisos de perigo e a paleta escura do cenário.

## Morte do guardião e abertura do portão

Iniciar o estado cinematográfico ao golpe fatal, congelando combate, dano,
coleta, níveis e tempo/pontuação; cenário e efeitos continuam animados.
Aproveitar a derrota existente para o último pulso do coração e raízes caindo.
A câmera percorre até o portão, mostra suas folhas abrindo com poeira/brasas e
retorna ao herói. Duração aproximada de 6–8 s; tempo real mesmo com FPS baixo.
O herói fica vivo, a campanha não termina e o resultado não é enviado como
vitória. Ao concluir, liberar a passagem e a caminhada até ela.

Usar faixas e legenda da sobreposição cinematográfica existente, ocultando
HUD/contas durante o filme. Bloquear movimento/dash, G, F2, pausa e abertura de
diálogos durante cinema/entrada/saída. Limpar entradas acumuladas e devolver
controle e interface ao fim. Uma derrota não pode abrir o portão duas vezes.

## Entrada → transição → saída

Antes da vitória, portão e muralha continuam sólidos. Depois da cutscene,
E/Enter ou toque perto da abertura inicia a passagem. Alinhar o herói ao vão e
fazê-lo caminhar para dentro, com sombra/profundidade corretas; fade para preto;
registrar o avanço uma vez e reiniciar a fase com o carry existente; fazer o
herói sair da porta sul com fade de entrada. Só devolver combate e controles
após terminar a saída. Duração total aproximada de 2–3 s, além da resposta da
API. Não transportar instantaneamente o herói da clareira para a porta.

Preservar herói, dificuldade, nível, XP, armas, passivas, dash, receitas,
estatísticas acumuladas e runId. A chegada recupera vida, reinicia o relógio
local e mantém o checkpoint de entrada da fase. Falha ao registrar passagem
continua a campanha e indica ausência de registro no ranking, como hoje.

Cada espera assíncrona confere initialization e estado da cena; shutdown
cancela tweens/overlays e resolve esperas. Resposta atrasada ou entrada repetida
não pode reiniciar outra tentativa nem duplicar avanço/conclusão.

## Verificação

- Quatro heróis acessíveis por clique, toque e teclado, com arte e poder inicial.
- Quatro poderes com dano real, melhorias até 8, limites, limpeza e transporte.
- Dois inimigos nas hordas da floresta, animação, avisos/ataques e ausência no castelo.
- Brasas visíveis, emissão limitada e fontes distantes sem emissão.
- Cinema único, sem tempo/pontos/dano extra, com portão fechado antes e aberto depois.
- Caminhada de entrada, fade, saída, controle/HUD devolvidos e carry/runId preservados.
- Atalhos, reinício durante animação/resposta atrasada e falha de rede.
- API, campanha, expansão, controles e capturas visuais no Chrome.

Os runners existentes têm problemas de portabilidade observados no Windows:
conexões de testes SQLite não fechadas e expressões Playwright devolvendo
objetos de cenas. Corrigir os helpers de teste necessários preservando as
asserções para obter uma execução completa, sem alterar a lógica de contas.

## Decisões deixadas ao implementador

Coordenadas e paletas da pixel art, valores de balanceamento além dos atributos
iniciais propostos, tempos precisos, distribuição dos upgrades e parâmetros
dos emissores. Usar limites de desempenho existentes e validar por observação;
simulação automática não equivale a uma medição de FPS em aparelhos físicos.
