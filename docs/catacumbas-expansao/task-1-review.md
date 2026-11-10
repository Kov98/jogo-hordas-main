# Revisão independente — Task 1

Revisados a especificação, o plano, `task-1-report.md`, `js/data.js`,
`js/powers.js`, `js/progression.js`, `js/player.js` e
`tests/evolutions_relics_checks.cjs`. Carry/checkpoint, hooks de integração e
UI de seleção das relíquias pertencem à integração do root e não foram
tratados como faltas desta tarefa. Nenhum arquivo de produto foi alterado.

## Estado após re-revisão

**P2 tratado (addressed). Nenhum novo achado material no trecho corrigido.**

Re-revisão estática focada em `js/powers.js:832–887`,
`tests/evolutions_relics_checks.cjs:129–156` e no adendo do relatório de
implementação. O Cataclismo agora tem duas janelas de expansão separadas
(0,02–0,38 s e 0,46–0,94 s após o impacto), com ocultação e reinício do anel.
O raio `front` dirige tanto a escala visível, compensando a margem da
textura, quanto o limite externo da colisão; o anel é atualizado antes do
dano. O limite interno considera a frente anterior, e cada onda guarda seu
próprio conjunto de UIDs. Os conjuntos são limpos no reuso e na destruição.
Permanecem quatro slots e um anel reutilizado por slot, sem sprites novos.

O novo check observa duas expansões distintas, exige anel visível no quadro
do acerto e recusa dano antecipado ao alvo a 170 px. Ele também exige zero
acertos da primeira onda nesse alvo e exatamente um da segunda. O relatório
do implementador registra RED no cenário anterior e 19 checks GREEN após a
correção. A re-revisão foi estática, conforme solicitado, sem repetir a suíte
ou executar Chrome/API. A inspeção não identificou uma nova inconsistência
de geometria, deduplicação, orçamento ou cleanup nessa correção.

## Achado original — preservado como histórico

**P2 — As ondas do Cataclismo causam dano adiante do anel e só existe uma
expansão visual.** `js/powers.js:865–868`.

As duas chamadas de `evolutionCircle` atingem instantaneamente discos de
raios `1.3 * m.radius` e `1.65 * m.radius` aos 0,18 e 0,42 segundos após o
impacto. No mesmo instante, o único anel cresce pela fórmula
`m.radius * (.4 + after / .9 * 1.3)`: seus raios são aproximadamente
`0.66 * m.radius` e `1.007 * m.radius`. Assim, o dano das duas ondas ocorre
muito além do efeito que deveria indicar sua posição. O anel também nunca
reinicia para representar a segunda onda expansiva exigida na especificação.

Reprodução VM isolando um dos quatro slots, raio base 110, alvo com raio 10
a 170 px do centro: a segunda onda registrou dano 39 em
`age = 1.14` (`after ≈ .42`), enquanto o anel visível media aproximadamente
110,73 px de raio naquele quadro (109,14 px antes da atualização do sprite).
O alvo recebe dano antes de o anel chegar até ele. A primeira onda apresenta
a mesma divergência de escala. Recomenda-se sincronizar alcance e momento do
dano com cada expansão, com duas passagens visíveis, mantendo os quatro
slots reutilizados e dano único por passagem/alvo. Um check com alvo fora do
anel naquele quadro precisa falhar antes da correção.

## Conferências sem novos achados materiais

- As quatro receitas exigem base no nível máximo 8, passiva pelo menos 1 e
  tempo de fase 300 s; resultados têm `obtainable: false`, e transformar
  destrói a instância base antes de instalar o resultado.
- Furacão tem vórtices móveis e brasas; Julgamento captura coordenadas para
  aviso e coluna; Plasma usa três núcleos e cadeias com UIDs deduplicados no
  pulso; Cataclismo captura coordenadas e usa quatro slots. Os caminhos de
  dano usam os modificadores existentes, e as novas bases dispõem de cleanup.
- Limites persistentes são fixos: 6 vórtices/6 zonas, 3 colunas, 3 núcleos e
  4 meteoros/4 anéis. Os efeitos novos não alocam sprites durante o combate.
  Plasma base respeita o pool compartilhado e elimina seus tiros ao destruir.
- Atração exclui chefes oficiais, minis e chefe opcional; avisos não retêm
  referências a inimigos reciclados. Destruição bloqueia updates futuros e
  limpa sprites/slots das quatro evoluções.
- Os seis IDs e valores de contrapartida correspondem à especificação.
  Inventário limita três IDs únicos; efeitos são derivados sem alterar
  `mods`/passivas, e a remoção desfaz as vantagens/desvantagens sem deriva.
  Dano recebido, cura, Vitalidade, frequência e quantidade dos quatro tipos
  de projétil usam os métodos das relíquias.
- O tint de aparência volta após o flash. Foi conferido também o componente
  Tint do Phaser local: `setTint` limpa `tintFill`, portanto não conserva o
  preenchimento do flash ao restaurar a aparência.

## Verificação executada na revisão inicial

- `node tests/evolutions_relics_checks.cjs`: 18 checks passaram.
- Probe Node/VM usando o fixture real do teste, sem executar Chrome/API,
  confirmou a divergência geométrica descrita acima.
- Não foram repetidas as demais suítes listadas no relatório de execução.

O check original das ondas (`tests/evolutions_relics_checks.cjs:129–136`)
confere as três ocorrências de dano e a ausência de repetição por quadro;
ele não compara o instante/alcance do dano ao raio do visual nem verifica
duas expansões visíveis. Renderização real e integrações continuam para a
validação sequencial do root.
