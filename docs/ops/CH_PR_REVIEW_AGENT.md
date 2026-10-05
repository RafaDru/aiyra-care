# CH — Agente 3: Revisão de PR (especificação autorizada)

**Data:** 2026-10-05 (Rafael)  
**Posição na pipeline:** após **Agent 1 Triador** (INC) e **Agent 2 Correção Dev** (DEF → `ready_for_pr`)  
**Épico:** `ch-solo-operator-journey` · fatia **R3**  
**Spec canônica (Project store):** `docs/ch-pr-review-agent-spec.md` no Agent Store do projeto.

**Relacionado:** [`CH_SOLO_OPERATOR_JOURNEY_SPEC.md`](./CH_SOLO_OPERATOR_JOURNEY_SPEC.md) §4.4 · [`AUTOMATIONS_LANES.md`](./AUTOMATIONS_LANES.md) · [`CORRECAO_DEV_E2E_CHECKLIST.md`](./CORRECAO_DEV_E2E_CHECKLIST.md) §6 · playbook Correção: [`../automations-aiyra-correcao-dev-instructions.md`](../automations-aiyra-correcao-dev-instructions.md)

---

## 1. Objetivo

Disparar um **terceiro agente** (Cursor Automation) que, para PRs ligados a defeitos CH em `ready_for_pr`, produz uma **revisão estruturada** em três dimensões — sem reexecutar a suite QA completa e **sem** mergear ou bloquear merge no GitHub (v1).

| Dimensão | Pergunta central | Saída |
|----------|------------------|--------|
| **1. Eficácia da correção** | O diff plausivelmente endereça o DEF/INC/fingerprint descrito na triagem? | `correctionEffectiveness`: `plausible` \| `uncertain` \| `unlikely` + evidência curta |
| **2. Riscos / impactos negativos** | Há regressão, escopo excessivo, migrations arriscadas, degradação ops? | `riskLevel`: `nulo` \| `baixo` \| `medio` \| `alto` \| `grave` + `riskSummary` |
| **3. Cibersegurança** | O PR introduz ou amplifica risco de segurança da aplicação? | `securityVerdict`: `pass` \| `concerns` \| `block` + `securityFindings[]` (complementa CI/SAST; não substitui) |

**Recomendação agregada (somente advisory):** `approve` \| `request_changes` \| `block` — operador **G3** decide merge (princípio **P5**).

---

## 2. Princípios e gates humanos (inalterados)

| Regra | Detalhe |
|-------|---------|
| **P5** | Merge em `main` só após aprovação explícita de Rafael; agente **recomenda**, nunca mergeia. |
| **G3** | Em `ready_for_pr`: solicitar review agêntico (opcional) + aprovar merge no GitHub. |
| **Não é QA** | Agente **não** roda `npm run qa:run` nem E2E; confia em evidências citadas no PR + diff + checks CI quando disponíveis. |
| **Escopo CH** | Apenas PRs vinculados a `platform_defects` via `pr_url` / dispatch review — não todo PR do monorepo. |
| **Ops tier** | Lane **ops tier 1** (mesmo universo que `defect_fix_v1` / investigador Tier 1): PR draft, allowlist, sem PHI. |

### Fora de escopo v1

- Auto-merge em `main`.
- Branch protection / required check GitHub que **bloqueie** merge por veredito do agente.
- Review agêntico em PRs sem defeito CH.
- Re-triagem ou nova rodada de Correção automática após `request_changes` (retorno à correção continua **manual** G2/G3 + `start-fix` com contexto).

---

## 3. Disparo (trigger)

### 3.1 Pré-condições (hard)

| Campo | Obrigatório |
|-------|-------------|
| `platform_defects.status` | `ready_for_pr` |
| `pr_url` | URL `https://github.com/.../pull/N` válida |
| Webhook review | `CURSOR_DEFECT_PR_REVIEW_AUTOMATION_WEBHOOK_URL` + `_KEY` configurados |
| Callback auth | `OPS_INVESTIGATOR_CALLBACK_KEY` ou `OPS_METRICS_KEY` |

Transição inválida (ex. `open`, `in_fix` sem PR) → HTTP **409** no `request-review`.

### 3.2 Modos de disparo

| Modo | Quem dispara | Env / UI |
|------|--------------|----------|
| **Manual (MVP default)** | Rafael no CH | Botão **Solicitar revisão agêntica** no detalhe do defeito |
| **Auto pós-ready** | ops-console após callback `ready_for_pr` ou job batch | `CH_AUTO_PR_REVIEW_ON_READY=1` (default **0**) |

**Idempotência:** segundo `request-review` com review **em andamento** (`review_status = running`) → `skipped: review_in_progress`. Com review **terminal** recente (`completed_at` &lt; `CH_PR_REVIEW_COOLDOWN_MS`, default 30 min) → `skipped: cooldown` salvo `force=1` no body.

