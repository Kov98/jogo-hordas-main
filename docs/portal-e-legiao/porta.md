# Luz branca na porta da Floresta

Depois da abertura do portão, todo o interior visível do arco é branco puro
(`#fff`). O preenchimento usa o mesmo contorno em degraus da pixel art;
pedras, soleira, torres, hera e folhas laterais continuam desenhadas por cima
ou ao redor dele. O halo e o reflexo no chão também são brancos, com bordas
transparentes suaves.

## Texturas e estados

- `forest_gate_dark`: fachada usada sob as duas folhas móveis enquanto o
  portão está fechado ou abrindo. O interior permanece escuro.
- `forest_gate_open`: mesma fachada com o vão inteiro branco. São 2.753 pixels
  lógicos brancos, em uma textura de 256 × 160 ampliada três vezes, preservando
  a abertura central de 144 pixels de largura no mundo.
- `forest_glow_white`: gradiente radial neutro; ilumina a entrada e o chão.
  Tanto o halo quanto o reflexo têm alpha zero antes da abertura.

`openCastleGate()` revela a textura branca, remove a tintura fria da imagem,
oculta as folhas móveis e acende o halo e o reflexo. A animação de 1.400 ms das
folhas permanece em `animateCastleGate()`. A colisão do portão, a cutscene do
chefe, o comando E/Enter, o fade e a chegada ao castelo não foram alterados.

## Verificação automatizada

Executar na raiz do projeto:

```powershell
node tests/gate_light_checks.cjs
node tests/gates_checks.cjs
node tests/forest_cinema_checks.cjs --unit
node tests/interaction_input_checks.cjs
node tests/ambient_fx_checks.cjs
```

O teste de luz executa os desenhos reais com a caneta de pixel art de
`sprites.js` e rasteriza as texturas sem abrir navegador. Ele verifica cada
pixel do vão, inclusive a ponta estreita do arco: todos devem ser `#ffffff`.
Também impede vazamento branco sobre a alvenaria, compara a fachada externa
com a variante escura, verifica o gradiente branco e exercita o construtor e
a abertura reais de `ForestWorld`. No estado fechado, uma atualização do mundo
precisa manter halo e reflexo invisíveis. No estado aberto, o teste exige
textura branca sem tintura, folhas ocultas e iluminação acesa.

O teste foi executado antes da implementação e falhou no pixel lógico
`125,88`, que era `#0b1b1d`. Depois da implementação, os testes de luz,
geometria, cinema unitário, comandos de interação e brasas passaram.

As verificações de geometria cobrem a fachada fechada, o corredor central
aberto, ombreiras, laterais, diagonais, passos de dash e raios 12/24/40. Os
testes de comandos protegem a exigência de uma nova tecla E/Enter para entrar.

## Conferência visual no navegador

1. Antes de derrotar o primeiro chefe, aproximar-se do portão. Conferir as
   folhas fechadas, ausência da luz branca e bloqueio da passagem.
2. Derrotar o chefe e acompanhar a câmera até o portão. Depois que as folhas
   abrem, conferir o branco sólido desde a ponta do arco até a soleira, com
   halo branco suave e clarão branco no chão. O centro não pode ficar verde,
   amarelo, escuro ou apenas contornado de branco.
3. Voltar ao personagem e caminhar até o vão sem apertar E/Enter. A fase deve
   continuar na Floresta. Conferir que as laterais permanecem sólidas.
4. Apertar E ou Enter no centro para conferir caminhada, fade e chegada ao
   castelo. Repetir pela outra tecla em uma nova partida.

Para inspecionar a textura diretamente no console, o pixel de textura
`(384,360)` de `forest_gate_open` corresponde ao centro lógico `(128,120)`
e deve retornar RGB `(255,255,255)`. Na imagem da cena, a tintura do portão
aberto deve ser `0xffffff`.
