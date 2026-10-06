# CH — Fechamento de ciclo operacional (especificação autorizada)

> **Modo:** plano de produto + contratos + rollout **C1–C9** (implementação em fatias após esta spec)  
> **Data:** 2026-10-06 (Rafael — spec autorizada, sem código de produto nesta entrega)  
> **Épico roadmap:** `ch-cycle-close`  
> **Branch ritual:** `cursor/close-support-user-reports` (origem do piloto suporte → INC → DEF)

**Relacionado:** [`CH_SOLO_OPERATOR_JOURNEY_SPEC.md`](./CH_SOLO_OPERATOR_JOURNEY_SPEC.md) · [`CH_INCIDENT_DEFECT_PIPELINE.md`](./CH_INCIDENT_DEFECT_PIPELINE.md) · [`CH_PR_REVIEW_AGENT.md`](./CH_PR_REVIEW_AGENT.md) · [`CH_UI_GRAPHICS_PACKAGE.md`](./CH_UI_GRAPHICS_PACKAGE.md) · [`CH_DEFECT_PIPELINE_DECISIONS.md`](./CH_DEFECT_PIPELINE_DECISIONS.md) · [`SOLO_OPERATOR_RUNBOOK.md`](./SOLO_OPERATOR_RUNBOOK.md) · [`CORRECAO_DEV_E2E_CHECKLIST.md`](./CORRECAO_DEV_E2E_CHECKLIST.md) · feature [`support-user-reports`](../features/support-user-reports.md)

**QA:** [`docs/testing/suites/ops-ch-cycle-close.md`](../testing/suites/ops-ch-cycle-close.md) · `npm run qa:run -- --suite ops-ch-cycle-close`

**Hub ops (2026-10-06):** [`CH_AUTONOMOUS_OPS_STACK.md`](./CH_AUTONOMOUS_OPS_STACK.md) · gap e prioridade [`CH_OPS_GAP_AND_PRIORITY.md`](./CH_OPS_GAP_AND_PRIORITY.md) · manutenção [`OPS_PLANNED_MAINTENANCE.md`](./OPS_PLANNED_MAINTENANCE.md)

---

## 1. O que este épico fecha

O **ciclo CH** é o fechamento operacional ponta a ponta do sinal de produto até **Corrigido** com merge humano em `main`, com incidentes vinculados em **Resolvido**:

```text
Reportar problema / alerta / client_error
  → INC-* (fila + dispatch triagem)
  → triagem Agent 1 → DEF-* (dedup fingerprint)
  → correção Agent 2 (G2) → ready_for_pr
  → revisão Agent 3 (G3 advisory) + CI visível (R2)
  → merge Rafael no GitHub (G3/G4)
  → DEF fixed + INC-* resolved (084)
```

| Resultado de negócio | Critério |
|----------------------|----------|
| **Ciclo fechado** | Pelo menos um piloto (ex. DEF-000003 / INC-000007) com `fixed` via webhook merge + INC `resolved` + suite `ops-ch-cycle-close` PASS |
| **Operador solo** | Falhas de dispatch, correção, CI e review **visíveis**; recuperação sem SQL; merge **nunca** automático |
| **Rastreabilidade** | Refs `INC-*` / `DEF-*`, PR URL, review recommendation, `fixed_via`, timestamps por fase |

Este épico **não** substitui `ch-solo-operator-journey` (R0–R4 + UX); **consolida** o que falta para declarar o ciclo **ritualizado** em QA e ops, principalmente **R2 (CI ↔ defeito)** e **gates G3 endurecidos**.

---

## 2. Limites do épico vs já entregue (#106–#113)

### 2.1 Já em `main` (não reimplementar)

