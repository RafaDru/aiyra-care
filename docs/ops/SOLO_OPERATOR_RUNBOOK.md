# Runbook — operador solo (Command Hub)

> **Fatia:** R0 · **Spec:** [`CH_SOLO_OPERATOR_JOURNEY_SPEC.md`](./CH_SOLO_OPERATOR_JOURNEY_SPEC.md)  
> **Última atualização:** 2026-10-02

Playbook único para Rafael operar **INC-*** → **DEF-*** até **Corrigido**, com gates humanos e recuperação de falhas sem SQL manual.

**Pipeline técnico:** [`CH_INCIDENT_DEFECT_PIPELINE.md`](./CH_INCIDENT_DEFECT_PIPELINE.md) · **Correção E2E:** [`CORRECAO_DEV_E2E_CHECKLIST.md`](./CORRECAO_DEV_E2E_CHECKLIST.md) · **Em correção:** [`DEFEITO_EM_CORRECAO.md`](./DEFEITO_EM_CORRECAO.md)

---

## 1. Onde olhar

| Lugar | Uso |
|-------|-----|
| CH `:3013` → **Operação** → **Incidentes** | Fila `INC-*`, dispatch, triagem |
| CH → **Defeitos** | Ciclo `DEF-*` até merge |
| `GET /api/incident-dispatch/health` | Webhooks triagem + correção `ready` |

Princípio: automação repete o que é seguro (outbox, retry-dispatch, reenfileirar correção); **merge em `main` só com aprovação explícita** (G3).

---

## 2. Mapa da jornada

```
Detecção → INC (Aberto → … → Triado|Descartado)
              ↓ triagem OK + defeito
           DEF (Aberto → Em correção → Pronto p/ PR → [CI/Review] → Corrigido)
```

- Incidente **triado** não reabre quando o defeito fecha.
- **CI ou review falhou** (R2–R3): volta **Em correção** com contexto — não reset silencioso.
- **Dispatch triagem falhou:** permanece em **Falha** até **Nova tentativa** — ainda não há defeito.

---

## 3. Gates humanos (G0–G4)

| Gate | Quando | Ação típica |
|------|--------|-------------|
| **G0** | Opcional | Priorizar ou descartar incidente na fila |
| **G1** | Triagem ambígua | Completar/descartar análise manual (suporte legado) |
| **G2** | Antes de gastar correção | **Iniciar correção** / **Reenfileirar** após falha de dispatch ou retorno da esteira |
| **G3** | `ready_for_pr` | (Futuro R3) **Solicitar revisão agêntica** sob demanda + **aprovar merge** no GitHub |
| **G4** | Pós-merge | Marcar **Corrigido** no CH; validar deploy se aplicável |

Tier 0 (piloto): `prUrl` pode faltar no callback; Tier 1 com `OPS_INVESTIGATOR_TIER1=1` — PR draft + allowlist.

---

## 4. Incidente (`INC-*`)

| Etapa | Automático | Humano |
|-------|------------|--------|
| Criação | `ops_analysis_queue`, ref INC, outbox triagem | G0/G1 se necessário |
| Dispatch | Worker / webhook Triador Dev ou SRE | — |
| Triagem | Callback → `triaged` + defeito ou `dismissed` | G1 se travado |

### Falhas e recuperação

| Sintoma CH | Causa provável | Recuperação |
|------------|----------------|-------------|
| **Falha** (`dispatch_failed`) | Webhook off, 4xx/5xx, outbox `dead` | Corrigir `CURSOR_*` → **Nova tentativa** / `retry-dispatch` / `ch-incident-dispatch-backfill -- --reset-dead` |
| **Aberto** > SLA sem outbox | Legado / reconciliação | `npm run ch-incident-dispatch-backfill` |
| Callback triagem falha | Auth, URL, payload | `analysisLastError` no detalhe; re-disparar triagem |
| **Descartado** | Sem defeito | Encerrar |
| **Triado** | Defeito criado | §5 |

Detalhe D1–D13: [`CH_INCIDENT_DEFECT_PIPELINE.md`](./CH_INCIDENT_DEFECT_PIPELINE.md) §2.2.

---

## 5. Defeito — triagem → correção (`DEF-*`)

| Etapa | Automático | Humano |
|-------|------------|--------|
| Criação | Callback triagem, dedup `fingerprint`, `DEF-*` | Revisar resumo no CH |
| `open` → `in_fix` | `start-fix` só se `dispatch.outcome === sent` | **G2** Iniciar / Reenfileirar |
| `in_fix` → `ready_for_pr` | Automation **Correção Dev** + callback | Não re-autorizar análise após pronto |

### Falhas e recuperação

