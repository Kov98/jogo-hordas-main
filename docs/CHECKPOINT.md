> **Atualização em 06/11/2026:** seleção de fases, desbloqueio por conta, portas físicas, checkpoint de fase e cutscene final. Leia [JORNADA.md](JORNADA.md).
> Leia [FLORESTA.md](FLORESTA.md) e [RETOMADA-FLORESTA.md](RETOMADA-FLORESTA.md) para o estado atual.

# Checkpoint — 30/10/2026; retomada em 03/11/2026

Checkpoint solicitado pelo usuário antes de sair. Branch: `main`.

## Já implementado

- Logo correto da escola embutido em Base64 e escala proporcional na Intro.
- Menu com ciclo de dia/noite, vila com igreja, árvores detalhadas e castelo externo.
- Aldeões variados de dia; à noite, esqueletos, combates, perseguições e um lampião por aldeão, alinhado à mão e com oclusão.
- Arte refinada da partida: heróis, inimigos, objetos, efeitos e iluminação.
- Interior escuro, sem árvores, tochas amarelo-alaranjadas; o castelo em miniatura foi substituído por um portão de salão.
- Arena com o círculo ritual vermelho original restaurado.
- Chance de drop de cura de 5% por inimigo, inclusive nas primeiras hordas.

## Contas/ranking/admin — integração concluída na retomada

- `server.py`: API Python/SQLite com cadastro e login, senhas protegidas, sessões HttpOnly, CSRF, rate limit, ranking persistente, validação de resultados e prevenção de reenvio.
- Conta inicial `admin` gerada na primeira inicialização; credencial em `~/.local/share/a-ultima-muralha/admin-inicial.json`, nunca no Git.
- Banimento/desbanimento, revogação de sessões, auditoria e regras globais.
- `js/portal.js` + `portal.css`: login opcional, visitante, nomes de 3 a 20 caracteres, ranking por pontos/abates/dano, troca de senha e restauração de sessão.
- `js/admin.js` + `admin.css`: atributos, criação de inimigos, habilidades, XP/nível, invencibilidade, chefe, teletransporte, moderação e regras globais. Comandos exigem autorização do servidor.
- Integração em index/cenas/Intro/jogo/HUD: dano efetivo, pontuação, envio de resultados, opção de login e identificação de treino.
- Partidas de admin, de teste ou com regras alteradas não participam do ranking.
- `INICIAR-JOGO.sh`: inicia o servidor em `http://127.0.0.1:5501/`; o Live Server na porta 5500 também pode usar essa API.

## Evidência já disponível

- Visuais, arena e cura foram conferidos no navegador durante as etapas anteriores.
- Backend: 17 testes HTTP reais passaram, incluindo autenticação, autorização, CSRF, banimento, ranking, persistência, replay, migração, vínculo à sessão e proteção de arquivos privados.
- Portal: sintaxe e harness isolado em Chrome passaram, incluindo diálogos, pausa/input e modo offline.
- Fluxo real no Phaser/Chrome: visitante, cadastro com 20 caracteres, restauração de sessão, resultado e ranking pelos três critérios, admin/F2/atributos/spawn/habilidade/nível/invencibilidade/chefe, banir/desbanir, regras oficiais, logout e regras atualizadas de visitantes passaram sem erros JavaScript.
- Arquivos JS modificados: sintaxe verificada.

## Correções e revisão concluídas

- Os dados privados foram transferidos para fora da raiz do Live Server; a credencial inicial foi renovada, e o servidor recusa dados dentro da pasta publicada.
- O logout envia JSON; logout e troca de conta invalidam partidas abertas, vinculadas também à sessão original.
- O jogo aguarda as regras oficiais antes de construir o mapa e indica corretamente partidas de treino.
- Os diálogos preservam pausa/input, inclusive durante inicialização assíncrona e reinício.
- A revisão final confirmou as quatro correções de segurança/integração e os ciclos de iniciar, cancelar, morrer e reiniciar.
- Testes portáveis estão em `tests/`; instruções em `docs/CONTAS-SERVIDOR.md`.

## Para usar e continuar depois

