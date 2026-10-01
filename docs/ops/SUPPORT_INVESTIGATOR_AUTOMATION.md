# Suporte Desenvolvimento — Cursor Automation (Tier 0)

> Webhook `support_report` → agente no monorepo → rascunho em `docs/ops/investigations/`

## Arquitetura

```text
POST /support/reports
        │
        ├─► OPS_ALERT_WEBHOOK_URL (:3012)     → toast Windows + console Suporte
        │
        └─► CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_URL → Cursor Automation (agente)
                    │
                    └─► docs/ops/investigations/YYYY-MM-DD-<id>.md
```

Canais **independentes**: o notificador local e a Automation recebem o mesmo payload (investigator inclui `investigation: { tier: 0 }`).

**Ambiente:** `environment.deploymentTier` (`integration` \| `preview` \| `production`) vem de `DEPLOYMENT_TIER` na API que disparou — não infira pela porta. As vars `CURSOR_*_WEBHOOK_*` podem ficar **só no `.env`** (mesma Automation para dev e preview).

---

## 1. Criar a Automation no Cursor

> **Reiniciar o Cursor não basta.** Os arquivos em `.cursor/automations/` são rascunhos versionados; a Automation só existe na sua conta **depois de salvar** no editor.

| Campo | Valor |
|-------|--------|
| **Nome** | AiyraCare — Suporte Desenvolvimento (Tier 0) |
| **Trigger** | HTTP webhook |
| **Repo** | `RafaDru/aiyra-care` · branch `main` |
| **Modelo** | Composer 2.5 (ou equivalente com reasoning) |

**Arquivos canônicos:**

| Caminho | Papel |
|---------|--------|
| `.cursor/automations/support-report-investigator.yaml` | **Prompt para colar** na UI |
| `.cursor/automations/support-report-investigator.workflow.json` | Referência — criar manualmente na UI |
| `docs/ops/automations/support-report-investigator.prompt.md` | Playbook do agente |

**Criação única (sem import JSON — a UI não oferece import):**

1. Abra **Automations** no Cursor (`Ctrl+Shift+P` → «Automations»).
2. **New automation** → nome **AiCare - Suporte ao Desenvolvimento**.
3. Trigger **Webhook** · repo `RafaDru/aiyra-care` · branch `main`.
4. Cole o bloco `instructions:` de `support-report-investigator.yaml` no campo de prompt.
5. **Salvar** → copie a URL do webhook e o auth header (`crsr_...`).

---

## 2. Configurar a API

```env
# Notificação local (toast) — já existente
OPS_ALERT_WEBHOOK_URL=http://127.0.0.1:3012/ops-alert

# Agente investigador (após salvar a Automation)
CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_URL=https://api2.cursor.sh/automations/webhook/...
CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_KEY=crsr_...   # «Generate auth header» no trigger Webhook
```

O token **não** é a URL — na mesma tela do webhook, clique **Generate auth header** (ou **Copy auth header**) e cole só o `crsr_...`.

Reinicie a API após alterar `.env`.

Implementação: `packages/api/src/application/support-report/support-report-dispatch.ts` → `dispatchSupportReportNotifications()`.

### Checklist `.env` ↔ painel Cursor (lane Dev)

**Fonte da verdade:** URL e auth header (`crsr_…`) vêm do editor da Automation no Cursor (trigger Webhook). O `.env` deve espelhar **exatamente** o que o painel mostra hoje — não use URL/key de print antigo ou de outro dev.

| Passo | Ação |
|-------|------|
| 1 | Cursor → **Automations** → `AiCare - Suporte ao Desenvolvimento` → copiar **Webhook URL** → `CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_URL` |
| 2 | Mesma tela → **Generate / Copy auth header** → só o token `crsr_…` → `CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_KEY` |
| 3 | Opcional callback agente: `OPS_INVESTIGATOR_CALLBACK_KEY` (ou fallback `OPS_METRICS_KEY`) — header `x-investigator-callback-key` em `POST :3013/api/analysis-queue/callback` |
| 4 | Link no payload: `OPS_ALERT_DASHBOARD_URL` — se usar `http://127.0.0.1:5173/ops`, a API **reescreve** para ops-console `http://127.0.0.1:3013` no `callbackUrl` / `dashboardUrl` |
| 5 | **Reiniciar** processos que leem `.env`: API `:3010` e ops-console `:3013` (worker de outbox embutido) |
| 6 | Validar: `curl -s http://127.0.0.1:3013/api/incident-dispatch/health` — lanes `developmentSupport` / `sreSupport` com `ready: true` quando URL+key corretas |
| 7 | Se outbox ficou `dead` após key errada: corrigir `.env` → reiniciar → `npm run ch-incident-dispatch-backfill -- --reset-dead` → `npm run ch-incident-dispatch-worker:once` (ou **Nova tentativa** no CH) |

