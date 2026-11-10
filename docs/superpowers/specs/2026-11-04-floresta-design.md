# Floresta antes do castelo

O usuário pediu uma floresta noturna sombria e macabra, bonita e decorada, sem tema de Halloween. Árvores fecham as bordas como as muralhas atuais. Aldeões mortos e lampiões são decoração e fontes de luz; o caminho iluminado conduz ao portão do castelo, agora fase2. A floresta usa hordas, dois minibosses e chefe final com criaturas próprias.

Decisões de implementação comunicadas: cada fase dura15min, minis aos5/10 e chefe aos15; vencer a floresta libera o portão, sem encerrar a partida. Entrar no castelo conserva armas, evoluções, atributos, dash, nível e XP; a vida é recuperada na passagem. O relógio local reinicia na fase2, enquanto duração/abates/dano/pontos da campanha acumulam. A vitória final exige derrotar o Cavaleiro Sombrio. O acesso ocorre por proximidade + E/Enter ou botão de toque. A floresta fica escura o tempo inteiro; luzes quentes e detalhes frios naturais, sem abóboras/fantasias/cores festivas.

Arquitetura escolhida: ForestWorld reutiliza colisões/limites/iluminação de World, com arte procedural própria e configuração explícita por fase. A mesma GameScene é recriada na passagem com estado serializado do jogador e a mesma partida de servidor. Alternativas descartadas: trocar somente a textura do castelo não produz uma floresta própria; iniciar uma partida independente perderia a progressão e não seria uma primeira fase da campanha.

API mantém clientes antigos: iniciar sem stage continua significando castle. O frontend novo envia forest. Banco ganha fases inicial/atual e horário de avanço; nova rota valida a passagem. Ranking filtra campanha e castelo isolado, preservando resultados antigos. Nenhuma senha ou banco entra no Git.

Limites: Phaser3.80.1 local, sem novas dependências; até240 inimigos, efeitos/tiros limitados, caminho e clareira acessíveis. As quatro dificuldades, controle de dois dedos, contas/admin e Intro permanecem integrados. O usuário já autorizou execução autônoma e commits na main.