1. Inicie `./INICIAR-JOGO.sh` e abra `http://127.0.0.1:5501/`.
2. Jogue como convidado ou crie uma conta. Para admin, consulte a credencial inicial no diretório privado externo e abra o painel com F2.
3. Antes de publicar na internet, será preciso preparar hospedagem/HTTPS e decidir a proteção adicional contra trapaça; essa publicação não foi solicitada nem executada.

O servidor de contas ainda não foi publicado na internet. O ranking valida valores enviados pelo navegador; não é um sistema completo de proteção contra trapaça. Banco, senhas, sessões e arquivos privados são excluídos do versionamento.

## Correção posterior — controles após Conta/Ranking

- Causa reproduzida: o foco retornava ao botão da barra, que interceptava
  o teclado mesmo com a partida retomada.
- A última janela agora devolve o foco ao canvas e libera WASD/setas.
- O teste de regressão falhou antes da correção e passou depois: oito cenários
  reais de teclado/ponteiro, sem erros JavaScript. Pausa manual e melhorias
  continuam respeitadas.
- Os sete fluxos integrados de contas/ranking/admin também passaram após a correção, sem erros JavaScript.

## Expansão — 03/11/2026

- Snapshot anterior preservado: tag `snapshot/pre-expansao-20261103-100040` e arquivo em `Downloads/backups-jogo-hordas/`; banco privado também copiado.
- Partida padrão de 15 minutos, minibosses únicos aos 5 e 10 minutos com XP/baú e chefe final aos 15.
- Quatro dificuldades: Fácil, Médio, Difícil e Hardcore; ranking separado por modo e pontos calculados com dificuldade vinculada à partida.
- Três armas comuns novas, seis evoluções, duas uniões, baús e grimório com requisitos/progresso.
- Dash em Shift/Espaço e botão de toque, três níveis e evolução de fumaça com imunidade apenas durante a esquiva.
- Quatro inimigos comuns novos com raios, veneno, gelo/lentidão e investidas; dois minibosses com padrões próprios.
- Compatibilidade de contas/admin/controles mantida. Documentação e referências em [EXPANSAO.md](EXPANSAO.md).
- API: 19 testes passaram. Navegador: sete fluxos de contas, oito regressões de controles e integração da expansão sem erros JS.
- Simulação de 900,05 segundos no Hardcore: pico de 240 inimigos, 6569 abates, ambos minibosses e chefe final com 12600 HP; cerca de 6 segundos de CPU no navegador automatizado. Essa simulação usa invencibilidade/escolhas automáticas e não é medição de FPS nem teste de equilíbrio humano.

## Conclusão da retomada — 04/11/2026

- Encerradas as cinco correções da revisão: dois dedos, baús alcançáveis,
  reserva central de vagas, limites administrativos pequenos e texto do resultado.
- A falha do segundo toque foi localizada no contador do Phaser 3.80.1.
  O jogo usa `activePointers:3` para processar o mouse e dois toques.
  O teste também passou a soltar o contato correto do dash, mantendo o joystick.
- Aprovação focada: [whole-fix-review.md](retomada-expansao/whole-fix-review.md),
  cinco de cinco itens resolvidos, sem quebra nova nas linhas corrigidas.
- Verificação atual: 19 testes da API, sete fluxos de contas/admin, oito
  regressões de controles e 12 grupos da expansão passaram. Zero erros JS
  nas três suítes de navegador. A primeira execução de contas teve timeout;
  a reprodução instrumentada e a suíte original isolada passaram depois,
  sem mudança no código do painel. Evidência em [whole-fix-report.md](retomada-expansao/whole-fix-report.md).
- Simulação de 15 minutos em Hardcore: pico de 240 inimigos, ambos os
  minibosses e chefe final de 12600 HP. Captura de resultado inspecionada.
- Servidor disponível em `http://127.0.0.1:5501/`; regra de fábrica 900 segundos.
- Não há pendências bloqueadoras da expansão nesta revisão. Equilíbrio
  com jogadores e desempenho em aparelhos físicos não foram medidos pela simulação.

## Floresta antes do castelo — 04/11/2026

- Floresta noturna sombria, árvore como limite, trilhas e clareira, 16 corpos
  decorativos com lampiões, luzes âmbar, poças, raízes e carroças. Sem tema de Halloween.
