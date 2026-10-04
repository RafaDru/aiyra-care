# CH — Incidentes: push em tempo real (SSE)

**Status:** spec autorizada (Rafael, 2026-10-04) · **Implementação:** pendente  
**Relacionado:** [`CH_INCIDENT_DEFECT_PIPELINE.md`](./CH_INCIDENT_DEFECT_PIPELINE.md) · [`CH_INCIDENT_BOARD_FILTERS.md`](./CH_INCIDENT_BOARD_FILTERS.md) · poll 15s paliativo (`594de83`)

---

## 1. Objetivo

Atualizar a tab **Incidentes** do ops-console (`:3013`) **sem polling**: refletir mudanças de `incident_pipeline_status`, vínculo DEF e filtros assim que o backend gravar PG (dispatch, `triage-started`, callback triagem, DEF `fixed` / resolve).

---

## 2. Padrão (igual sync / Ava)

| Peça | Referência no monorepo |
|------|-------------------------|
| Bus in-process | `packages/api/src/infrastructure/scraper/sync-job-stream.ts` |
| SSE raw + CORS | `packages/api/src/infrastructure/http/sse-response.helper.ts` |
| Subscribe por escopo | `packages/api/src/infrastructure/sync/sync-completion.bus.ts` |

**Premissa notebook:** um processo ops-console + API embutida — bus **em memória** basta. Multi-instância futura → `NOTIFY` Postgres ou Redis (fora do escopo v1).

---

## 3. Event bus

**Arquivo:** `packages/api/src/infrastructure/ops/incident-board.bus.ts` (ou `application/ops`).

```typescript
export type IncidentBoardChangeEvent = {
  deploymentTier: string
  incidentId: string
  incidentPipelineStatus: IncidentPipelineStatus
  legacyStatus: AnalysisQueueStatus
  updatedAt: string
  /** Filtros CH onde a linha deve aparecer após o evento */
  suggestedFilter: IncidentBoardFilter
  linkedDefectIds?: string[]
}

publishIncidentBoardChange(event: IncidentBoardChangeEvent): void
subscribeIncidentBoard(
  deploymentTier: string,
  listener: (event: IncidentBoardChangeEvent) => void,
): () => void
```

`suggestedFilter` deriva de `suggestIncidentBoardFilter()` (mesma regra da UI).

---

## 4. Pontos de publicação (obrigatórios)

Chamar `publishIncidentBoardChange` **depois** do `UPDATE` PG bem-sucedido:

| Origem | Transições típicas |
|--------|-------------------|
| `IncidentDispatchService` | `open` → `queued_worker` → `forwarded`, `dispatch_failed` |
| `OpsAnalysisQueueService.markTriageStarted` | → `in_triage` |
| `processAgentCallback` / triagem | → `triaged`, `dismissed` |
| `resolveIncidentsLinkedToDefect` | → `resolved` |
| `retry-dispatch` | → `open` |
| `PlatformDefectService.linkIncident` | refresh `linkedDefectIds` (mesmo pipeline) |

Não publicar em leituras nem em poll.

---

## 5. Rota SSE

**`GET /api/analysis-queue/stream`**

| Query | Uso |
|-------|-----|
| `deploymentTier` | opcional; default tier do servidor |
| `filter` | opcional; se omitido, cliente aplica todos os eventos do tier |

**Resposta:** `text/event-stream`

| `event` | `data` (JSON) |
|---------|----------------|
| `incident_updated` | `IncidentBoardChangeEvent` + payload mínimo para patch (`referenceCode`, `title`, `linkedDefects` resumido) |
| `heartbeat` | `{ "ts": "..." }` a cada ~25s |

**Headers:** `sse-response.helper` (Origin do browser em dev).

**Auth:** mesmo boundary do ops-console (localhost / rede ops); sem JWT usuário final.

---

## 6. Cliente (`IncidentesPanel`)

1. Ao montar: `EventSource` em `/api/analysis-queue/stream?deploymentTier=…`.
2. Em `incident_updated`:
   - Se `suggestedFilter !== boardFilter` e o incidente **sai** do filtro atual → remover linha ou toast «INC-xxx movido para Resolvidos» + opcional trocar chip.
   - Senão: `GET /api/analysis-queue/:id` ou merge do payload → `setItems` patch por `id`.
3. **Fallback:** manter poll **60s** ou só em `EventSource.onerror` (reconnect exponencial + um `load()`).
4. Remover poll 15s quando SSE estável em notebook ≥ 1 semana.

---

## 7. Testes

| Alvo | Tipo |
|------|------|
| `publish` + `subscribe` | vitest unit |
| `suggestFilter` após evento | vitest domain |
| SSE route | vitest HTTP ou smoke ops |

Suite QA: `ops-ch-defeitos` passo SSE (após implementação).

---

## 8. Não escopo v1

- WebSocket bidirecional
- SSE para tab **Defeitos** (fatia separada)
- Replay histórico (só eventos pós-subscribe; carga inicial continua `GET /api/analysis-queue`)

---

## 9. Rollout

1. Bus + publish nos 6 ganchos acima  
2. Rota SSE + teste  
3. UI EventSource + fallback  
4. Notebook piloto; depois remover poll agressivo  

**Épico roadmap sugerido:** `ch-incident-board-sse` (tier 1 ops).
