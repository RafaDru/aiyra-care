# Piloto DEF-000005 — QA-CYCLE smoke (2026-10-13)

| Campo | Valor |
|-------|--------|
| `referenceCode` | DEF-000005 |
| PR piloto (fake) | https://github.com/RafaDru/aiyra-care/pull/999001 |
| Suite | `ops-ch-cycle-close` · ritual C9 |

## Objetivo

Validar fechamento G3/G4 no CH (CI/review webhook + merge) **sem** merge real em `main`, para que o defeito não permaneça em **Abertos** na fila de produção/integração.

## Encerramento (agente / notebook)

```bash
# ops-console :3013 + API :3010 no ar; DEF-000005 existente no PG
npm run ch:qa-cycle-pilot-finalize -- --ref DEF-000005

# Só simular webhook G4 (exige GITHUB_DEFECT_MERGE_WEBHOOK_SECRET)
npm run ch:qa-cycle-pilot-finalize -- --ref DEF-000005 --webhook-only

# Dry-run
npm run ch:qa-cycle-pilot-finalize -- --ref DEF-000005 --dry-run
```

**Resultado esperado:**

- `platform_defects.status = fixed` (`fixed_via` = `github_webhook` ou `manual`)
- `prUrl` / `mergedPrUrl` = PR piloto quando webhook aplicado
- Incidentes em `platform_defect_incidents` → `incident_pipeline_status = resolved` (CH **Resolvidos**)
- Filtro CH **Defeitos → Abertos** não lista mais DEF-000005

## UI (regressão desta entrega)

- Stepper **Ciclo** no expand do defeito: labels verticais + scroll horizontal — sem sobreposição «Detectado» / «Em correção»
- **Incidentes vinculados:** lista ou vazio; não permanece em «Carregando…» após falha de rede ou re-render do painel

## Referências

- [`SOLO_OPERATOR_RUNBOOK.md`](../SOLO_OPERATOR_RUNBOOK.md) §6 (piloto QA-CYCLE)
- [`CH_CYCLE_CLOSE_SPEC.md`](../CH_CYCLE_CLOSE_SPEC.md) — declaração C9
