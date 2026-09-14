# Cursor Automations (rascunhos no repo)

Definições versionadas para importar no **Cursor → Automations**.

## Importante

O Cursor **não** carrega estes arquivos automaticamente ao abrir ou reiniciar o IDE (ainda não há config-as-code oficial como em `.cursor/rules/`).

**Uma vez** você importa/cria a Automation na UI; depois ela fica na sua conta Cursor até você apagar.

### Ambientes (dev / staging)

- **Mesmas** Automations e **mesmas** vars `CURSOR_*_WEBHOOK_*` no `.env` — compartilhadas entre integração e preview.
- Cada stack define só `DEPLOYMENT_TIER` e URLs ops (`OPS_ALERT_DASHBOARD_URL`, etc.) no `.env` ou `.env.preview`.
- O webhook inclui `environment.deploymentTier` e `environment.apiPublicUrl` — o agente não infere ambiente pela porta.

Hub: `docs/ops/AUTOMATIONS_LANES.md`

## Suporte Desenvolvimento (Tier 0)

| Arquivo | Uso |
|---------|-----|
| `support-report-investigator.workflow.json` | Importar no editor (JSON prefill) |
| `support-report-investigator.yaml` | Referência legível + prompt inline |
| `../docs/ops/automations/support-report-investigator.prompt.md` | Playbook completo |

### Passos (import único)

1. `Ctrl+Shift+P` → **Automations** (ou janela Agents / Glass Automations).
2. **Create** → importar `.cursor/automations/support-report-investigator.workflow.json`  
   **ou** pedir ao agente: «abre a automation do investigador de suporte».
3. Trigger: **Webhook** · Repo: `RafaDru/aiyra-care` · branch `main`.
4. **Salvar** → copiar URL do webhook.
5. `.env`:
   ```env
   CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_URL=<url>
   ```
6. Validar: `npm run ops:support-investigator:simulate`

Runbook: `docs/ops/SUPPORT_INVESTIGATOR_AUTOMATION.md`

## Suporte SRE (Tier 0)

| Arquivo | Uso |
|---------|-----|
| `ops-alert-investigator.workflow.json` | Importar no editor |
| `../docs/ops/automations/ops-alert-investigator.prompt.md` | Playbook |

Webhook **dedicado** (recomendado se você tem duas Automations):

```env
CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_URL=<url>
CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_KEY=crsr_...
```

Sem essas vars, alertas SRE usam o webhook de Suporte Desenvolvimento (fallback).

Validar: `npm run ops:alert-investigator:simulate`
