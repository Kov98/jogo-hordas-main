# Poderes, criaturas e passagem da floresta

Expansão concluída em 09/11/2026. O jogo mantém a floresta escura e as luzes laranja.

## Herói e poderes

O **Canalizador** está disponível desde o início, ao lado de Vanguarda,
Sombra Verde e Arcanista. Começa com **Plasma**, 110 de vida e velocidade 165.
Os quatro cartões aceitam clique/toque, setas/A/D e atalhos 1–4.

As escolhas de nível das duas fases incluem quatro armas comuns novas, cada
uma com oito níveis e ícone próprio:

- **Mini Tornado:** vórtices móveis causam dano repetido e atraem levemente
  inimigos comuns. Chefes e minibosses não são puxados.
- **Feixe de Luz:** uma faixa branca/dourada atravessa inimigos durante a
  canalização; apenas alvos dentro da faixa recebem dano.
- **Plasma:** disparos ciano com rastros e faíscas, melhorados em quantidade,
  perfuração e potência.
- **Chuva de Meteoros:** círculos marcam os impactos antes da descida das
  rochas e de suas explosões com brasas.

O limite continua em seis armas. Níveis, atributos e as quatro armas novas
atravessam a porta normalmente. Cada arma limpa seus visuais e ataques ao ser
destruída ou substituída; projéteis usam o pool compartilhado existente.

## Bruxa e mago elétrico

A floresta tem 14 criaturas comuns. A **Bruxa da Névoa** marca três selos
violetas antes de detoná-los; o **Mago da Tempestade** anuncia três raios ciano
em linha, com impactos escalonados. As posições marcadas permanecem fixas,
permitindo sair das áreas de perigo.

Na dificuldade Média, a bruxa começa aos 185 s e o mago aos 310 s; suas ondas
próprias chegam aos 235 s e 405 s. A dificuldade afeta os desbloqueios pelo
diretor existente. Essas criaturas não integram as hordas normais do castelo.

## Partículas e passagem

Tochas e lampiões emitem brasas pequenas que sobem. As fontes compartilham um
emissor limitado; fontes longe da câmera não emitem nem acumulam partículas.
Impactos de fogo acrescentam brasas/fumaça, e impactos elétricos têm raios.

O golpe fatal no Coração de Raízes inicia a cutscene: derrota do guardião,
raízes cedendo, câmera até o portão e folhas abrindo, depois retorno ao herói.
Combate, dano, XP e pontuação ficam congelados; cenário e efeitos continuam.

Depois, caminhe até a porta e pressione **E/Enter** ou toque em **Entrar no
castelo**. O herói entra pela abertura, a tela escurece e ele sai pela porta
interna da próxima fase. O controle volta ao terminar a saída. Build, XP,
dash, dificuldade, estatísticas e a mesma partida são preservados; a chegada
recupera vida e reinicia o relógio local. A expansão seguinte acrescentou as
o Inferno e o Arquidemônio das Cinzas como final; veja `docs/INFERNO-E-MAGIA.md`.

## Verificação

Os testes usam contas e banco descartáveis, sem alterar dados de uso normal.

```sh
node tests/new_powers_checks.cjs
node tests/new_creatures_checks.cjs
node tests/ambient_fx_checks.cjs
python -m unittest discover -s tests -v
python tests/browser_accounts.py --new-content
python tests/browser_accounts.py --forest-cinema
```

Os runners de navegador precisam de Playwright e Chrome/Chromium;
`PLAYWRIGHT_MODULE` e `CHROME_PATH` selecionam as instalações locais.
Evidências e progresso desta implementação: `docs/expansao-poderes/`.

Validação final em 09/11: 31 testes HTTP, 17 checks dos poderes, quatro das
criaturas e os checks de brasas/guardas/HUD passaram. No Chrome, contas,
os dez grupos do novo conteúdo e a suíte de cinema passaram sem erros
JavaScript. A chegada foi capturada com HUD oculto e restauração ao fim.
Campanha, floresta, expansão, controles e regressões de jornada também passaram
na integração; seus logs e as capturas estão na pasta de evidências.
Não foi medido FPS em aparelhos físicos.
