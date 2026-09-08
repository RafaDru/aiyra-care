# Suite — `hygiene-dedup-ui`

| Campo | Valor |
|-------|--------|
| **ID** | `hygiene-dedup-ui` |
| **Feature** | [`hygiene-neo4j-candidate`](../../features/hygiene-neo4j-candidates.md) |
| **Lane** | `feature` |
| **Fixture** | `core-demo` + candidatos duplicata no PG/Neo4j |
| **parallelSafe** | `true` |
| **Automação** | `planned` |

## Pré-requisitos

- [ ] `NEO4J_SYNC_ENABLED=1` se testar grafo
- [ ] Pelo menos um par DUPLICATE_CANDIDATE na massa (seed ou criado manualmente)

## Passos

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Abrir perfil paciente com duplicatas | UI higienização ou candidatos visível | |
| 2 | Listar candidatos | Par exame/vacina exibido | |
| 3 | Resolver como duplicata / manter distinto | Estado atualiza; lista diminui | |
| 4 | Recarregar página | Decisão persistida | |
