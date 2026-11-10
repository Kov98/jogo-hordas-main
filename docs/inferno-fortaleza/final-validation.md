# Verificação final — Inferno e magia

Atualização concluída em 10/11/2026, conforme a direção escolhida pelo
usuário: **fortaleza demoníaca com correntes e fogo**.

## Resultado

- Terceira fase substituída visualmente por **Inferno — Fortaleza das
  Correntes**: muralhas, pisos, monólitos, grades-fornalha, pilares,
  correntes oscilantes, fogo animado, brasas, entrada e arena próprios.
- Seis criaturas e dois minibosses redesenhados; chefe final
  **Arquidemônio das Cinzas**. Nomes, mensagens, tiros, avisos e cinema
  acompanham a identidade infernal.
- Mini Tornado com funil volumoso em oito quadros, vento/solo e detritos;
  Feixe de Luz com núcleo branco/dourado, halo, emissor, faíscas e impactos.
  Evoluções relacionadas também receberam acabamento de textura.
- Menus, miniatura, HUD, intro, coleção/perfil, ranking e desfecho atualizados.
  IDs antigos e dados de progresso continuam compatíveis.

## Evidências

| Verificação | Resultado | Log/relatório |
| --- | --- | --- |
| Contratos de combate, arte, rotas, spawns, áudio e controles | 12 suítes, 105 checagens aprovadas | [unit-test.log](unit-test.log) |
| Sintaxe | 67 JS/CJS e 3 Python aprovados | [unit-test.log](unit-test.log) |
| API: duas passagens, tempos, histórico e desbloqueios antigos | 2 testes aprovados | [api-test.log](api-test.log) |
| Inferno em Phaser real: progresso antigo, arte, poderes níveis 1/8, chefe e vitória persistida | 5 grupos aprovados, zero erros JS | [inferno-test.log](inferno-test.log) |
| Campanha completa: áudio, altares, segredo, quatro evoluções e duas travessias | Aprovada, zero erros JS | [catacombs-test.log](catacombs-test.log) |
| Campanha com conta, checkpoint, ranking e persistência após recarregar | 8 grupos aprovados, zero erros JS | [journey-test.log](journey-test.log) |
| Seleção, conta/convidado, storage bloqueado, mouse e toque | 6 grupos aprovados, zero erros JS | [selector-test.log](selector-test.log) |
| Revisão independente | Sem achados materiais | [final-review.md](final-review.md) |

A revisão comparou 16 cenários de Tornado/Feixe com o backup: os eventos
de dano e as posições foram idênticos. Também comparou 15.552 posições
de colisão para raios 12/24/40, sem mudanças de resultado.

## Limites e limpeza

O cenário reutiliza 44 fogos e 26 correntes, com atualização limitada pela
câmera; 14 texturas de ambiente somam aproximadamente 6,14 MiB RGBA.
Tornado usa 24 imagens próprias para até seis vórtices; Feixe usa 14,
incluindo quatro impactos reutilizados. Não há alocação contínua de
imagens/emissores durante o combate. Expiração/destroy/shutdown foram
conferidos. Os emissores compartilhados mantêm seus limites existentes.

Os testes de navegador usam cenas controladas, tempo acelerado e bancos
descartáveis. O toque foi simulado no Chrome; não houve medição de FPS em
celular físico. Os runners encerraram seus próprios navegadores/servidores.

Os helpers foram ajustados para esperar o consumo de cada símbolo antes
de teleportar ao próximo, respeitar o timer inicial real de 0,4 s das
armas e reconhecer o novo nome Inferno no perfil. As exigências de combate,
vitória, progresso e ausência de erros permaneceram.

## Capturas e uso

[Capturas conferidas](capturas/README.md),
[prancha das criaturas](demons-art-preview.png) e
[guia da atualização](../INFERNO-E-MAGIA.md).

Execute `python server.py`, abra <http://127.0.0.1:5501/> e use Ctrl+F5
caso a página estivesse aberta antes da atualização.