| PR | Entrega relevante ao ciclo |
|----|----------------------------|
| [#106](https://github.com/RafaDru/aiyra-care/pull/106) | Painéis CH expand humanizados (base UX pré-pacote gráfico) |
| [#107](https://github.com/RafaDru/aiyra-care/pull/107) | Filtro Incidentes **Em aberto** (exclui triado/resolvido) |
| [#108](https://github.com/RafaDru/aiyra-care/pull/108) | Hooks triagem → correção (`CH_AUTO_START_FIX_ON_TRIAGE`, pipeline automation) |
| [#109](https://github.com/RafaDru/aiyra-care/pull/109) | Piloto correção DEF-000003 (health threads wizard null) |
| [#110](https://github.com/RafaDru/aiyra-care/pull/110) | Spec Agent 3 PR review (R3) |
| [#111](https://github.com/RafaDru/aiyra-care/pull/111) | R3 implementado: `defect_pr_reviews` (085), `request-review`, `review-callback`, auto review on `ready_for_pr` |
| [#112](https://github.com/RafaDru/aiyra-care/pull/112) | Playbook / env alias Revisão Dev |
| [#113](https://github.com/RafaDru/aiyra-care/pull/113) | Pacote UX G1–G8 (SSE, confirmações, tags, sidenav) |

**Também entregue (PRs anteriores ao bloco 106+):** R1 `correction_failed` (082), R4 merge webhook (081), reincidência DEF/INC (083–084), pipeline INC outbox (074–077), start-fix gate dispatch.

### 2.2 Dentro de `ch-cycle-close` (pós-spec)

| Fatia | Escopo |
|-------|--------|
| **R2** | `pipeline_status` + snapshot CI em `platform_defects`; webhook/polling GitHub; CI failed → `in_fix` + contexto no próximo `defect_fix_v1` |
| **G3 policy** | Env `CH_G3_REQUIRE_REVIEW_APPROVE` — bloquear «Aprovar para merge» até review `approve` ou override documentado |
| **Timeline** | Nó visual ciclo completo no expand DEF (detectado → … → merge) |
| **Métricas** | Tempo médio por fase INC/DEF em `GET /ops/metrics` (item R4 backlog) |
| **R3b** | `reviewFeedback` no payload `defect_fix_v1` após «Pedir mudanças» |
| **Ritual QA** | Suite `ops-ch-cycle-close` como gate de declaração do ciclo |

### 2.3 Fora de escopo (épico e v1)

- Merge automático em `main` sem Rafael (P5).
- Review agêntico em PRs sem defeito CH.
- Branch protection GitHub obrigando veredito do agente.
- SLA paging externo (F5).
- Multi-instância SSE Redis (GCP) — notebook single-process.
- Reabrir INC `triaged` quando DEF reincide (084 já cria **novo** INC).

---

## 3. Gates humanos (referência)

| Gate | Momento | Automático até… |
|------|---------|-----------------|
| **G0** | Priorizar / descartar fila INC | Dispatch + triagem |
| **G1** | Triagem ambígua | Callback triador |
| **G2** | **Iniciar correção** | Agent 2 + `ready_for_pr` |
| **G3** | Review advisory + **aprovar merge** (GitHub) | Agent 3 recomenda; merge manual |
| **G4** | **Corrigido** + INC **Resolvido** | Webhook merge ou confirmação manual → resolve INCs |

Detalhe de falhas: [`CH_SOLO_OPERATOR_JOURNEY_SPEC.md`](./CH_SOLO_OPERATOR_JOURNEY_SPEC.md) §4.

---

## 4. Migration 086 — DDL sketch (`platform_defects` pipeline CI)

**Objetivo:** persistir estado de esteira pós-`ready_for_pr` para R2, badges CH (já preparados em UX #113) e gate `CH_PR_REVIEW_REQUIRE_CI_GREEN=1`.

```sql
-- Migration 086: defeito — pipeline CI/GitHub (fatia C2–C4 / ch-solo-operator-r2)

ALTER TABLE platform_defects
  ADD COLUMN IF NOT EXISTS pipeline_status VARCHAR(32) NULL
    CHECK (pipeline_status IS NULL OR pipeline_status IN (
      'ci_pending',
      'ci_running',
      'ci_failed',
      'ci_success',
      'review_pending',
      'review_failed',
      'approved_for_merge'
    )),
  ADD COLUMN IF NOT EXISTS last_failure_kind VARCHAR(24) NULL
    CHECK (last_failure_kind IS NULL OR last_failure_kind IN (
      'dispatch', 'callback', 'ci', 'review', 'human_reject'
    )),
  ADD COLUMN IF NOT EXISTS last_failure_summary TEXT NULL,
  ADD COLUMN IF NOT EXISTS last_failure_details JSONB NULL,
  ADD COLUMN IF NOT EXISTS last_ci_run_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS last_ci_snapshot JSONB NULL,
  ADD COLUMN IF NOT EXISTS last_ci_checked_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN platform_defects.pipeline_status IS
  'Esteira pós-ready_for_pr: CI + review; ver CH_CYCLE_CLOSE_SPEC §5.';
COMMENT ON COLUMN platform_defects.last_failure_details IS
  'JSON: actionsRunId, failedJobs[], logExcerpt, reviewId, etc.';

CREATE INDEX IF NOT EXISTS idx_platform_defects_pipeline_open
  ON platform_defects (pipeline_status, updated_at DESC)
  WHERE status IN ('in_fix', 'ready_for_pr');
```

**Regras de transição (implementação C4):**

- `ready_for_pr` + PR registrado → `pipeline_status` inicia em `ci_pending` / `ci_running` após primeiro evento GitHub.
- `ci_failed` → `platform_defects.status = in_fix` (limpar `ready_for_pr_at` opcional — **preferir manter** histórico em colunas JSON), `last_failure_kind = ci`, anexar run URL.
- Review callback `request_changes` / `block` → `review_failed` ou permanece `ready_for_pr` + banner (alinhar a R3 atual); **não** auto-merge.
- `operator-approve-pr` → `approved_for_merge` (espelho G3) até webhook `fixed`.

---

## 5. Contratos API (ops-console `:3013`)

Rotas **existentes** (referência — não duplicar implementação):

| Método | Rota | Uso no ciclo |
|--------|------|----------------|
| `POST` | `/support/reports` (API `:3010`) | Entrada usuário → fila |
| `POST` | `/api/analysis-queue/:id/retry-dispatch` | Recuperação INC Falha |
| `POST` | `/api/analysis-queue/:id/triage-started` | Automation → `in_triage` |
| `POST` | `/api/analysis-queue/callback` | Triagem → DEF |
| `POST` | `/api/platform-defects/:id/start-fix` | G2 |
| `POST` | `/api/platform-defects/callback` | `ready_for_pr` / `correction_failed` |
| `POST` | `/api/platform-defects/:id/request-review` | Agent 3 (auto ou manual) |
| `POST` | `/api/platform-defects/review-callback` | Terminal review |
| `POST` | `/api/platform-defects/:id/operator-approve-pr` | G3 intent |
| `POST` | `/api/platform-defects/:id/operator-request-changes` | Reabre DEF |
| `POST` | `/api/webhooks/github/defect-merge` | G4 `fixed` + resolve INC |

### 5.1 Novos / estendidos (C3–C5)

| Método | Rota | Body / query | Respostas |
|--------|------|--------------|-----------|
| `POST` | `/api/webhooks/github/defect-ci` | Payload GitHub `check_run` / `workflow_run` (filtrar repo `aiyra-care`) | 200 idempotente; atualiza `pipeline_status`, `last_ci_*`; se falha → transição `in_fix` |
| `GET` | `/api/platform-defects/:id/pipeline` | — | `{ status, pipelineStatus, lastCi, lastReview, lastFailure, timeline[] }` |
| `POST` | `/api/platform-defects/:id/refresh-ci` | `{ "force": true }` | Polling on-demand (notebook); 412 se sem `GITHUB_OPS_TOKEN` |

**Auth webhooks:** header `X-Hub-Signature-256` com `GITHUB_DEFECT_CI_WEBHOOK_SECRET` (novo) — espelhar `GITHUB_DEFECT_MERGE_WEBHOOK_SECRET` (R4).

**`operator-approve-pr` (C5):** se `CH_G3_REQUIRE_REVIEW_APPROVE=1` (proposta):

- HTTP **409** `review_approval_required` quando última review `completed` existe e `recommendation !== 'approve'`.
- HTTP **409** `review_missing` quando não há review `completed` e operador não enviou `{ "override": true, "overrideReason": "…" }` (audit em `operator_pr_approved_note`).

Default proposto para piloto notebook: **`0`** (comportamento atual #111). Produção solo: Rafael decide na §12.

### 5.2 Payload enriquecido `defect_fix_v1` (C7 / R3b)

Ao re-dispatch após CI fail ou «Pedir mudanças», incluir:

```json
{
  "priorCorrectionFailure": { },
  "reviewFeedback": {
    "recommendation": "request_changes",
    "rationale": "…",
    "prReviewCommentUrl": "https://github.com/…#discussion_r…"
  },
  "ciFailure": {
    "runUrl": "https://github.com/…/actions/runs/…",
    "failedJobs": ["api", "web"]
  }
}
```

---

## 6. UI — wireframes (markdown)

### 6.1 Defeito `ready_for_pr` — faixa de ciclo (C6)

```text
┌─ DEF-000003 — Health threads wizard null ─────────────────────────────┐
│ Status: Pronto p/ PR    Pipeline: [CI ✓] [Review: Aprovar merge]      │
├───────────────────────────────────────────────────────────────────────┤
│ Ciclo:  ● INC aberto  ● Triado  ● Em correção  ● Pronto PR  ○ Merge │
│         [=========review concluída 2026-10-05=========]               │
├───────────────────────────────────────────────────────────────────────┤
│ [Card Correção] [Card Revisão agêntica] [Card CI — link Actions]      │
│ G3: [Aprovar para merge] [Pedir mudanças]  PR: github.com/…/pull/109 │
└───────────────────────────────────────────────────────────────────────┘
```

### 6.2 Defeito `in_fix` após CI falhou (C4)

```text
┌─ Banner (danger) ─────────────────────────────────────────────────────┐
│ CI falhou na branch do PR — jobs: api, migrations                      │
│ Run: [Abrir GitHub Actions]   Última falha: ci · há 12 min             │
│ [Reenfileirar correção]  (confirmação Modal — CH_UI_GRAPHICS §7)       │
└───────────────────────────────────────────────────────────────────────┘
```

### 6.3 Incidente `resolved` pós-merge (G4 — já 084)

```text
│ Status: Resolvido   DEF vinculado: DEF-000003 (Corrigido)              │
│ Tag: Reincidência de INC-… (se aplicável)                              │
```

### 6.4 CH Geral — indicador ciclo (C8, opcional)

```text
│ Ciclo CH (7d):  abertos 3 · em correção 1 · aguardando merge 1 ·       │
│                 resolvidos 12 · tempo médio até fixed: 2.4d (beta)      │
```

---

## 7. Variáveis de ambiente (consolidado ciclo)

| Variável | Default | Fatia | Efeito |
|----------|---------|-------|--------|
| `GITHUB_DEFECT_MERGE_WEBHOOK_SECRET` | — | R4 ✅ | Webhook merge → `fixed` |
| `GITHUB_DEFECT_CI_WEBHOOK_SECRET` | — | C3 | Valida webhook CI |
| `GITHUB_OPS_TOKEN` | — | C3 | Polling checks / refresh-ci |
| `CH_G3_REQUIRE_REVIEW_APPROVE` | **`0`** | C5 | `1` = gate §5.1 |
| `CH_PR_REVIEW_REQUIRE_CI_GREEN` | `0` | C3 | `1` = `request-review` 412 sem CI verde. **Decisão 8C+notify (2026-10-06):** permanece `0`; snapshot CI (`CI: verde` / `falhou` / `pendente`) no dispatch/callback Revisão Dev + badge CH — ver `CLIENT_ERROR_INGRESS_PROD_POLICY.md` §8. |
| `CH_AUTO_PR_REVIEW_ON_READY` | on | R3 ✅ | Auto Agent 3 |
| `CH_AUTO_START_FIX_ON_TRIAGE` | off | #108 | Auto G2 pós-triagem |
| `CURSOR_DEFECT_FIX_*` | — | G2 | Correção Dev |
| `CURSOR_DEFECT_PR_REVIEW_*` | — | R3 ✅ | Revisão PR |
| `OPS_INVESTIGATOR_CALLBACK_KEY` | — | callbacks | Auth agentes |
| `CH_DEFECT_CI_POLL_INTERVAL_MS` | `0` | C3 | `>0` = polling fallback sem webhook |

Reiniciar ops-console `:3013` após alterar `GITHUB_*` / `CH_*`.

### 7.1 Reconciliador poll CI (§4.1 operacional)

| Mecanismo | Uso |
|-----------|-----|
| `CH_DEFECT_CI_POLL_INTERVAL_MS` + `GITHUB_OPS_TOKEN` | Loop no ops-console `:3013`: varre `platform_defects` `ready_for_pr` com `pr_url`, consulta GitHub Actions (`head_sha` do PR), reusa `DefectCiPipelineService.ingestGithubCiEvent` |
| `POST /api/platform-defects/:id/refresh-ci` | On-demand (notebook); **412** sem `GITHUB_OPS_TOKEN` |
| Webhook `defect-ci` | Caminho preferido quando GitHub entrega eventos; poll é **fallback** |

Ordem de prioridade por defeito: `last_ci_checked_at NULLS FIRST`, depois `updated_at ASC`. Limite por tick: `CH_DEFECT_CI_POLL_LIMIT` (default 25).

---

## 8. Rollout C1–C9 (ordem de implementação)

| Fatia | Título | Entregável | Depende |
|-------|--------|------------|---------|
| **C1** | Spec + QA ritual | Este doc, `ops-ch-cycle-close`, roadmap, HISTORICO | — |
| **C2** | Migration 086 | SQL + script `apply-migration-086.mjs` | C1 |
| **C3** | Ingestão CI | Webhook `defect-ci` + opcional polling; atualiza `last_ci_*` | C2, `GITHUB_OPS_TOKEN` |
| **C4** | CI → correção | `ci_failed` → `in_fix` + `defect_fix_v1` enriquecido (parcial) | C3 |
| **C5** | Gate G3 | `CH_G3_REQUIRE_REVIEW_APPROVE` + UI override | R3 ✅ |
| **C6** | Timeline UI | Stepper + banners alinhados a `CH_UI_GRAPHICS_PACKAGE` | C2–C5 |
| **C7** | Review → correção | `reviewFeedback` no dispatch Correção | C5 |
| **C8** | Métricas fase | Contadores / histogramas ops metrics | C4 |
| **C9** | Declaração ciclo | Piloto merge + INC resolved + `npm run qa:run -- --suite ops-ch-cycle-close` PASS | C1–C7 mínimo C3 opcional se CI manual |

**Paralelização:** C6 pode overlap com C3–C4 se badges CI usarem placeholder até webhook.

---

## 9. Critérios de aceite (épico `ch-cycle-close`)

1. **Entrada:** `support-user-report` ou INC manual gera `INC-*` com dispatch recuperável (Falha + retry).
2. **Triagem → DEF:** dedup fingerprint; refs estáveis; reincidência 083/084 documentada na UI.
3. **Correção:** gate `in_fix`; R1 `correction_failed` visível.
4. **PR + review:** `ready_for_pr` + `prUrl`; Agent 3 auto ou `request-review`; card três dimensões.
5. **CI (R2):** status visível no CH; falha CI retorna defeito à correção com link da run (C4).
6. **G3:** merge só humano; política `CH_G3_REQUIRE_REVIEW_APPROVE` respeitada quando `1`.
7. **G4:** merge webhook → `fixed`, `merged_pr_url`, INCs → `resolved`.
8. **UX:** confirmações transacionais + SSE (#113) sem regressão.
9. **QA:** `ops-ch-cycle-close` PASS no notebook de integração.

---

## 10. Decisões para Rafael (antes de codar C2+)

| # | Tema | Opções | Recomendação spec |
|---|------|--------|-------------------|
| D1 | `CH_G3_REQUIRE_REVIEW_APPROVE` default | `0` vs `1` | **`0` no notebook**; `1` quando confiar no Agent 3 |
| D2 | CI fail limpa `ready_for_pr_at`? | sim vs não | **Não** — manter histórico; status PG `in_fix` basta |
| D3 | Webhook CI vs só polling | webhook / poll / ambos | **Webhook + poll fallback** (`CH_DEFECT_CI_POLL_INTERVAL_MS`) |
| D4 | Piloto declaração C9 | DEF-000003 + INC-000007 vs outro | Manter piloto existente pós-merge #109 |
| D5 | `CH_PR_REVIEW_REQUIRE_CI_GREEN` ao fechar ciclo | `0` vs `1` | `0` até C3 verde; depois avaliar `1` |

---

## 11. Referências de código (implementação futura)

| Área | Arquivos atuais |
|------|-----------------|
| Merge webhook | `platform-defect-merge-webhook.service.ts`, `ops-console/server.ts` |
| Review | `platform-defect-pr-review.service.ts`, `defect-pr-review.pg.repository.ts` |
| UI defeitos | `DefeitosPanel.tsx`, `ChDefectDetailBody`, `DefeitoAgenticReviewCard` |
| SSE | `platform-defect-board.bus.ts`, `incident-board.bus.ts` |
| Dispatch correção | `platform-defect-fix-dispatch.ts` |

---

## 12. Próximo passo imediato

1. Rafael confirma **D1** e **D4** (defaults G3 e piloto C9).
2. Implementar **C2 → C3 → C4** na branch de trabalho ops (hexagonal `packages/api` + rotas ops-console).
3. Executar **`npm run qa:run -- --suite ops-ch-cycle-close`** e registrar PASS/FAIL no chat de entrega.

---

## 14. Documentação hub e prioridade (2026-10-06)

Alinhamento operacional aprovado: pipeline automático até PR + review agêntico; merge e G3 approve permanecem manuais.

| Documento | Uso |
|-----------|-----|
| [`CH_OPS_GAP_AND_PRIORITY.md`](./CH_OPS_GAP_AND_PRIORITY.md) | Tabela exists/partial/missing + fila de implementação |
| [`CH_AUTONOMOUS_OPS_STACK.md`](./CH_AUTONOMOUS_OPS_STACK.md) | Narrativa única + ordem fatias (manutenção antes de ruído em prod) |
| [`OPS_PLANNED_MAINTENANCE.md`](./OPS_PLANNED_MAINTENANCE.md) | Flag manutenção + suppress bridge |

Épicos irmãos no roadmap: `ops-planned-maintenance`, `client-error-universal-ingress` (ingresso antes de expandir prod), `ch-cycle-close` (C2–C9).
