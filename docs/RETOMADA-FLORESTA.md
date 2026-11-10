# Retomada — campanha Floresta → Castelo

Atualização atual: seleção de fases, progresso por conta, entrada física,
retry na fase atual e cutscene final. Estado em [JORNADA.md](JORNADA.md).

Atualização em 06/11: quatro criaturas adicionais (Javali Musgoso, Serpente do
Lodo, Corvo das Ruínas e Sentinela de Espinhos), totalizando doze espécies comuns.
Arte original com quatro quadros, desbloqueios graduais, quatro ondas próprias
e spawn administrativo. Detalhes atuais em [FLORESTA.md](FLORESTA.md).
Verificação dessa atualização: API 21/21; floresta 9/9, sem erros JavaScript;
simulação da fase encontrou as doze espécies. Base anterior: a520e30.

## Estado

Implementação concluída em 04/11/2026, base anterior 08ec5a2. A floresta é a
fase inicial; o castelo agora é fase 2. Não há bloqueios abertos na revisão
integral. As regressões do castelo e dos controles passaram novamente após o ajuste
do relógio. A suíte de contas executada isoladamente também passou nos sete fluxos,
sem alterações no código do painel. Não há pendências bloqueadoras.

Projeto: `/home/escola/Downloads/jogo-hordas`, branch main.
Iniciar: `./INICIAR-JOGO.sh`; URL: `http://127.0.0.1:5501/`.
O servidor atualizado já está disponível. A URL normal mantém a Intro.
O usuário autoriza execução autônoma e commits na main.

## Fluxo e decisões

- 15 min por fase, minis 300/600 e chefe 900. Floresta sempre à noite.
- Árvores nas bordas; caminho sinuoso iluminado por lampiões, cadáveres
  decorativos estáticos, raízes, folhas, poças, troncos e carroças.
- 8 inimigos comuns próprios, 2 minis e o Coração de Raízes.
- Matar o chefe abre o portão em 2000/500. Aproximar e pressionar E/Enter
  ou tocar no botão passa ao castelo. Antes disso, a entrada é recusada.
- Armas, níveis, uniões, passivas, XP, dash e ingredientes consumidos passam
  para a fase 2; a vida é recuperada. A mesma run e regras iniciais são mantidas.
- Estatísticas/duração acumulam, mas o relógio creditado congela ao limpar
  a floresta. `visualTime` permite luzes/névoa/caminhada sem pontos extras.
- Mobs do castelo após carry: HP 1,8×, spawn 1,15×, dano 1,2×; chefe pela dificuldade.
- Falha de rede no avanço permite seguir com build em treino e explica por
  que a campanha não será salva. Não cria uma run substituta classificada.
- API antiga sem stage continua como castelo isolado; ranking UI separa
  os percursos. Registros antigos recebem castle, sem apagar resultados.

## Arquivos

Cenário: `js/forest-art.js`, `js/forest.js` (ForestWorld herda World).
Criaturas: `js/forest-enemies.js`, `js/forest-boss.js`; Boss aceita data opcional.
Fases/carry: `js/stages.js`, `js/game.js`. HUD/menus/portal e API integrados.
Contrato e experiência: [FLORESTA.md](FLORESTA.md).
Plano e spec em `docs/superpowers/`; relatórios em `docs/revisao-floresta/`.

## Evidência

- Backend: 21 testes passou, incluindo avanço prematuro, sessão, repetição,
  vitória incompleta, filtros e compatibilidade legada.
- Navegador da floresta: oito grupos passou: mapa/bordas/rota, decoração, inimigos,
  minis/XP, boss, caminhada sem tempo/pontos, passagem e carry, vitória e
  reinício, mesma run/autenticação/duplo clique, fallback de rede.
- Simulação de 15 min na mata: as oito espécies apareceram, dois minis e boss;
  pico de 96 inimigos na rodada final com build evoluída/invencibilidade. Não é FPS.
- Regressões finais: castelo 12 grupos, controles oito e contas/admin sete,
  zero erros JS. Uma execução concorrente do teste de contas teve timeout
  esperando End; a suíte original isolada passou depois sem mudança de
  produto. As suítes interativas devem preferir execução sequencial.
- Geometria: 1.446 amostras da trilha e 2.616 de borda; arte inspecionada.
- Revisão encontrou abuso de pontos no pós-boss, reproduzido em teste antes
  da correção e aprovado após freeze_t/visualTime. Texto da derrota também
  foi adequado à floresta. Relatório final sem blockers.
- Migração real aplicada em 5501. Contas e hashes de senha comparados com
  snapshot e preservados; contagem de resultados não diminuiu.
- Smoke da URL normal percorreu Intro/menu/herói/dificuldade e entrou na
  floresta como convidado normal, sem erro JS.

```sh
python3 -m unittest discover -s tests -v
CHROME_PATH=/opt/google/chrome/chrome PLAYWRIGHT_MODULE=/home/escola/.cache/ms-playwright-go/1.57.0/package python3 tests/browser_accounts.py --forest
CHROME_PATH=/opt/google/chrome/chrome PLAYWRIGHT_MODULE=/home/escola/.cache/ms-playwright-go/1.57.0/package python3 tests/browser_accounts.py --expansion
CHROME_PATH=/opt/google/chrome/chrome PLAYWRIGHT_MODULE=/home/escola/.cache/ms-playwright-go/1.57.0/package python3 tests/browser_accounts.py --controls
CHROME_PATH=/opt/google/chrome/chrome PLAYWRIGHT_MODULE=/home/escola/.cache/ms-playwright-go/1.57.0/package python3 tests/browser_accounts.py
```

O caminho direto do Chrome evita o wrapper local que abre uma aba escolar.
Runners usam bancos descartáveis; não alteram contas de uso normal.

## Snapshot

Tag `snapshot/pre-floresta-20261104-082006` → 08ec5a2.
Código: `/home/escola/Downloads/backups-jogo-hordas/jogo-hordas-pre-floresta-20261104-082006.tar.gz`.
Dados: `~/.local/share/a-ultima-muralha/backups/20261104-082006/`.
Banco e credenciais externos, nunca no Git. Capturas: `/tmp/muralha-floresta/`.

## Para continuar

Não recriar a floresta nem repetir a pesquisa anterior. Para ajustes visuais,
partir das capturas e do mapa atual. Para novas mecânicas, preservar a mesma
run/carry e os testes da passagem. Equilíbrio com pessoas e desempenho em
aparelhos físicos não foram medidos nesta simulação.