### 3.3 Gate CI opcional

| Env | Comportamento |
|-----|----------------|
| `CH_PR_REVIEW_REQUIRE_CI_GREEN=0` (default MVP) | Dispara mesmo com CI pendente/falho; agente **deve** ler status dos checks e refletir em `ciSnapshot`. |
| `CH_PR_REVIEW_REQUIRE_CI_GREEN=1` | `request-review` retorna **412** se último snapshot CI ≠ `success` (requer R2 `pipeline_status` ou polling GitHub). |

**Batch vs per-PR**

| Estratégia | Uso |
|------------|-----|
| **Per-PR (default)** | Um webhook por defeito / PR — alinhado a operador solo e G3. |
| **Batch (opcional, fase 2)** | Job `runDefectPrReviewBatch()` no tick de `CH_DEFECT_PR_REVIEW_BATCH_INTERVAL_MS` (espelha cadência `defect_pr_batches`); processa até `CH_DEFECT_PR_REVIEW_BATCH_LIMIT` defeitos `ready_for_pr` sem `last_pr_review_at` ou com CI verde. **Não** substitui review manual; só auto quando `CH_AUTO_PR_REVIEW_ON_READY=1`. |

---

## 4. Automação Cursor (lane 4)

| Item | Valor |
|------|--------|
| **Nome UI** | `Aiyra - Revisão PR` |
| **Payload `type`** | `defect_pr_review_v1` |
| **Playbook** | `defect-pr-review-tier0` \| `defect-pr-review-tier1` |
| **Vars** | `CURSOR_DEFECT_PR_REVIEW_AUTOMATION_WEBHOOK_URL`, `CURSOR_DEFECT_PR_REVIEW_AUTOMATION_WEBHOOK_KEY` |
| **Origem HTTP** | `POST /api/platform-defects/:id/request-review` (ops-console `:3013`) |
| **Saúde** | `GET /api/incident-dispatch/health` → `webhooks.defectPrReview` |

Instruções texto plano (colar na UI): `docs/automations-aiyra-pr-review-instructions.md` (a criar na fatia de implementação; espelhar estrutura de `automations-aiyra-correcao-dev-instructions.md`).

### 4.1 Payload webhook (espelho `defect_fix_v1`)

```json
{
  "type": "defect_pr_review_v1",
  "defectId": "<uuid>",
  "defect": {
    "referenceCode": "DEF-000042",
    "title": "…",
    "fingerprint": "…",
    "triageSummary": "…",
    "triageArtifactPath": "docs/ops/investigations/….md",
    "applications": ["web", "api"],
    "remediationSummary": "… do callback Correção …"
  },
  "prUrl": "https://github.com/RafaDru/aiyra-care/pull/NNN",
  "branchName": "cursor/…",
  "investigationId": "<ops_analysis_queue.id — primário entre linkedIncidentIds>",
  "linkedIncidents": [
    { "id": "<uuid>", "referenceCode": "INC-000099", "fingerprint": "…" }
  ],
  "diffScope": {
    "mode": "pr_files",
    "baseRef": "main",
    "headRef": "cursor/…",
    "maxFiles": 40,
    "notes": "Agente deve usar gh pr diff / API GitHub; não checkout PHI"
  },
  "ciSnapshot": {
    "status": "success | failure | pending | unknown",
    "runUrl": "https://github.com/…/actions/runs/…",
    "failedJobs": ["ci / api"]
  },
  "priorReview": null,
  "environment": { "deploymentTier": "integration", "apiPublicUrl": "…" },
  "callbackUrl": "https://<ops-public>/api/platform-defects/review-callback",
  "callbackAuth": { "header": "x-investigator-callback-key", "value": "…" },
  "playbook": "defect-pr-review-tier1",
  "investigation": { "tier": 1, "playbook": "defect-pr-review-tier1", "trigger": "manual | auto_ready" },
  "text": "DEF-000042 · [defect:0e672818] Revisão PR: …"
}
```

**`investigationId`:** correlaciona com toast/console ([`INVESTIGATION_CORRELATION.md`](./INVESTIGATION_CORRELATION.md)). Preferir fila primária ligada ao defeito; senão primeiro de `linkedIncidentIds`.

**`diffScope`:** orientação para o agente; ops-console pode pré-preencher `headRef` de `branch_name`. Tier 1: respeitar allowlist `TIER1_PATH_ALLOWLIST` ao avaliar escopo.

### 4.2 Comportamento do agente (resumo)