Lane SRE (`CURSOR_SRE_SUPPORT_*`, payload `ops_alert`): mesma regra URL/key — ver [`AUTOMATIONS_LANES.md`](./AUTOMATIONS_LANES.md).

> **Dev local:** agente Cursor na nuvem **não alcança** `127.0.0.1:3013` no callback — use preview público ou conclua manualmente no CH até GCP.

---

## 3. Validar comportamento

### A) Simulação sem app (script)

```powershell
# Com URL da Automation no .env:
npm run ops:support-investigator:simulate
```

Envia payload de teste para notificador **e** Automation. Esperado:

| Destino | Resultado |
|---------|-----------|
| Notificador `:3012` | Toast «Novo chamado» |
| Cursor Automation | Nova execução na aba Runs da Automation |
| Repo (após agente) | Arquivo em `docs/ops/investigations/` |

### B) Fluxo real no app

1. `npm run ops:notifier:up`
2. API + web rodando
3. App → **Reportar problema** (categoria técnica, consentimento técnico on)
4. Toast + run da Automation + markdown de investigação

### C) Checklist da primeira run

- [ ] Payload sem PHI (sem `accountId`, sem descrição livre)
- [ ] `investigationId` igual na aba Issues, no toast e no histórico Automations (`[inv:…]` no `text`)
- [ ] Agente citou `investigationId` + `reportId` e rota
- [ ] Arquivo `docs/ops/investigations/*.md` criado (prefixo 8 chars do investigationId)
- [ ] Nenhum PR automático (Tier 0)
- [ ] Falha da Automation **não** bloqueia o usuário no app

---

## 4. Tier 1 — PR draft (opt-in)

```env
OPS_INVESTIGATOR_TIER1=1   # default off — Tier 0 permanece o padrão
```

| Condição | Tier |
|----------|------|
| `technical_bug` + `consentTechnical` | 1 |
| Outras categorias / sem consentimento | 0 |

O payload inclui `investigation: { tier, playbook, trigger }`. Tier 1 permite PR **draft** dentro dos gates (`docs/ops/automations/TIER1_GATES.md`). Callback pode incluir `prUrl` — aparece na aba Issues.

**Rollback:** `OPS_INVESTIGATOR_TIER1=0` → só markdown, sem alterar Automations.

---

## 5. Correlação (`investigationId`)

| Onde | Campo |
|------|--------|
| Webhook | `investigationId` (= `analysisQueue.id`) |
| Console Issues / Suporte | coluna `investigationId` |
| Toast | `Investigation: <uuid>` |
| Deep link | `?tab=issues&investigationId=<uuid>` |
| Callback | `{ "investigationId": "…" }` |

Runbook: [`INVESTIGATION_CORRELATION.md`](./INVESTIGATION_CORRELATION.md)

---

## Arquivos

| Arquivo | Papel |
|---------|--------|
| `docs/ops/automations/support-report-investigator.prompt.md` | Playbook do agente |
| `.cursor/automations/support-report-investigator.workflow.json` | Referência (espelho da UI) |
| `scripts/support-investigator-simulate.mjs` | Simulação local |
| `docs/ops/investigations/` | Saída das investigações |

---

## Troubleshooting

| Sintoma | Ação |
|---------|------|
| Só toast, sem agente | `CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_URL` ausente ou API não reiniciada |
| Automation não dispara | URL expirada/regenerada — copiar nova URL do editor |
| Agente sem arquivo | Ver Runs da Automation; prompt pode precisar de commit do playbook no `main` |
| HTTP **400** / **401** no dispatch (`last_error` outbox) | **Key mismatch:** token no `.env` ≠ auth header atual do painel Cursor. Regenerar/copiar de novo o `crsr_…` na Automation e atualizar `CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_KEY`; conferir também URL idêntica à do webhook. Reiniciar API `:3010` + ops `:3013`. |
| `webhook_key_missing` / skipped | `CURSOR_*_WEBHOOK_KEY` vazio — colar key do painel |
| `ready: false` no health | Falta URL ou KEY de uma lane — ver `GET :3013/api/incident-dispatch/health` |
| Outbox `dead` após várias falhas | Corrigir `.env` → `--reset-dead` + worker once — ver [`CH_INCIDENT_DEFECT_PIPELINE.md`](./CH_INCIDENT_DEFECT_PIPELINE.md) §4 |
| Callback do agente falha | `OPS_INVESTIGATOR_CALLBACK_KEY` ou `OPS_METRICS_KEY` no ops-console; URL pública se agente na nuvem |
