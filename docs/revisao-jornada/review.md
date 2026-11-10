# Revisão integral — fases, perfil e desfecho

Base `1bed7c2`; revisor independente somente leitura. Nenhum Critical.
Revisão de portas/colisão, chegada, retry, SQLite e vitória única não
encontrou problemas concretos adicionais.

## Achados corrigidos

1. **Important: sessão atrasada regride perfil.** Uma consulta iniciada
   antes do avanço/final podia sobrescrever progresso/estatísticas novos
   na mesma sessão. Perfil agora tem uma revisão local: consultas anteriores
   a uma atualização confirmada não substituem o perfil da mesma identidade.
   Troca de usuário/CSRF continua sendo tratada pela versão da sessão.
2. **Atalho G cobre a cutscene.** O revisor classificou como Minor; a raiz
   incluiu na correção porque o modal ocultava a sequência pedida enquanto
   ela continuava executando. Atalhos de Grimório/admin ficam bloqueados
   durante a sequência; a barra já fica oculta.
3. **Duração sob FPS baixo.** A regressão completa da floresta expirou
   esperando End enquanto a cutscene estava no fade. A raiz isolou o uso
   do delta de combate limitado a 50 ms. A sequência agora recebe delta
   real, mantendo o tempo/pontos da partida congelados.

`tests/journey_regressions.cjs` reproduziu os quatro casos antes da correção:
G, duração, consulta antiga após advance e após finish. Depois: 4/4 GREEN,
zero erros JavaScript. O teste de sessão usa HTTP controlado para atrasar
respostas, com portal/DOM/eventos reais; a suíte da jornada também verifica
passagem e estatísticas reais em banco descartável.

Na conferência visual a raiz encontrou barras/legendas afetadas pelo zoom
da câmera do mundo. O teste raster falhou nas bordas da imagem antes da
correção e passou com `FinaleOverlayScene`, câmera própria e barra oculta.

Não se afirmam equilíbrio humano, FPS sustentado ou resistência completa
a adulterações do cliente. As limitações de simulação do projeto continuam
documentadas; nenhum desses tópicos foi confundido com evidência funcional.

## Verificação depois da passada de correções

API raiz: 29/29. Todas as cinco suítes de navegador passaram depois das
correções: jornada 6, floresta 9, expansão 12, controles 8 e contas/admin 7
grupos, sem erros JavaScript. A regressão da floresta, que havia expirado
no fade, também passou. Não restam achados bloqueadores da revisão.