| Sintoma | Causa | Recuperação | Volta à correção |
|---------|-------|-------------|------------------|
| Permanece `open` após start-fix | Dispatch skipped/failed | Health `defectFix`; reenviar `{}` | Repetir G2 |
| `in_fix` indevido | Sem `last_fix_dispatch_sent_at` | Reconciliação → `open` (077) | G2 de novo |
| Automation não roda | Disabled, URL errada | Habilitar automation; corrigir env | G2 |
| Callback 401/409 | Auth / transição | `OPS_INVESTIGATOR_CALLBACK_KEY` | Reexecutar agente ou escape **Marcar pronto p/ PR** |
| Agente bloqueado | Escopo ambíguo | `remediationSummary` com bloqueio | PATCH `open` + novo G2 |

Passo a passo E2E: [`CORRECAO_DEV_E2E_CHECKLIST.md`](./CORRECAO_DEV_E2E_CHECKLIST.md). Regra `in_fix`: [`DEFEITO_EM_CORRECAO.md`](./DEFEITO_EM_CORRECAO.md).

---

## 6. Pós-`ready_for_pr` (G3–G4)

**Hoje (R0):** manual — abrir/acompanhar PR no GitHub, CI no Actions, merge só após Rafael aprovar; CH **Corrigido** após merge confirmado.

**Planejado (R2–R4):** `pipeline_status` no defeito, CI failed → `in_fix` com link da run; review agêntico sob demanda (G3); webhook merge → `fixed`.

Checklist operacional pós-callback: [`CORRECAO_DEV_E2E_CHECKLIST.md`](./CORRECAO_DEV_E2E_CHECKLIST.md) §6.

| Passo | Ação |
|-------|------|
| 1 | Confirmar CH: `status=ready_for_pr`, `branchName` / `prUrl` (Tier 1) |
| 2 | Abrir PR se Tier 0 sem URL; push na branch do agente |
| 3 | Aguardar CI verde; se falhar → corrigir na branch ou **reenfileirar correção** (G2) com notas da run |
| 4 | (R3) Solicitar revisão agêntica antes do merge — agente **recomenda**, não mergeia |
| 5 | **Merge aprovado** no GitHub (G3) |
| 6 | CH → **Corrigido** (G4); incidentes ligados permanecem `triaged` |

---

## 7. Automações (lanes)

| Lane | Automation | Disparo |
|------|------------|---------|
| Triagem Dev | Aiyra - Triador Dev | Outbox `triage_v1` |
| Triagem SRE | Aiyra - Triador SRE | `ops_alert` |
| Correção | Aiyra - Correção Dev | `start-fix` / `defect_fix_v1` |
| Review PR | *(R3 — TBD)* | Manual no CH (G3) |

Tabela env completa: [`AUTOMATIONS_LANES.md`](./AUTOMATIONS_LANES.md).

---

## 8. Critérios de aceite (jornada completa)

Ver [`CH_SOLO_OPERATOR_JOURNEY_SPEC.md`](./CH_SOLO_OPERATOR_JOURNEY_SPEC.md) §9. R0 cobre documentação; R1–R4 implementam gaps (falha estruturada, CI acoplado, review, merge registrado).

---

## 9. Fora de escopo (agora)

- Merge automático em `main` sem G3.
- Review agêntico em todo PR do monorepo (somente defeitos CH).
- SLA paging externo — usar banner CH.

---

## 10. Túnel HTTPS (notebook)

Automações **Triador** e **Correção** (Cursor na nuvem) precisam alcançar o callback do ops-console (`/api/analysis-queue/callback`). `127.0.0.1` no notebook **não** funciona para o agente remoto.

| Passo | Ação |
|-------|------|
| 1 | Subir túnel (ex. Cloudflare) apontando para `http://127.0.0.1:3013` (ou `:3023` em preview) |
| 2 | No `.env` (ou `.env.preview`), definir `OPS_CONSOLE_PUBLIC_URL=https://….trycloudflare.com` (sem barra final) |
| 3 | Reiniciar **API** e ops-console após mudar env (`up.ps1` ou camada backend + observability no farol) |

**Por quê:** a API monta `callbackUrl` com `OPS_ALERT_DASHBOARD_URL` **antes** de `OPS_CONSOLE_PUBLIC_URL` (`resolveOpsConsoleBaseUrl`). O script `scripts/ops-console-up.ps1` só preenche `OPS_ALERT_DASHBOARD_URL` quando vazio — se houver túnel, copia `OPS_CONSOLE_PUBLIC_URL` em vez de forçar localhost, para processos filhos (API reiniciada pelo farol) não herdarem base errada.

Checklist E2E: [`CORRECAO_DEV_E2E_CHECKLIST.md`](./CORRECAO_DEV_E2E_CHECKLIST.md) §1.4.
