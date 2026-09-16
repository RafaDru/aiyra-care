# Correlação — investigationId

Chave única para cruzar **todas** as frentes de suporte ops.

## Chave canônica

| Campo | Valor |
|-------|--------|
| **Nome** | `investigationId` |
| **Origem** | `ops_analysis_queue.id` (UUID) |
| **Busca no Cursor Automations** | texto do payload: `[inv:xxxxxxxx]` ou campo `investigationId` |

## Onde aparece

| Frente | Campo / UI |
|--------|------------|
| Pilha Issues (console) | coluna `investigationId` |
| Suporte (console) | coluna + detalhe; origem `reportId` |
| Toast notificador | linha `Investigation: <uuid>` |
| Webhook Automation | `investigationId` + `text` com `[inv:…]` |
| Callback agente | `investigationId` (ou legado `queueId`) |
| Deep link console | `?tab=issues&investigationId=<uuid>` |

## IDs de origem (contexto, não substituem investigationId)

| Tipo | Campo |
|------|--------|
| Reporte manual | `reportId` → `support_reports.id` |
| Alerta ops | `alertId` → id estável do alerta (`infra_api_down`, …) |

## Agente (playbook)

1. Leia `investigationId` no JSON do webhook.
2. Cite no markdown: `investigationId: <uuid>` no topo do arquivo.
3. Nome sugerido: `docs/ops/investigations/YYYY-MM-DD-<8chars>-….md` (prefixo = primeiros 8 do investigationId).
4. Callback: `{ "investigationId": "…", "remediationSummary": "…", … }`.

## Legado

- `analysisQueue.id` e `queueId` no callback = mesmo UUID; preferir `investigationId`.
- `backgroundComposerId` (Cursor) não é persistido — use `investigationId` para correlacionar runs.