1. `docs/AGENT_BOOTSTRAP.md` + `defect.triageArtifactPath` + diff do PR (`gh pr view`, `gh pr diff`, checks).
2. Avaliar as **três dimensões** (seção 1) com evidência em arquivos/linhas.
3. **Não** push, **não** merge, **não** alterar CI.
4. Opcional: comentário estruturado no PR (markdown com seções fixas) — link em `prReviewCommentUrl` no callback.
5. `POST` callback (seção 5).

### 4.3 Skill `aiyracare-review-security` (quando invocar no prompt)

Incluir no template de instruções: **sempre** aplicar mentalmente o checklist da skill `.cursor/skills/aiyracare-review-security/SKILL.md` na dimensão 3.

**Critérios para aprofundar (texto explícito no prompt — “siga a skill como roteiro”):**

- Novas rotas API, alteração em `security.plugin.ts`, auth/guards, `patient-access`.
- Credenciais, `CRYPTO_KEY`, tokens de portal, variáveis em logs.
- Endpoints públicos, share tokens, upload de arquivo.
- SQL raw, dependências novas com CVE conhecida (nota apenas).
- Webhooks (ex. Stripe) sem verificação de assinatura.
- Bypass de `COMPLIANCE_GATE`.

Se o diff toca **qualquer** item acima → `securityVerdict` no mínimo `concerns` até provar mitigação; `block` se exposição clara de segredo ou auth removida sem justificativa.

**Tier 1 / diff grande:** sugerir no comentário PR que Rafael rode review humano adicional; não spawnar subagentes automaticamente na v1.

---

## 5. Callback ops-console

### 5.1 Rota preferida (v1)

`POST /api/platform-defects/review-callback`

- Auth: header `x-investigator-callback-key` (= `OPS_INVESTIGATOR_CALLBACK_KEY` ou `OPS_METRICS_KEY`).
- Content-Type: `application/json`.

**Alternativa (não preferida):** extender `POST /api/analysis-queue/callback` com `kind: "defect_pr_review"` — só se unificar auditoria; manter corpo abaixo.

### 5.2 Corpo callback (sucesso)

```json
{
  "kind": "defect_pr_review_v1",
  "defectId": "<uuid>",
  "reviewId": "<uuid — id da linha defect_pr_reviews>",
  "investigationId": "<opcional — eco>",
  "status": "completed",
  "dimensions": {
    "correctionEffectiveness": {
      "verdict": "plausible",
      "summary": "Diff altera ActiveCareCircleProvider em AppLayout conforme artefato INC-…",
      "evidence": ["packages/web/src/layouts/AppLayout.tsx"]
    },
    "risk": {
      "level": "baixo",
      "summary": "Mudança localizada; sem migration."
    },
    "security": {
      "verdict": "pass",
      "summary": "Sem novas rotas nem segredos.",
      "findings": []
    }
  },
  "recommendation": "approve",
  "recommendationRationale": "…",
  "ciSnapshot": { "status": "success", "runUrl": "…" },
  "prReviewCommentUrl": "https://github.com/…/pull/N#issuecomment-…",
  "agentRunUrl": "https://cursor.com/agents/…"
}
```

**Falha do agente:**

```json
{
  "kind": "defect_pr_review_v1",
  "defectId": "<uuid>",
  "reviewId": "<uuid>",
  "status": "failed",
  "failureDetails": { "message": "…", "code": "blocked_scope | github_auth | …" }
}
```

**Recomendação → ação humana sugerida (não automática):**

| `recommendation` | UX CH |
|------------------|--------|
| `approve` | Habilitar atalho “Registrar aprovação para merge” (opcional R3b); Rafael ainda mergeia no GitHub |
| `request_changes` | Banner + copiar feedback para próximo `start-fix` (`reviewFeedback` no payload Correção — fatia futura) |
| `block` | Destaque vermelho; **não** impede merge GitHub v1 — operador decide |

Defeito permanece `ready_for_pr` salvo política futura R2 (CI fail → `in_fix`).

### 5.3 Persistência

**Tabela nova (recomendada):** `defect_pr_reviews` (migration **085+**)

| Coluna | Tipo | Notas |
|--------|------|--------|
| `id` | UUID PK | exposto como `reviewId` |
| `defect_id` | UUID FK → `platform_defects` | |
| `status` | `pending` \| `running` \| `completed` \| `failed` | |
| `trigger` | `manual` \| `auto_ready` \| `batch` | |
| `pr_url` | text | snapshot |
| `branch_name` | text | |
| `investigation_id` | UUID nullable | |
| `dimensions` | JSONB | estrutura §5.2 |
| `recommendation` | varchar | `approve` \| `request_changes` \| `block` |
| `recommendation_rationale` | text | |
| `ci_snapshot` | JSONB | |
| `pr_review_comment_url` | text | |
| `agent_run_url` | text | |
| `failure_details` | JSONB | |
| `started_at` / `completed_at` | timestamptz | |

