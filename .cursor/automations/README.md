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

## Duas lanes (nomes finais no Cursor)

| Lane | Nome na UI | JSON |
|------|------------|------|
| Suporte Desenvolvimento | **AiCare - Suporte ao Desenvolvimento** | `support-report-investigator.workflow.json` |
| Suporte SRE | **AiCare - Suporte SRE** | `ops-alert-investigator.workflow.json` |

Tier 0 (default) e Tier 1 (`OPS_INVESTIGATOR_TIER1=1`) usam **as mesmas** duas Automations — o tier vem no payload (`investigation.tier`).

## Reimportar após mudança no JSON

1. Pedir ao agente: «reimporte as automations ops» — abre o prefill no Glass Automations.
2. **Ou** `Ctrl+Shift+P` → **Automations** → Create → importar o `.workflow.json`.
3. Confira: trigger **Webhook**, repo `RafaDru/aiyra-care`, branch `main`, prompt com Tier 0/1.
4. **Salvar** (se for automation nova, copie a URL; se editou a existente, a URL **não muda**).
5. Validar: `npm run ops:support-investigator:simulate` e `npm run ops:alert-investigator:simulate`

## Suporte Desenvolvimento

| Arquivo | Uso |
|---------|-----|
| `support-report-investigator.workflow.json` | Prefill / import |
| `support-report-investigator.yaml` | Referência legível |
| `../docs/ops/automations/support-report-investigator.prompt.md` | Playbook |

```env
CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_URL=<url>
CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_KEY=crsr_...
```

Runbook: `docs/ops/SUPPORT_INVESTIGATOR_AUTOMATION.md`

## Suporte SRE

| Arquivo | Uso |
|---------|-----|
| `ops-alert-investigator.workflow.json` | Prefill / import |
| `../docs/ops/automations/ops-alert-investigator.prompt.md` | Playbook |

```env
CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_URL=<url>
CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_KEY=crsr_...
```

Sem vars SRE, alertas usam webhook de Desenvolvimento (fallback legado).
