# Task 1 — Feixe celeste

Implementação concluída nos arquivos de ownership da tarefa:
`js/powers.js`, `js/progression.js`, bloco `radiant_beam` de `js/data.js` e
`tests/new_powers_checks.cjs`.

O Feixe de Luz seleciona um ponto inimigo cujo centro está dentro do alcance.
Desenha um selo circular durante 0,25 s e só depois cria a coluna branca/dourada
e seus pulsos. A posição fica gravada em `state.x/y`; movimento do jogador,
movimento do alvo e reciclagem do objeto/UID não mudam o ponto marcado.
A área que recebe dano é o círculo do selo, incluindo contato com o raio do
inimigo. A antiga linha entre personagem e alvo não causa dano.

A textura e o halo reutilizados ficam rotacionados em PI/2, com origem `(0,.5)`
em `(state.x, state.topY)`; sua ponta termina exatamente em `state.y`.
`topY = min(y - 480, camera.worldView.y - 80)` é atualizado durante a coluna,
mantendo a fonte acima da câmera mesmo se ela subir. Nenhum emissor acompanha
o herói. Faíscas descem pelo eixo vertical e a claridade do impacto fica no selo.

Ruling: `width` passou a se chamar `radius`, preservando os valores 26, +14 e
+10. Isso mantém a escala geral e torna explícita a nova área circular. Dano,
alcance, duração ativa, frequência, sete upgrades e receita/passiva da evolução
permanecem compatíveis. A breve antecipação é adicional à duração ativa.

Há uma coluna de cada vez, 15 imagens persistentes (incluindo seis faíscas e
quatro impactos) e um buffer de consulta reutilizado. O update não cria imagens,
arrays, callbacks ou objetos de origem. Expiração esconde todas as camadas;
destroy limpa o buffer, zera os tempos e destrói as 15 imagens.

## Evidência TDD

RED: antes da implementação, `node tests/new_powers_checks.cjs` falhou em
`beam announces its circular footprint before damaging it in repeated pulses`:
`beam damages during the ground warning`, com 2 danos observados onde eram
esperados 0.

Os asserts antigos de faixa foram substituídos por checks de aviso sem dano,
raio circular com ponto diagonal externo, exclusão da antiga faixa, pulsos por
intervalo, alvo fixo após movimento/UID reciclado, alcance modificado,
cancelamento durante aviso, coluna vertical acima da câmera, movimento da câmera,
impacto no ponto marcado e cleanup após expiração/destruição. Os checks existentes
de níveis 1/8, multiplicadores, limite de imagens e pool global foram mantidos.

Na primeira execução GREEN, o teste de intervalo avançava até 0,86 s embora o
segundo pulso corretamente ocorresse em 0,85 s. O avanço foi corrigido para
0,82 s antes de esperar o segundo pulso. Não houve mudança na implementação
para mascarar esse erro de contagem do teste.

Verificação final:

- `node tests/new_powers_checks.cjs`: **22 checks aprovados**.
- `node tests/evolutions_relics_checks.cjs`: **19 checks aprovados**.
- `node --check` nos três arquivos JS e no teste alterado: **exit 0**.

Chrome, API e servidor ficaram reservados ao root conforme a divisão da tarefa.
Os arquivos de código estão liberados para integração e revisão.
