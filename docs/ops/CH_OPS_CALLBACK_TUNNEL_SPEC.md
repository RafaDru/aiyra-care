# CH — Callbacks, túnel HTTPS e webhooks GitHub

**Status:** spec operacional (2026-10-06)  
**Épico:** `prod-run-intelligence` · desbloqueia automações **nuvem** + GitHub → notebook  
**Relacionado:** [`SOLO_OPERATOR_RUNBOOK.md`](./SOLO_OPERATOR_RUNBOOK.md) §10 · [`CH_ACCESS.md`](./CH_ACCESS.md) · [`AUTOMATIONS_LANES.md`](./AUTOMATIONS_LANES.md) · G3 [`CH_G3_AGENTIC_APPROVAL.md`](./CH_G3_AGENTIC_APPROVAL.md)

---

## 1. Problema

| Origem | Destino | Sem túnel |
|--------|---------|-----------|
| Cursor Automation (nuvem) | `POST :3013/api/.../callback` | Falha — `127.0.0.1` inalcançável |
| GitHub webhooks | notebook `:3013` | Falha — GitHub exige URL pública HTTPS |

**Notebook-only** (agente local / worker na mesma máquina): `http://127.0.0.1:3013` basta para callbacks manuais e testes vitest.

---

## 2. Variáveis canônicas

| Variável | Obrigatória | Formato | Uso |
|----------|-------------|---------|-----|
| `OPS_CONSOLE_PUBLIC_URL` | Sim, se automação **nuvem** ou webhook GitHub no notebook | `https://host` **sem** barra final | Base para montar `callbackUrl`, `triageStartedUrl`, `review-callback` |
| `OPS_INVESTIGATOR_CALLBACK_KEY` | Fortemente recomendada | segredo longo | Header `x-investigator-callback-key` em callbacks Automation |
| `OPS_METRICS_KEY` | Fallback | segredo ops | Aceito se investigator key vazio (`resolveInvestigatorCallbackAuth`) |
| `OPS_ALERT_DASHBOARD_URL` | Opcional | URL web ops | **Precedência** sobre `OPS_CONSOLE_PUBLIC_URL` em `resolveOpsConsoleBaseUrl` — ver §4 |
| `OPS_CONSOLE_HOST` / `OPS_CONSOLE_PORT` | Default `127.0.0.1` / `3013` | | Fallback localhost quando URLs públicas ausentes |

Reiniciar **API `:3010`** e **ops-console `:3013`** após alterar env (dispatch monta URLs na API).

---

## 3. Padrões de túnel (Cloudflare)

### 3.1 Quick tunnel (dev / piloto)

```bash
cloudflared tunnel --url http://127.0.0.1:3013
```

Copiar host `https://….trycloudflare.com` → `OPS_CONSOLE_PUBLIC_URL`.

| Prós | Contras |
|------|---------|
| Zero DNS | URL muda a cada restart |
| HTTPS imediato | Não adequado para webhook GitHub permanente sem atualizar URL |

### 3.2 Named tunnel (recomendado notebook estável)

1. Conta Cloudflare Zero Trust → **Networks** → **Tunnels**.
2. Connector no notebook → `ingress` HTTP → `http://localhost:3013`.
3. Hostname fixo ex. `ch-callbacks.seudominio.dev` → `OPS_CONSOLE_PUBLIC_URL=https://ch-callbacks.seudominio.dev`.
4. Opcional: **Cloudflare Access** service token para rotas `/api/*` (futuro hardening).

### 3.3 Preview local (`:3023`)

Mesmo padrão com `http://127.0.0.1:3023` e `DEPLOYMENT_TIER=preview` — **não** misturar secrets integration vs preview.

### 3.4 GCP / produção futura

`OPS_CONSOLE_PUBLIC_URL` = URL do serviço ops-console publicado; sem túnel no notebook. GitHub webhooks apontam para o mesmo host.

---

## 4. Resolução de base URL (armadilhas)

Ordem em `resolveOpsConsoleBaseUrl()`:

1. `OPS_ALERT_DASHBOARD_URL`
2. `OPS_CONSOLE_PUBLIC_URL`
3. Se URL termina em `:5173/ops` → reescreve para `http://{OPS_CONSOLE_HOST}:{OPS_CONSOLE_PORT}` (legado web proxy)
4. Senão `http://127.0.0.1:3013`

**Checklist:**

- Com túnel ativo, definir `OPS_CONSOLE_PUBLIC_URL` e **evitar** `OPS_ALERT_DASHBOARD_URL` apontando para localhost — ou deixar vazio para copiar do público (`scripts/ops-console-up.ps1`).
- Validar payload webhook triagem: campo `analysisQueue.callbackUrl` deve ser HTTPS público, não `127.0.0.1`.

