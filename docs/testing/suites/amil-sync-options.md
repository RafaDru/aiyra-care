# Suite — `amil-sync-options`

| Campo | Valor |
|-------|--------|
| **ID** | `amil-sync-options` |
| **Feature** | [`beneficiary-view-filter`](../../features/amil-sync-options.md) |
| **Lane** | `integration-portal` |
| **Fixture** | `portal-amil-qa` (link Amil `sessionReady`) |
| **parallelSafe** | `true` |
| **Automação** | `blocked` (portal WAF) |

## Pré-requisitos

- [ ] Paciente com link Amil ativo e sessão válida
- [ ] `AMIL_CDP_URL` ou token salvo conforme [`AGENTS.md`](../../../AGENTS.md)
- [ ] Ambiente dev ou preview

## Passos

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Abrir paciente Ana (demo) → Integrações | Link Amil visível | |
| 2 | Abrir modal sync Amil | Campos marca ótica, período início/fim | |
| 3 | Selecionar beneficiário e período 90 dias | Params `amilMarcaOtica`, `amilUtilizationStart/End` enviados | |
| 4 | Iniciar sync (manual, não silent) | Job criado; modal progresso | |
| 5 | Aguardar conclusão | Status completed; autorizações no período | |
| 6 | Repetir com período menor | Delta respeitado (menos chamadas) | |

## Notas

- Opcional para gate `main` — lane `integration-portal`
- Não rodar em paralelo com outro sync na **mesma** conta portal
