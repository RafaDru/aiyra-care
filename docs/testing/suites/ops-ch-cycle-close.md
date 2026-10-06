# Suite QA — CH fechamento de ciclo (INC → DEF → merge → resolved)

**Id:** `ops-ch-cycle-close`  
**Lane:** ops (manual CH + opcional webhook simulado)  
**Spec:** [`docs/ops/CH_CYCLE_CLOSE_SPEC.md`](../../ops/CH_CYCLE_CLOSE_SPEC.md)

## Pré-requisitos

- Migrations **071–077**, **081–085** aplicadas; **086** quando fatia C2 estiver mergeada
- ops-console `:3013` + API `:3010`; `.env` com `OPS_METRICS_KEY` / callbacks conforme piloto
- Webhooks Cursor opcionais (`CURSOR_*`); para G4 sem GitHub real, `GITHUB_DEFECT_MERGE_WEBHOOK_SECRET` + payload simulado
- Familiaridade com suites base: [`ops-ch-defeitos`](./ops-ch-defeitos.md), [`ops-ch-ui-graphics`](./ops-ch-ui-graphics.md)

## Passos

### A — Entrada (suporte → INC)

1. App `:5173` autenticado → **Reportar problema** (categoria técnica, consentimento contexto) — confirma toast com ID
2. CH → **Suporte** ou **Incidentes** — novo `INC-*` em **Em aberto** (ou batch se `OPS_SUPPORT_INVESTIGATOR_MODE=batch`)
3. (Opcional) `GET /api/incident-dispatch/health` — lanes triagem/correção/review `ready` quando envs configurados

### B — Triagem → DEF

4. Disparar triagem (outbox/worker ou **Nova tentativa** se Falha) até callback triado + `DEF-*` vinculado
5. INC em chip **Triados**; expand mostra resumo triagem + tag DEF copiável
6. **G2:** **Iniciar correção** — com webhook mock/ready: `in_fix` + dispatch `sent`; sem webhook: permanece `open` com aviso

### C — Correção → ready_for_pr

7. Automation Correção Dev ou callback `ready_for_pr` — DEF **Pronto p/ PR**, `prUrl` preenchido (Tier 0/1)
8. **R1 smoke:** se `correction_failed` simulado, DEF volta `open` com banner; reenfileirar limpa metadados ao entrar `in_fix` (passo 14–15 de `ops-ch-defeitos`)

### D — Revisão agêntica (G3 advisory)

9. Auto review (`CH_AUTO_PR_REVIEW_ON_READY` default) ou `POST /api/platform-defects/:id/request-review` — card **Revisão agêntica** em `running` → `completed`
10. Mock `POST /api/platform-defects/review-callback` com `recommendation: approve` — três dimensões visíveis; lista mostra badge review (#113)
11. **Aprovar para merge** — registra intent, abre GitHub; merge **manual** (não automático)
12. Se `CH_G3_REQUIRE_REVIEW_APPROVE=1` (pós-C5): sem review `approve`, botão bloqueado ou 409; override explícito documentado na spec

### E — CI (pós-C3/C4 — skip até implementado)

13. Com webhook CI ou **Atualizar CI**: badge **CI** na linha `ready_for_pr` reflete `ci_success` ou `ci_failed`
14. Simular CI falho → DEF **Em correção**, banner com link Actions; **Reenfileirar correção** com confirmação Modal
15. Se fatia C4 não mergeada: marcar passos 13–14 **N/A** e registrar no relatório

### F — Merge → fixed → INC resolved (G4)

16. Merge PR no GitHub **ou** simular `POST /api/webhooks/github/defect-merge` — DEF **Corrigido**, `fixed_via=github_webhook`, `merged_pr_url` no expand
17. INC vinculado → chip **Resolvidos**, status **Resolvido** (084)
18. Reincidência: novo sinal → novo `INC-*` com tag reincidência (não reabre INC antigo)

### G — UX / tempo real (regressão pacote #113)

19. SSE **Ao vivo** em Incidentes e Defeitos — mudança de status sem F5 em &lt;5s
20. Mutações críticas (start-fix, approve, pedir mudanças) exibem `Modal.confirm` antes do POST

### H — Declaração piloto (C9)

21. Confirmar piloto documentado (ex. DEF-000003 / INC-000007) em estado terminal **Corrigido** + **Resolvido** ou registrar defeito QA dedicado `QA-CYCLE-*`
22. `npm run qa:run -- --suite ops-ch-defeitos` — PASS (regressão CH)
23. `npm run test:ops` — PASS se alterações ops na mesma entrega

## Critério

- **PASS** se A→F (com E N/A documentado quando C3/C4 pendente), G e H.21 ok; merge humano verificado; nenhum estado mentiroso (`in_fix` sem dispatch, `ready_for_pr` sem `prUrl` no piloto completo)
- **FAIL** se INC não resolve após `fixed`, review invisível em `ready_for_pr`, ou regressão SSE/confirmações
