# Cursor Automations (rascunhos no repo)

Definições versionadas para **criar manualmente** no **Cursor → Automations**.

> **2026-09-18:** a UI do Cursor **não** oferece «Import workflow JSON». Use os passos abaixo; os arquivos `*.workflow.json` são **somente referência** (espelho do que deve estar na conta).

## Importante

O Cursor **não** carrega estes arquivos automaticamente ao abrir ou reiniciar o IDE (ainda não há config-as-code oficial como em `.cursor/rules/`).

**Uma vez** você cria a Automation na UI e salva; depois ela fica na sua conta Cursor até você apagar.

### Ambientes (dev / staging)

- **Mesmas** Automations e **mesmas** vars `CURSOR_*_WEBHOOK_*` no `.env` — compartilhadas entre integração e preview.
- Cada stack define só `DEPLOYMENT_TIER` e URLs ops (`OPS_ALERT_DASHBOARD_URL`, etc.) no `.env` ou `.env.preview`.
- O webhook inclui `environment.deploymentTier` e `environment.apiPublicUrl` — o agente não infere ambiente pela porta.

Hub ops: `docs/ops/AUTOMATIONS_LANES.md` · handoff backend: `docs/coordination/CURSOR_RETURN_PATH.md`

## Criar na UI (todas as lanes)

1. **Cursor → Automations → New automation** (ou **Create**).
2. **Nome** — ver tabela abaixo.
3. **Trigger:** **Webhook** (HTTP).
4. **Repository:** `RafaDru/aiyra-care` · branch **`main`**.
5. **Instructions / prompt:** copie o bloco `instructions:` do `*.yaml` correspondente (ou o texto em `workflow.prompts[0]` no `.workflow.json` de referência).
6. **Modelo:** `composer-2.5` (ou equivalente); memória ligada se disponível.
7. **Salvar** → copie a **URL do webhook** e gere o **auth header** (`crsr_...`, Bearer).
8. Configure secrets / `.env` conforme a lane (tabelas abaixo).

Para **atualizar** o prompt depois de mudança no repo: edite a Automation existente na UI, cole o prompt novo, salve — a **URL do webhook não muda**.

## Três lanes

| Lane | Nome na UI | Prompt (colar na UI) | JSON (referência) |
|------|------------|----------------------|-------------------|
| Backend handoff | **AiCare - Backend handoff (Claude→Cursor)** | `backend-task-cursor-handoff.yaml` | `backend-task-cursor-handoff.workflow.json` |
| Suporte Desenvolvimento | **AiCare - Suporte ao Desenvolvimento** | `support-report-investigator.yaml` | `support-report-investigator.workflow.json` |
| Suporte SRE | **AiCare - Suporte SRE** | `ops-alert-investigator.workflow.json` → `prompts[0]` | `ops-alert-investigator.workflow.json` |

### Backend handoff (GitHub Actions)

Secrets no repositório `RafaDru/aiyra-care`:

```env
CURSOR_BACKEND_HANDOFF_WEBHOOK_URL=<url da Automation>
CURSOR_BACKEND_HANDOFF_WEBHOOK_KEY=crsr_...
```

Runbook: `docs/coordination/CURSOR_RETURN_PATH.md` · workflow: `.github/workflows/backend-task-handoff.yml`

### Suporte Desenvolvimento

| Arquivo | Uso |
|---------|-----|
| `support-report-investigator.yaml` | Prompt para colar na UI |
| `support-report-investigator.workflow.json` | Referência — criar manualmente na UI |
| `../docs/ops/automations/support-report-investigator.prompt.md` | Playbook do agente |

```env
CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_URL=<url>
CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_KEY=crsr_...
```

Runbook: `docs/ops/SUPPORT_INVESTIGATOR_AUTOMATION.md`

### Suporte SRE

| Arquivo | Uso |
|---------|-----|
| `ops-alert-investigator.workflow.json` | Referência — prompt em `workflow.prompts[0]` |
| `../docs/ops/automations/ops-alert-investigator.prompt.md` | Playbook |

```env
CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_URL=<url>
CURSOR_SRE_SUPPORT_AUTOMATION_WEBHOOK_KEY=crsr_...
```

Sem vars SRE, alertas usam webhook de Desenvolvimento (fallback legado).

Tier 0 (default) e Tier 1 (`OPS_INVESTIGATOR_TIER1=1`) usam **as mesmas** duas Automations ops — o tier vem no payload (`investigation.tier`).

## Validar

- Handoff: PR `task/*` com `[TASK-…]` ou fila em `review` (ver `CURSOR_RETURN_PATH.md`).
- Ops: `npm run ops:support-investigator:simulate` e `npm run ops:alert-investigator:simulate`
