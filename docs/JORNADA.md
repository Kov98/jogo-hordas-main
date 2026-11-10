# Seleção de fases, perfil e desfecho

O fluxo normal agora é Intro/Menu → herói → fase → dificuldade → partida.
A Floresta está disponível desde o início. O Castelo é liberado quando o
jogador vence a floresta e atravessa sua porta. Em breve é apenas uma
apresentação bloqueada; não existe uma terceira fase jogável.

## Portas e reinício

A fachada norte da floresta é uma muralha sólida, ligada às bordas da mata.
Não é possível atravessar a pedra, usar dash para cortar a parede ou andar
no telhado. Derrotar o Coração de Raízes abre somente a passagem central.
Use E/Enter ou o botão diante da abertura para entrar.

O jogador chega pela porta sul do interior do castelo e caminha para dentro
antes de o relógio/combate começarem. A entrada é reservada para não receber
obstáculos aleatórios.

Morrer reinicia a fase em que o jogador estava, com o herói, dificuldade e
equipamentos do início daquela fase. Isso inclui armas, níveis, passivas,
evoluções/uniões, XP e dash. Vida cheia, relógio, abates e dano reiniciam;
o servidor cria outra partida, sem reutilizar o resultado anterior.
O checkpoint da tentativa fica em memória; não é uma gravação da partida
em andamento para fechar o navegador e continuar do mesmo instante.

## Dados por conta

Contas guardam acesso às fases e estatísticas no SQLite privado do servidor.
Minha conta mostra conclusões, partidas, vitórias, abates, dano, pontos
acumulados e melhor pontuação. O ranking continua exibindo a melhor partida
por usuário no critério/percurso/dificuldade selecionados.

Trocar de conta troca o perfil inteiro. Atualizar a página, sair e entrar
depois preserva o progresso autenticado. Convidados têm um progresso próprio
salvo neste navegador, com fallback em memória se o storage estiver bloqueado;
esse progresso não é importado para contas novas.

O servidor também bloqueia início direto no Castelo quando ele não foi
liberado. Respostas perdidas/repetidas não contam o mesmo avanço duas vezes.
Prática/admin não concedem progresso de jogador. Partidas normais com regras
customizadas podem liberar fases sem entrar no ranking. Vitórias históricas
legítimas preservam o acesso já conquistado antes da introdução do bloqueio.

## Cutscene final

Derrotar o Cavaleiro Sombrio encerra o combate e registra a vitória uma vez.
Durante aproximadamente onze segundos, a câmera enquadra o círculo ritual,
rachaduras incandescentes se espalham, o piso abre sobre lava e o herói cai
no abismo. Depois do fade aparece a tela final. A queda é parte da vitória,
sem dano adicional, inimigos ou pontuação gerada durante a animação.

As faixas e legendas usam uma câmera própria, independente do zoom do mundo.
O painel de contas fica oculto durante a cutscene e volta nas telas normais.

As imagens das fases foram detalhadas com a arte real dos mapas, e a porta
interna foi integrada à faixa de pedra da parede sul. Detalhes e evidência
em [VISUAL-FASES.md](VISUAL-FASES.md).

## Arquivos e recuperação

`js/selection.js`: StageSelect/Difficulty; `js/portal.js`: perfil/contas;
`server.py`: persistência/bloqueio/migração; `js/forest.js`, `map.js` e
`forest-art.js`: entradas físicas; `js/game.js`: chegada/retry;
`js/finale.js`: desfecho e sobreposição cinematográfica.

Base anterior: `1bed7c2`. Snapshot:
`snapshot/pre-fases-cutscene-20261106-100233`. Código em
`/home/escola/Downloads/backups-jogo-hordas/jogo-hordas-pre-fases-cutscene-20261106-100233.tar.gz`.
Backup consistente do banco/credencial permanece na pasta privada
`~/.local/share/a-ultima-muralha/backups/20261106-100233/`, fora do Git.

Testes integrados usam bancos descartáveis. `browser_accounts.py --journey`
cobre seleção/bloqueio, colisões/dash, chegada, morte/checkpoint, cutscene,
registro autenticado, atualização de página e estatísticas reais por conta.
Capturas ficam em `/tmp/muralha-jornada/` e `/tmp/journey-gates/`.

Verificação final: 29 testes de API; cinco suítes completas do navegador
(jornada 6, floresta 9, expansão 12, controles 8, contas/admin 7 grupos),
zero erros JavaScript. Regressões de respostas atrasadas/atalhos/tempo:
4/4. A simulação automática não mede equilíbrio humano nem FPS real.
