# Miniaturas das fases e porta integrada

Execução inline autorizada; sem etapa de aprovação adicional. Base e194cbf.

Objetivo: substituir desenhos geométricos simples por miniaturas detalhadas
de 312×154, com assets reais/canvas, e embutir a porta interna na parede sul.
Manter controles, bloqueios por conta, chegada/checkpoint e passagem existentes.

Escolha: reutilizar pixel art e gerar texturas locais; sem imagens externas
ou dependências. Floresta com vegetação/trilha/luar/lampiões, castelo com
pedra/arena/colunas/tochas, teaser com paisagem misteriosa. Imagens recortadas
ao tamanho exato do cartão e legíveis mesmo quando bloqueadas.

Porta: parede sul começa em y3750, abertura x2000±72. Arte com escala 1,2
(60 pixels lógicos × 2 × 1,2 = 144), apoiada dentro
da faixa de pedra até y4000; chegada 3806→3640 continua desobstruída.

- [x] RED: geometria impede atravessar alas da parede sul, preserva corredor.
- [x] Implementar miniaturas e porta/parede coerentes com a colisão.
- [x] Conferir capturas e geometria real, seleção e chegada/checkpoint.
- [x] Revisão focada e commit na main.
