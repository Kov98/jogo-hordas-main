# Admin, porta branca e legião — implementação

> **For agentic workers:** usar subagent-driven-development/executing-plans.

**Objetivo:** corrigir a faixa que encobre controles no admin, preencher de branco
a porta aberta do Castelo e acrescentar cinco inimigos comuns ao Inferno.
**Arquitetura:** manter DOM/CSS e pixel art procedural existentes; reutilizar
os comportamentos de IA e pools. Chrome/API sequenciais no coordenador.
**Decisões de implementação:** abertura sólida branca e luz branca apenas após
o primeiro chefe; cinco silhuetas e combinações de ataques distintas; IDs e
inimigos anteriores preservados. E/Enter continua iniciando a travessia.

- [x] Reproduzir a faixa do admin com geometria/hit-test e corrigir sem sobreposição.
- [x] Porta fechada escura, abertura branca, bloom/spill brancos e colisão preservada.
- [x] Cinco espécies adicionais no catálogo, arte, progressão de spawn e admin/API.
- [x] Testes leves de catálogo/IA/arte/porta, HTTP focado e Chrome com capturas.
- [x] Revisão independente e documentação do resultado.

**Divisão:** agente admin cuida CSS/DOM/helper de layout; agente porta cuida
forest.js/forest-art.js e teste de luz; agente inimigos cuida catálogo/arte,
catacombs_checks e inferno_legion_checks. Coordenador integra server.py,
tests/test_accounts.py e testes de navegador, documentação e verificação.