---

## 5. Mapa de callbacks (Automation → CH)

| Rota | Payload / lane | Auth header |
|------|----------------|-------------|
| `POST /api/analysis-queue/callback` | Triagem Agent 1, suporte, ops alert | `x-investigator-callback-key` |
| `POST /api/analysis-queue/:id/triage-started` | Passo 0 triagem (sem LLM) | idem |
| `POST /api/platform-defects/callback` | Correção Agent 2 (`defect_fix_v1`) | idem |
| `POST /api/platform-defects/review-callback` | Review Agent 3 (`defect_pr_review_v1`) | idem |
| `POST /api/platform-defects/:id/operator-approve-pr` | G3 agêntico | **v1:** rede local; spec auth em [`CH_G3_AGENTIC_APPROVAL.md`](./CH_G3_AGENTIC_APPROVAL.md) |

Montagem URLs: `ops-analysis-callback-url.ts` · saúde: `GET /api/incident-dispatch/health`.

---

## 6. Webhooks GitHub → ops-console

Servidas no **mesmo** host público que callbacks (túnel ou GCP).

| Rota | Eventos GitHub | Secret env | Efeito |
|------|----------------|------------|--------|
| `POST /api/webhooks/github/defect-ci` | `workflow_run`, `check_run` (repo `aiyra-care`) | `GITHUB_DEFECT_CI_WEBHOOK_SECRET` | Atualiza `pipeline_status`, CI fail → `in_fix` (#114 C3–C4) |
| `POST /api/webhooks/github/defect-merge` | `pull_request` closed merged | `GITHUB_DEFECT_MERGE_WEBHOOK_SECRET` | DEF `fixed`, INC `resolved` (R4) |

**Configuração notebook:**

1. `OPS_CONSOLE_PUBLIC_URL=https://<túnel>`
2. GitHub → Settings → Webhooks → Payload URL `https://<túnel>/api/webhooks/github/defect-ci` (e segundo webhook para `defect-merge` se separado).
3. Content type: `application/json` · SSL verify on · secret = env correspondente.
4. Eventos: CI — *Workflow runs* e/ou *Check runs*; merge — *Pull requests* (closed).

**Fallback sem webhook:** `CH_DEFECT_CI_POLL_INTERVAL_MS` + `GITHUB_OPS_TOKEN` no notebook (poll #114) — preferir webhook quando túnel estável.

**Triagem:** não usa webhook GitHub — só outbound Cursor → inbound callback.

---

## 7. Notebook vs automações cloud

| Modo | Callbacks | Webhooks GitHub | Quem executa |
|------|-----------|-----------------|--------------|
| **Notebook + worker local** | `localhost:3013` | Opcional poll CI; webhook só com túnel | Project / My Machines |
| **Notebook + túnel** | URL pública | defect-ci + defect-merge no host do túnel | Automations nuvem + GitHub |
| **Cloud agent sem notebook** | **Inviável** sem stack ops remoto | N/A | Requer GCP preview ops ou túnel sempre on |
| **Híbrido** | Túnel só durante piloto CH | Desligar túnel fora de janela → `dispatch_failed` / SLA D10 | Documentar em runbook |

Automações **não** devem embutir `127.0.0.1` no prompt — sempre usar `callbackUrl` / `callbackAuth` do payload.

---

## 8. Verificação (checklist agente)

1. `GET https://<OPS_CONSOLE_PUBLIC_URL>/health` → `200`, `commandHub: true`.
2. `GET /api/incident-dispatch/health` → webhooks configurados.
3. Disparar INC teste → payload webhook contém `callbackUrl` HTTPS.
4. `curl -X POST …/triage-started` com header investigator → `200`.
5. GitHub «Recent Deliveries» webhook CI → `200` (após PR defeito CH).

E2E correção: [`CORRECAO_DEV_E2E_CHECKLIST.md`](./CORRECAO_DEV_E2E_CHECKLIST.md) §1.4.

---

## 9. Segurança (mínimo)

- Rotacionar `OPS_INVESTIGATOR_CALLBACK_KEY` se vazamento; nunca commitar.
- Túnel quick: tratar URL como secreto operacional.
- Webhooks: validar `X-Hub-Signature-256` (implementado em ops-console).
- Não expor `:3013` na internet sem TLS (Cloudflare termina TLS).

---

## 10. Critérios de aceite (spec)

1. Operador agente consegue configurar túnel + env sem perguntar ao Rafael.
2. Tabela callbacks + webhooks cobre ciclo INC→merge.
3. Gap doc marca «notebook callback» como **documented** quando este spec + túnel nomeado existirem.
