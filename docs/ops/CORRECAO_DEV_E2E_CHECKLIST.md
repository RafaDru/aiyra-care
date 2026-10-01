# E2E — Aiyra Correção Dev (Command Hub)

Checklist de **uma página** para validar o agente 2 após triagem (`platform_defects.status = open`).

**Pré-requisito:** triagem OK (incidente `triaged`, defeito `open`). Piloto histórico: defeito `0e672818-72ec-4ef7-918e-312db34bbeb5`.

**Docs:** [automations-aiyra-correcao-dev-instructions.md](../automations-aiyra-correcao-dev-instructions.md) · [#74 CH pipeline](https://github.com/RafaDru/aiyra-care/pull/74)

---

## 1. Ambiente (notebook)

| # | Ação | OK |
|---|------|-----|
| 1.1 | Branch com dispatch Correção (`cursor/close-support-user-reports` ou merge em ch-shell) | ☐ |
| 1.2 | Migrations **071** + **072** aplicadas no PG do ops-console | ☐ |
| 1.3 | API `:3010` + ops-console `:3013` reiniciados após mudar `.env` | ☐ |
| 1.4 | Túnel HTTPS ativo → `OPS_CONSOLE_PUBLIC_URL` (agente na nuvem não alcança `127.0.0.1`) | ☐ |

### `.env` (mínimo Correção)

```bash
CURSOR_DEFECT_FIX_AUTOMATION_WEBHOOK_URL=https://…    # webhook Automation «Aiyra - Correção Dev»
CURSOR_DEFECT_FIX_AUTOMATION_WEBHOOK_KEY=crsr_…
OPS_CONSOLE_PUBLIC_URL=https://….trycloudflare.com
OPS_INVESTIGATOR_CALLBACK_KEY=…   # ou OPS_METRICS_KEY
```

Triador (já usado na triagem): `CURSOR_DEVELOPMENT_SUPPORT_AUTOMATION_WEBHOOK_*` — **par diferente**.

---

## 2. Cursor Automation

| # | Ação | OK |
|---|------|-----|
| 2.1 | Automation **Aiyra - Correção Dev** criada (webhook dedicado) | ☐ |
| 2.2 | Instructions: bloco texto plano (`=== INÍCIO ===` … `=== FIM ===`) de `docs/automations-aiyra-correcao-dev-instructions.md` — sem tabelas/markdown na UI | ☐ |
| 2.3 | URL + auth header copiados para `CURSOR_DEFECT_FIX_*` no `.env` | ☐ |

---

## 3. Comandos curl (sanidade)

Substitua `BASE` pelo túnel ou `http://127.0.0.1:3013` (só testes locais de rota).

```bash
BASE=http://127.0.0.1:3013

# Stack
curl -sS "$BASE/health" | head -c 200

# Webhooks (defectFix deve estar ready: true)
curl -sS "$BASE/api/incident-dispatch/health" | python3 -m json.tool

# Defeito piloto (ajuste UUID)
DEFECT=0e672818-72ec-4ef7-918e-312db34bbeb5
curl -sS "$BASE/api/platform-defects/$DEFECT" | python3 -m json.tool
```

**Esperado em `health`:** `webhooks.defectFix.ready: true` (URL + key no processo).

---

## 4. Disparo (CH UI)

| # | Passo | OK |
|---|--------|-----|
| 4.1 | Abrir CH → aba **Defeitos** | ☐ |
| 4.2 | Abrir defeito em `open` | ☐ |
| 4.3 | Clicar **Iniciar correção** (ou equivalente `start-fix`) | ☐ |
| 4.4 | Resposta API: `ok: true`, `dispatch.outcome: sent`, **então** `item.status: in_fix` | ☐ |

**Se `dispatch.outcome: skipped`:** conferir `.env` + reinício `:3013`.  
**Se `failed`:** log do ops-console; webhook URL/key ou rede.

---

## 5. Run Automation + callback

| # | O que verificar | OK |
|---|-----------------|-----|
| 5.1 | Nova execução **Aiyra - Correção Dev** no painel Cursor | ☐ |
| 5.2 | Payload com `type: defect_fix_v1`, `defectId`, `callbackUrl`, `callbackAuth` | ☐ |
| 5.3 | Agente faz `POST` callback com `defectStatus: ready_for_pr` + `remediationSummary` | ☐ |
| 5.4 | HTTP **2xx** no callback | ☐ |

### Callback (referência)

```http
POST {callbackUrl}
Content-Type: application/json
x-investigator-callback-key: {valor do OPS_*}

{
  "defectId": "<uuid>",
  "defectStatus": "ready_for_pr",
  "branchName": "cursor/…",
  "prUrl": "https://github.com/RafaDru/aiyra-care/pull/NNN",
  "remediationSummary": "[defect:xxxxxxxx] …"
}
```

Tier 0: `prUrl` pode ser omitido/null.

---

## 6. Pós-`ready_for_pr` — PR, CI, review (G3), merge, `fixed`

Runbook operador solo: [`SOLO_OPERATOR_RUNBOOK.md`](./SOLO_OPERATOR_RUNBOOK.md) §6. Spec fatias R2–R4: [`CH_SOLO_OPERATOR_JOURNEY_SPEC.md`](./CH_SOLO_OPERATOR_JOURNEY_SPEC.md).

| # | Passo | OK |
|---|--------|-----|
| 6.1 | CH: defeito `ready_for_pr`; conferir `branchName` / `prUrl` (Tier 1) | ☐ |
| 6.2 | Abrir ou localizar PR no GitHub (criar manualmente se Tier 0 sem `prUrl`) | ☐ |
| 6.3 | CI Actions verde (api, migrations, web, agents conforme diff) | ☐ |
| 6.4 | *(Opcional R3)* **Solicitar revisão agêntica** no CH — só após CI OK ou com ressalva documentada | ☐ |
| 6.5 | Rafael **aprova merge** no GitHub (G3); agente de review **não** mergeia | ☐ |
| 6.6 | CH → marcar **Corrigido** (`fixed`, G4); incidentes ligados permanecem `triaged` | ☐ |

**Se CI falhar:** corrigir na branch ou voltar a **Iniciar / Reenfileirar correção** (G2) com link da run e jobs falhos no próximo dispatch — ver [`DEFEITO_EM_CORRECAO.md`](./DEFEITO_EM_CORRECAO.md). Automação R2 registrará `pipeline_status` no defeito.

**Se review pedir mudanças (R3):** mesmo retorno à correção; anexar feedback no corpo do próximo `start-fix` / instruções do agente.

**PASS pós-correção (manual R0):** `ready_for_pr` → PR aberto → CI verde → merge aprovado → `fixed` no CH.

---

## 7. Estado final no CH

```bash
curl -sS "$BASE/api/platform-defects/$DEFECT" | python3 -c "
import json,sys; d=json.load(sys.stdin)['defect'];
print('status', d['status']);
print('branch', d.get('branchName'));
print('pr', d.get('prUrl'));
"
```

| Campo | Esperado após sucesso |
|--------|------------------------|
| `status` | `ready_for_pr` |
| `fixStartedAt` | preenchido (após start-fix) |
| `readyForPrAt` | preenchido (após callback) |
| `branchName` / `prUrl` | conforme Tier 0/1 |

Incidente ligado permanece **`triaged`** (não reabre).

---

## 8. Falhas comuns

| Sintoma | Causa provável |
|---------|----------------|
| `defectFix.ready: false` | `CURSOR_DEFECT_FIX_*` ausente ou processo antigo |
| `dispatch: skipped` + `webhook_not_configured` | URL vazia |
| `callback_auth_missing` | Sem `OPS_INVESTIGATOR_CALLBACK_KEY` / `OPS_METRICS_KEY` |
| Webhook **HTTP 400** | Automação **desabilitada** na UI Cursor (`Automation … is disabled`), URL do Triador, ou key inválida — ver corpo em `dispatch.error` |
| Automation não roda | Webhook errado (colou URL do Triador) |
| Callback 401 | Header/key não bate com ops-console |
| Callback 409 | Transição inválida (ex. `open` sem start-fix) |
| `ok: false` e status ainda `open` | Webhook falhou/skipped — **não** entra em `in_fix` (comportamento atual) |
| Defeito preso em `in_fix` (piloto antigo) | PATCH status → `open` no CH ou re-disparar `start-fix` (só reenvia webhook) |

---

## 9. Fora deste checklist

- **Lote PR** (`defect_pr_batches`) — fatia posterior do #74.
- Re-triagem dos incidentes legados `in_triage` — mesmo padrão triador + `callbackAuth`.

**PASS E2E Correção:** start-fix `sent` → run Automation → defeito `ready_for_pr` no CH.
