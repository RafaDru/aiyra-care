# Suite — `ava-companion-smoke`

| Campo | Valor |
|-------|--------|
| **ID** | `ava-companion-smoke` |
| **Domínio** | `ava` |
| **Lane** | `ava`, `business-full` |
| **Fixture** | paciente com ao menos 1 exame ou registro |

Escopo: [`AVA_QA_SCOPE.md`](../AVA_QA_SCOPE.md).

## Passos

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Em qualquer tela autenticada, clicar **orb Ava** (FAB) | Drawer abre | |
| 2 | Selecionar **lente** = paciente `QA-*` ou demo | Chip de paciente visível | |
| 3 | Enviar: «Olá, resuma o que você vê neste perfil.» | Bubble assistant aparece (sem 5xx) | |
| 4 | Fechar e reabrir drawer | Estado coerente | |

## Não avaliar

- Correção clínica do texto — só presença de resposta.
