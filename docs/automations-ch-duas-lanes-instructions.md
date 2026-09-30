# Command Hub — lanes de Automation (índice)

Três webhooks Cursor no ops-console / API:

| Lane | Automation (UI) | Env URL / KEY | Disparo |
|------|-----------------|---------------|---------|
| Triagem Suporte Dev | Aiyra - Triador (dev) | `CURSOR_DEVELOPMENT_SUPPORT_*` | Investigação de `support_report` / fila |
| Triagem SRE | Aiyra - Triador SRE | `CURSOR_SRE_SUPPORT_*` | Alertas `ops_alert` |
| **Correção Dev** | **Aiyra - Correção Dev** | **`CURSOR_DEFECT_FIX_*`** | **`POST /api/platform-defects/:id/start-fix`** |

## Instructions completas

- Triagem Suporte: `docs/ops/automations/support-report-investigator.prompt.md`
- Triagem SRE: `docs/ops/automations/ops-alert-investigator.prompt.md`
- **Correção Dev:** [`automations-aiyra-correcao-dev-instructions.md`](./automations-aiyra-correcao-dev-instructions.md)

Gates Tier 1: `docs/ops/automations/TIER1_GATES.md`

Saúde webhooks: `GET /api/incident-dispatch/health` → `webhooks.developmentSupport`, `webhooks.sreSupport`, `webhooks.defectFix`.