- Oito espécies próprias, Matriarca do Brejo e Caçador Sem Sepultura aos 5/10
  minutos, Coração de Raízes aos 15. Cada fase mantém o esquema de 15 minutos.
- O chefe da floresta abre o portão; E/Enter ou toque na entrada leva ao
  castelo com build/nível/XP/dash preservados e vida recuperada. Tempo local
  reinicia; estatísticas e a mesma partida continuam. Vitória só no castelo.
- Corrigidos empurrão de tronco além da borda e pontuação infinita depois
  do chefe: caminhada segue ativa, mas tempo creditado fica parado.
- Servidor registra fases, avanço idempotente com sessão, valida vitória
  de duas fases e filtra percurso no ranking. Dados antigos e contas preservados.
- Snapshot anterior: `snapshot/pre-floresta-20261104-082006` (commit 08ec5a2).
  Código em Downloads/backups-jogo-hordas e cópia privada consistente do banco.
- API: 21 testes passaram, navegador da floresta: oito cenários passaram, castelo: 12 passaram, controles: oito
  passou e contas/admin: sete passou, sem erros JS. Revisão integral aprovada em
  [revisao-floresta/review.md](revisao-floresta/review.md).
- URL normal conferida: Intro → convidado → herói → dificuldade → floresta.
- Capturas em `/tmp/muralha-floresta/`; documentação em [FLORESTA.md](FLORESTA.md).

## Mais criaturas na floresta — 06/11/2026

- Javali Musgoso (investida), Serpente do Lodo (veneno com lentidão),
  Corvo das Ruínas (voo e penas em leque) e Sentinela de Espinhos (golpe amplo).
- Doze espécies comuns ao todo; quatro animações originais de quatro quadros,
  desbloqueios progressivos e ondas adicionais. Ferramenta de spawn do admin
  reconhece os quatro tipos; o diretor normal do castelo continua separado.
- API: 21 testes passaram. Floresta: nove grupos de navegador passaram, zero
  erros JavaScript, incluindo os ataques novos e a campanha completa.
  Simulação de 15 minutos encontrou as doze espécies, pico de 104 inimigos
  com build evoluída e invencibilidade; não mede FPS nem equilíbrio humano.
- Arte conferida em `/tmp/muralha-floresta/novas-criaturas.png`.

## Seleção de fases e desfecho — 06/11/2026

- Menu/herói → fase → dificuldade. Castelo bloqueado até passar da floresta;
  Em breve é apresentação sem fase jogável. Perfil de convidado separado.
- Muralha física na floresta; só a abertura central leva ao castelo.
  Chegada animada sai da porta sul interna antes do início do combate.
- Morte reinicia fase atual com build de entrada, vida cheia, nova run e
  estatísticas zeradas. A passagem normal continua preservando a campanha.
- SQLite guarda desbloqueios, conclusões e estatísticas por conta. Migração
  aplicada no banco real, preservando hashes e partidas anteriores.
- Vitória final inicia rachaduras/lava/queda do herói e fade, depois End.
  Cutscene única, sem combate/pontos extras ou menus cobrindo a sequência.
- Revisão independente e regressões RED→GREEN para respostas de sessão
  atrasadas, atalhos e duração cinematográfica. API 29/29 e cinco suítes
  completas de navegador passaram, sem erros JS. Estado em [JORNADA.md](JORNADA.md)
  e [RETOMADA-JORNADA.md](RETOMADA-JORNADA.md).
- Snapshot: `snapshot/pre-fases-cutscene-20261106-100233`; código e backup
  consistente de dados privados mantidos fora do projeto publicado.

## Miniaturas e porta integrada — 06/11/2026

- Imagens das fases usam a arte dos mapas, com vegetação, trilha, lampiões,
  arena, colunas e tochas; teaser com ruínas e névoa. Recorte 312×154.
- Porta interna embutida na parede sul; abertura visual/física alinhada
  em 144px, corredor de chegada livre e alas sólidas em y3750.
- Geometria/dash e chegada conferidos no navegador; jornada completa 6/6,
  zero erros JS; revisão independente sem achados. [VISUAL-FASES.md](VISUAL-FASES.md).
