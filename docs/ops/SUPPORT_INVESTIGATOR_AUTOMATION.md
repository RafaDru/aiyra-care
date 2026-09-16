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
| `.cursor/automations/support-report-investigator.workflow.json` | Import no editor |
| `.cursor/automations/support-report-investigator.yaml` | Referência legível |
| `docs/ops/automations/support-report-investigator.prompt.md` | Playbook do agente |

**Import único:**

1. Abra **Automations** no Cursor (`Ctrl+Shift+P` → «Automations»).
2. Create → importe `.cursor/automations/support-report-investigator.workflow.json`  
   ou peça ao agente no chat: «abre a automation investigador suporte».
3. Confira trigger webhook + repo + prompt.
4. **Salvar** → copie a URL do webhook.

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
| `docs/ops/automations/support-report-investigator.workflow.json` | Prefill Automation |
| `scripts/support-investigator-simulate.mjs` | Simulação local |
| `docs/ops/investigations/` | Saída das investigações |

---

## Troubleshooting

| Sintoma | Ação |
|---------|------|
| Só toast, sem agente | `CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_URL` ausente ou API não reiniciada |
| Automation não dispara | URL expirada/regenerada — copiar nova URL do editor |
| Agente sem arquivo | Ver Runs da Automation; prompt pode precisar de commit do playbook no `main` |
| 401 no webhook | Conferir auth configurada no editor da Automation |
