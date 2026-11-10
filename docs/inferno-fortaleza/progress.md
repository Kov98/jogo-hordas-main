# Progresso — Inferno e magia

- Usuário pediu Catacumbas → Inferno, tornado e feixe mais bonitos; escolheu
  fortaleza demoníaca com correntes e fogo. Implementação autorizada.
- Backup anterior: `../backups-jogo-hordas/pre-inferno-fortaleza-20261110-161418.zip`.
- Tasks cenário, poderes e demônios implementadas e verificadas em arquivos
  disjuntos; relatórios task-fortress.md, task-magic.md e task-demons.md.
- Integração root aplicada: nomes, seleção/miniatura, HUD, intro, perfil,
  coleção/ranking, texto de acesso, brasas, trilha e cinema das correntes.
- IDs persistidos `catacombs`/`crypt_*` e regras de campanha preservados.
- Dois testes HTTP da terceira fase aprovados, incluindo resultados antigos
  sem reescrita; api-test.log.
- Novo browser Inferno aprovado: cinco grupos, zero pageerrors. Confirmou
  progresso antigo, seis criaturas, seleção, quatro capturas dos poderes
  nos níveis 1/8, chefe/desfecho e vitória persistida. Capturas conferidas.
- O primeiro probe visual esperava disparo antes do timer inicial de 0,4 s;
  fixture corrigido para incluir disparo e pulso real, sem editar combate.
- Helper antigo da campanha agora aguarda cada símbolo ser consumido antes
  do próximo teleporte/pressionamento. Mantém os asserts; evita colapsar
  ações de teste no mesmo frame quando o renderer está lento.
- Revisão independente sem achados materiais: 16 cenários de poderes e
  15.552 posições de colisão idênticos ao backup; budgets/cleanup aprovados.
- Browsers concluídos: inferno 5 grupos, campanha completa da terceira fase,
  journey 8 grupos com conta e selector 6; todos aprovados, zero pageerrors.
- Helper de seleção atualizou apenas o nome esperado no perfil, de
  Catacumbas para Inferno. IDs e todas as verificações de progresso mantidos.
- Lote final aprovado: 12 suítes/105 checagens, node --check de 67 JS/CJS e
  py_compile de 3 Python. Log unit-test.log. Fontes congeladas desde a revisão.
- Todos os itens do plano concluídos. Capturas conferidas e relatório em
  final-validation.md; guia de usuário em ../INFERNO-E-MAGIA.md.
