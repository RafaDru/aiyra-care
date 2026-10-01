# Defeito «Em correção» — verdade vs status

**Migration:** `077` (`last_fix_dispatch_sent_at`, refs `DEF-*`)

## Regra

| Status PG | Quando |
|-----------|--------|
| `open` | Padrão após triagem; também após reconciliação se `in_fix` sem dispatch |
| `in_fix` | **Somente** após `POST /api/platform-defects/:id/start-fix` com `dispatch.outcome === sent` |
| `ready_for_pr` / `fixed` | Callback agente ou ação manual no CH |
| `ready_for_pr` + `prUrl` | Callback ou PATCH exige URL GitHub PR (`https://github.com/.../pull/N`); senão **400** `pr_url_required` |

`PATCH /api/platform-defects/:id/status` **não** aceita `in_fix` (409 `invalid_transition`). Use sempre **Iniciar correção** / **Reenfileirar correção**.

Coluna de verdade: `platform_defects.last_fix_dispatch_sent_at` (webhook `defect_fix_v1` HTTP 2xx).

## Reconciliação automática

`GET /api/platform-defects` e `GET /api/platform-defects/:id` revertem defeitos `in_fix` sem `last_fix_dispatch_sent_at` para `open` (limpa `fix_started_at`).

A migration **077** aplica o mesmo reset one-shot em linhas legadas (ex.: piloto `0e672818-72ec-4ef7-918e-312db34bbeb5`).

## Operador — reenfileirar correção

1. CH → **Operação** → **Defeitos**
2. Defeito em **Aberto** → **Iniciar correção**  
   Defeito já em **Em correção** → **Reenfileirar correção** (só re-dispatch; status permanece `in_fix` se dispatch OK)
3. Conferir resposta: `ok: true` e `dispatch.outcome: sent`
4. Se `skipped` / `failed`: `GET /api/incident-dispatch/health` → `webhooks.defectFix.ready`; corrigir `CURSOR_DEFECT_FIX_AUTOMATION_*` e reiniciar ops-console `:3013`

### curl

```bash
DEFECT=0e672818-72ec-4ef7-918e-312db34bbeb5
curl -sS -X POST "http://127.0.0.1:3013/api/platform-defects/$DEFECT/start-fix" | python3 -m json.tool
```

### Voltar manualmente para aberto

Se o agente não está rodando e o operador quer desfazer **Em correção** com dispatch válido:

```bash
curl -sS -X PATCH "http://127.0.0.1:3013/api/platform-defects/$DEFECT/status" \
  -H 'Content-Type: application/json' \
  -d '{"status":"open"}'
```

Isso limpa `fix_started_at` e `last_fix_dispatch_sent_at`.

## Referências humanas

- Incidentes: `INC-000042` (`ops_analysis_queue.reference_code`)
- Defeitos: `DEF-000007` (`platform_defects.reference_code`)

UUID permanece canônico para APIs e callbacks.