**Colunas espelho em `platform_defects` (opcional, UI rápida):**

- `last_pr_review_id` UUID FK
- `last_pr_review_recommendation`
- `last_pr_review_at`
- `pipeline_status` = `review_pending` \| `review_failed` (quando R2 existir)

Índice: `(defect_id, completed_at DESC)`.

---

## 6. API ops-console (contratos)

| Método | Rota | Notas |
|--------|------|--------|
| `POST` | `/api/platform-defects/:id/request-review` | Body `{ "force": false }`; dispara webhook; cria `defect_pr_reviews` `pending`→`running` |
| `POST` | `/api/platform-defects/review-callback` | Agente → terminal |
| `GET` | `/api/platform-defects/:id/reviews` | Lista histórico (card + timeline) |

Dispatch: reutilizar padrão `startPlatformDefectFixWithDispatch` → `platform-defect-pr-review-dispatch.ts` (implementação).

---

## 7. UI Command Hub

**Tela:** Defeitos → detalhe (`ready_for_pr` ou histórico).

**Card:** «Revisão agêntica»

| Bloco | Conteúdo |
|-------|----------|
| Estado | Último review: running / concluído / falhou + timestamp |
| Dimensão 1 | Veredito eficácia + resumo |
| Dimensão 2 | Badge risco (`nulo`…`grave`) + texto |
| Dimensão 3 | Veredito segurança + lista curta de findings |
| Recomendação | Chip `approve` \| `request_changes` \| `block` + rationale |
| Ações | **Solicitar revisão** (primary); link **Comentário no PR**; **Abrir PR** |
| Override G3 | Checkbox explícito «Aprovar merge sem review agêntico» (já previsto na jornada R3) — fora do agente |

Timeline do detalhe: inserir nó `review_requested` → `review_completed` entre `ready_for_pr` e merge.

---

## 8. Variáveis de ambiente

| Variável | Default | Efeito |
|----------|---------|--------|
| `CURSOR_DEFECT_PR_REVIEW_AUTOMATION_WEBHOOK_URL` | — | URL webhook Automation |
| `CURSOR_DEFECT_PR_REVIEW_AUTOMATION_WEBHOOK_KEY` | — | Bearer `crsr_…` |
| `CH_AUTO_PR_REVIEW_ON_READY` | `0` | `1` = auto `request-review` ao aceitar callback `ready_for_pr` |
| `CH_PR_REVIEW_REQUIRE_CI_GREEN` | `0` | `1` = gate CI antes do dispatch |
| `CH_PR_REVIEW_COOLDOWN_MS` | `1800000` | Idempotência entre reviews |
| `CH_DEFECT_PR_REVIEW_BATCH_INTERVAL_MS` | `0` | Batch desligado |
| `CH_DEFECT_PR_REVIEW_BATCH_LIMIT` | `5` | Máx. por tick batch |
| `GITHUB_OPS_TOKEN` | — | Leitura checks/diff no dispatch (se já usado em R2) |
| `OPS_CONSOLE_PUBLIC_URL` | — | `callbackUrl` público para agente nuvem |

Reiniciar API `:3010` e ops-console `:3013` após alterar `CURSOR_*`.

---

## 9. MVP rollout

1. **Docs + Automation vazia** na conta Cursor (webhook URL/key no `.env`).
2. Migration `defect_pr_reviews` + rotas callback/request-review.
3. CH: card + botão **Solicitar revisão** apenas (`CH_AUTO_PR_REVIEW_ON_READY=0`).
4. Piloto: um DEF `ready_for_pr` com PR draft (Tier 1) → review manual → validar callback + card.
5. Habilitar `CH_AUTO_PR_REVIEW_ON_READY=1` no notebook solo após 3 reviews bons.
6. Suite QA: estender `docs/testing/suites/ops-ch-defeitos.md` com passos review (mock callback).

---

## 10. Critérios de aceite (R3)

1. Só dispara com `ready_for_pr` + `prUrl` válido.
2. Callback persiste três dimensões + `recommendation` consultável no CH.
3. Agente não mergeia; GitHub branch protection inalterada v1.
4. P5: merge continua 100% humano.
5. `GET /api/incident-dispatch/health` expõe readiness da lane review.
6. Instruções Automation citam skill security nos critérios §4.3.

---

## 11. Roadmap

| Fatia | Entrega |
|-------|---------|
| **R3 (esta spec)** | Automation + env + callback + UI card + manual trigger |
| **R3b** | `reviewFeedback` no `defect_fix_v1`; override UI documentado |
| **R2 dependency** | `CH_PR_REVIEW_REQUIRE_CI_GREEN=1` útil com `pipeline_status` |

Item `ch-solo-operator-r3` em `docs/roadmap.json` aponta para este arquivo.
