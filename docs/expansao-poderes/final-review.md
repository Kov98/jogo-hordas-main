# Revisão final independente — expansão de poderes

Data: 07/11/2026.

**Sem achados materiais. Spec e qualidade aprovadas no escopo da revisão estática.**

Foram confrontados a especificação aprovada, o ledger de progresso, o pacote
`final-review.diff`, as revisões de conteúdo e cinema e as fontes atuais. A
revisão incluiu os contratos entre catálogo, arte, poderes, criaturas, efeitos,
mapas, seleção, progressão, UI, contas e servidor, além das alterações nos
helpers de teste.

Os quatro poderes comuns possuem níveis 1–8 e usam os modificadores e o
caminho de dano existentes. O Canalizador, seus atributos e Plasma inicial
coincidem entre seleção, arte e validação do servidor. Bruxa e mago elétrico
entram no catálogo e nas ondas da floresta; o filtro de fase conserva a
exclusão dessas criaturas das hordas normais do castelo. Os IDs também são
aceitos pelos comandos administrativos.

Na Task 4, `World.fireSources` é inicializado antes da construção virtual do
mapa e recebe as tochas e os lampiões. O emissor de brasas é compartilhado e
limitado, tem orçamento por atualização, descarta crédito distante e seleciona
fontes pela câmera. As chamadas de fogo, plasma, ataques elétricos e abertura
do portão correspondem aos métodos e tipos implementados em FX. Não foram
identificadas alterações materiais indevidas nos contratos dos efeitos antigos.

O bloqueio cinematográfico inicia no golpe fatal e alcança dano, XP, níveis,
entradas e diálogos. As esperas possuem cancelamento no shutdown e verificam a
identidade da inicialização antes de continuar. A entrada física precede o
fade e o avanço único; a chegada restaura os poderes por ID/nível e conserva
o carry/runId pelo caminho existente. O ajuste do relógio de tweens apontado
na revisão anterior está presente, com restauração da política original na
conclusão e no shutdown. Não surgiu outro achado material entre esses fluxos.

No servidor, as mudanças do produto se restringem às allowlists: nenhuma
migração ou alteração da lógica de contas foi introduzida. Nos testes, o
fechamento explícito das conexões SQLite mantém o contexto transacional, as
avaliações Playwright deixam de devolver objetos complexos e a escolha do
Python usa o executável do runner. O ajuste POSIX condiciona somente os três
asserts de bits de permissão; as verificações HTTP/CORS permanecem ativas.

Limites: não foram executados testes, Chrome, servidor ou chamadas de API por
este revisor, conforme solicitado para evitar concorrência na máquina. Os dez
checks reais de browser sem pageerrors e o RED→GREEN do relógio são evidências
informadas pelo coordenador, não execuções desta revisão. A execução final
das suítes, a avaliação visual e qualquer medição de desempenho permanecem
sob responsabilidade da integração do coordenador.
