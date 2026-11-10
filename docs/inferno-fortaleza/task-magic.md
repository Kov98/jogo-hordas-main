# Task 2 — Mini Tornado e Feixe de Luz

Implementado em `js/powers.js` e `js/progression.js`, com regressões em
`tests/new_powers_checks.cjs`. Os contratos `POWER_IMPL.cyclone`,
`POWER_IMPL.radiant_beam`, `p.state.sprite` e `vortices[*].life/sprite` foram
preservados. Nenhum catálogo, dano, alcance, intervalo, puxão ou passiva mudou.

## Resultado visual

- Mini Tornado: funil contínuo de seis voltas, corpo sombreado com volume,
  bordas claras, olho aberto no topo e ponta luminosa. Oito quadros animam as
  espirais; folhas/pedras orbitam em uma folha própria. Correntes de ar
  aditivas e um redemoinho circular com sombra acompanham o funil.
- A base do tornado segue exatamente o centro de combate, mesmo durante a
  oscilação leve do corpo. O tamanho da base acompanha o diâmetro de dano.
- Feixe: faixa dourada com núcleo branco, halo discreto em camadas,
  emissor estrelado com anel, terminação luminosa, seis faíscas móveis e
  clarões nos inimigos realmente atingidos. Oito quadros movimentam os
  filetes internos. A faixa principal mantém a largura real de dano;
  apenas o halo fraco avança além dela.
- Furacão de Fogo reutiliza o novo volume com espirais incandescentes e
  línguas de fogo. Julgamento Celestial recebeu raios laterais, núcleo
  branco e um anel de impacto na textura existente. São acabamentos de
  textura, sem alteração de lógica das evoluções.

## Orçamento e limpeza

| Poder | Objetos próprios fixos | Limite simultâneo |
| --- | --- | --- |
| Mini Tornado | 24 imagens: corpo, solo, vento e detritos por slot | 6 tornados |
| Feixe de Luz | 14 imagens: faixa, halo, fonte, ponta, 6 faíscas e 4 impactos | 1 feixe / 4 impactos |

Tudo é alocado em `init` e reaproveitado. Não há criação de emissores nem
imagens durante o combate. Faíscas transitórias utilizam os emissores
compartilhados já limitados de `FX`; clarões têm pool de quatro slots e não
retêm referências a inimigos. Todos os elementos próprios ficam invisíveis
no mesmo update em que termina a atividade e são destruídos em `destroy`.
Os efeitos transitórios compartilhados conservam seu ciclo curto normal.

O check de spam usa nível 8, frequência 1000, área 3 e alcance 2 durante
12 segundos: o número de imagens não cresce, o pool global continua com
160 tiros, e o orçamento próprio permanece abaixo de 24 imagens.

## Evidências

- RED do novo ciclo de tornado observado: `active tornado has no visible
  ground footprint` antes da implementação.
- RED do novo ciclo de feixe reproduzido com o `powers.js` do backup anterior,
  em VM sem alterar arquivos de produção: `active beam has no luminous emitter`.
- `node tests/new_powers_checks.cjs`: **19/19** passaram. Os dois checks novos
  cobrem posição/área do solo, camadas no fim da vida, emissor seguindo o
  jogador, impacto apenas no alvo atingido, faixa de largura real e limpeza.
- `node tests/evolutions_relics_checks.cjs`: **19/19** passaram.
- `node --check js/powers.js`, `node --check js/progression.js` e
  `node --check tests/new_powers_checks.cjs`: saída limpa, código zero.
- Comparação adicional com o `powers.js` do backup: **8/8 cenários** com
  tornado/feixe nos níveis 1/8 e modificadores normais/extremos produziram
  listas de acertos, dano, tempo, fonte, saúde e posições de inimigos
  exatamente iguais após oito segundos de simulação.
- Prévia raster local das texturas conferida sem navegador. Chrome,
  capturas em cena, integração geral e revisão final ficam coordenados
  pelo root; este agente não iniciou navegador, API ou servidor.

Ruling: manter a largura da faixa principal constante durante a canalização
— a pulsação continua no brilho, emissor e halo, para a largura visível
acompanhar a largura perigosa. É uma decisão visual; combate permanece igual.
