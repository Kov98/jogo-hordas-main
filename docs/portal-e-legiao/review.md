# Revisão independente — admin, porta branca e legião

## Parecer

Não identifiquei um novo bloqueador reproduzível nas mudanças de produção
revisadas. As três entregas atendem ao escopo descrito: retirar a faixa que
encobria ações administrativas, preencher de branco a porta aberta depois do
primeiro chefe e acrescentar cinco espécies comuns ao Inferno. Este parecer
vale para as fontes e verificações abaixo; não significa ausência de todos os
bugs possíveis.

Não alterei produção nem testes. O único arquivo escrito por esta revisão foi
este relatório. Não iniciei Chrome, API, servidor ou banco.

## Base e escopo

Comparei os membros relevantes do backup
`C:/Users/pedri/Downloads/backups-jogo-hordas/inicio-portal-e-legiao-20261111.zip`
diretamente com os arquivos atuais, usando `zipfile`, sem extrair o arquivo.
Os seis arquivos de produção estavam presentes no backup. As diferenças desse
escopo estão restritas a `admin.css`, `js/admin.js`, `js/forest.js`,
`js/forest-art.js`, `js/catacombs-enemies.js` e `server.py`.

Também li os relatórios de cada entrega, o plano, os testes novos e sua
integração com o diálogo, gerenciador de inimigos, geração de sprites, corpos,
perigos, dificuldades e definições de fase existentes. As alterações anteriores
da auditoria não foram atribuídas a este pacote.

## Conferências

| Entrega | Resultado |
| --- | --- |
| Administração | O status saiu do corpo com rolagem e ocupa uma linha própria no rodapé. Não usa mais `sticky`; vazio, fica oculto. O rodapé existente admite quebra de linha, e mensagens longas podem quebrar palavras. Os controles conservam o corpo rolável. |
| Porta | A fachada escura permanece durante a animação. Ao abrir, a textura revela todos os 2.753 pixels lógicos brancos do vão e remove a tintura que acinzentaria o branco. Halo e reflexo brancos começam com alpha zero. A geometria de colisão e o fluxo E/Enter não receberam mudança neste pacote. |
| Inferno | Os cinco IDs integram somente o diretor ordinário do Inferno, com desbloqueios progressivos, limites individuais e artes próprias de quatro quadros. Os seis IDs antigos, dois minibosses e chefe permanecem. Os dois packs adicionais usam o caminho existente de spawn seguro. |
| Combate e recursos | As novas definições reutilizam IA, perigos e escala de dificuldade existentes. Não introduzem timers, projéteis ou emissores próprios. O pool continua em 240 com reservas dos minibosses; morte, limpeza e corpos usam o caminho comum. As cinco folhas adicionais somam 205.056 bytes RGBA antes da sobrecarga da plataforma. |
| Administração/API | Os cinco IDs constam do whitelist de `server.py` e do catálogo usado pelo seletor administrativo. O teste HTTP acrescentado cobre a aceitação de cada ID; sua execução pertence ao coordenador. |

Identifiquei uma observação no helper novo: ele devolvia `e.type`, enquanto o
gerenciador registra `e.id`. O coordenador corrigiu o campo e acrescentou a
comparação dos cinco IDs esperados. Conferi essa correção nas fontes finais;
não era uma falha do jogo.

## Verificação independente

Executei as oito suítes abaixo com as fontes atuais. Todas retornaram código 0:

| Comando | Verificações/grupos |
| --- | ---: |
| `node tests/admin_lifecycle_checks.cjs` | 2 |
| `node tests/gates_checks.cjs` | 5 |
| `node tests/gate_light_checks.cjs` | 3 |
| `node tests/inferno_legion_checks.cjs` | 9 |
| `node tests/catacombs_checks.cjs` | 16 |
| `node tests/safe_spawns_checks.cjs` | 6 |
| `node tests/forest_cinema_checks.cjs --unit` | 2 |
| `node tests/interaction_input_checks.cjs` | 11 |

Os testes novos exercitam desenhos reais com a caneta de pixels, estados do
portão, catálogo, diretor, IA, direção capturada da investida, avisos, recargas,
escala de vida/dano, limites, limpeza e chaves de textura. As verificações
existentes protegem passagem, colisões, minibosses, transições e input.

## Limites

As fixtures substituem partes da cena e da renderização. O raster confirma as
cores das texturas e seus limites, mas não comprova a composição final do
Phaser, contraste dos inimigos durante uma horda, áudio, input físico ou
desempenho real. A revisão estática dos números de combate não substitui uma
avaliação prolongada de balanceamento nas quatro dificuldades.

Não executei os helpers de navegador nem testes HTTP nesta revisão. O
coordenador informou a passagem integrada do novo helper no Chrome, incluindo
admin em 1280×720, 480×600 e 360×600, abertura após o chefe, travessia por E e as
cinco texturas. Esse resultado é evidência do coordenador, não uma execução
independente minha; capturas e validação final ficam no fechamento da integração.
