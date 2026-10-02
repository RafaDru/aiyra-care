# Suite — `mobile-ava-companion-smoke`

| Campo | Valor |
|-------|--------|
| **ID** | `mobile-ava-companion-smoke` |
| **Feature** | `mobile-app-shell` |
| **Lane** | `mobile` |
| **Bloco** | `3-ava` |
| **Fixture** | `core-demo` |
| **Automação** | `manual` |
| **Espelha** | `ava-companion-smoke` (web) — ver [`AVA_QA_SCOPE.md`](../AVA_QA_SCOPE.md) |

## Passos

| # | Ação | Esperado |
|---|------|----------|
| 1 | Qualquer tela autenticada → FAB **Ava** | Modal de chat abre |
| 2 | Trocar **lente** de paciente | Chip/lista; nome atualizado |
| 3 | Enviar: «Olá, resuma o que você vê neste perfil.» | Bubble assistant (sem 5xx) |
| 4 | Fechar e reabrir | Lente persistida (AsyncStorage) |

## Não avaliar

Qualidade clínica do texto LLM.

## Estrutural

```bash
npm run mobile:check
```
