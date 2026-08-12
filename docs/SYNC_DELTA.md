# Sync delta — o que já temos vs o que buscamos no portal

Auditoria de consumo de dados em integrações. Objetivo: **buscar no terceiro só o inevitável**; no import, **gravar só novidades**.

**Última atualização:** 2026-08-12

## Resumo por portal

| Portal | Fetch no portal | Import no DB | Arquivos/PDF | Gap principal |
|--------|-----------------|--------------|--------------|---------------|
| **Unimed BH** | **Incremental em silent:** 2 meses extrato; auth detalhe só desde `lastSync−14d`. Manual: 6 meses + detalhe full | Dedup por chave; auth atualiza se mudou | N/A | Lista de autorizações ainda vem completa do portal (detalhe é o que cortamos) |
| **Amil** | **Incremental em silent:** `PostTokens` desde `lastSync−14d` (ou 2 meses); **plano/carências omitidos** (só guias). Manual: 12 meses + plano full | Dedup + update autorizações; matcher dependentes; `skipped*` no novelty | N/A | — |
| **Mater Dei** | Atendimentos/cirurgias: APIs “últimos”; **exames**: search paginado desde `examStartDate` | Dedup atendimento/exame; laudos skip se `documentId` ou séries já salvas | Skip PDF/imagem se já persistido | Atendimentos sem cursor por data |
| **Hermes Pardini** | **Incremental:** `GET /pedidos` desde `max(exam_date)−14d` ou `lastSync−14d`; expande `GET /pedidos/{id}/exames` | Dedup `hermes_pardini:{pedido}:{exame}` em `notes` + `pedidoId` em meta JSON | Laudo PDF via `POST /pedidos/{id}/download` → GCS + `resultFileUrl` | — |
| **ConecteSUS** | Import manual gov.br | Dedup no import | — | Sem sync automático |
| **Caderneta** | Upload manual | Dedup vacinas/marcos | — | Fora do Connect |

## Camadas

### 1. Intervalo entre syncs (API)

- `SYNC_MIN_INTERVAL_MS` — skip se último job OK recente (unless `force=1`).
- Silent sync exige `sessionReady` (`skipped: session_required`).
- `incremental` na API = `silent=1` **sem** `force=1`.

### 2. Fetch no portal (scrapers)

Helpers em `packages/api/src/application/connect/sync-delta.helper.ts`:

| Portal | Silent (`incremental`) | Manual |
|--------|------------------------|--------|
| **Unimed extrato** | `computeUnimedExtratoMonths` → **2** competências | **6** meses |
| **Unimed autorizações** | `computeUnimedAuthorizationSince` → detalhe só ≥ data | todas com detalhe |
| **Amil guias** | `computeAmilGuidesPeriodStart` → `lastSync−14d` ou **2** meses | **12** meses |
| **Mater Dei exames** | `computeMaterDeiExamStartDate` → `max(exam_date)−14d` ou `lastSync−14d` | 365 dias (1ª sync) |
| **Hermes Pardini exames** | `computeHermesPardiniExamStartDate` → `max(exam_date)−14d` ou `lastSync−14d` | 365 dias (1ª sync) |

### 3. Import (Core)

- **Unimed** (`CanonicalBatchImporter`): skip se chave de consulta/exame/pedido já existe; autorização atualiza.
- **Amil**: idem + matching de beneficiários.
- **Mater Dei**: dedup `mater_dei:` em notes; atendimentos por data+desc+médico.
- **Novelty** (`sync_jobs.novelty`): contagens de novos, atualizados e **skipped** (já conhecidos) para UI (Carteira + Integrações).

### 4. Hardening (2026-08-11)

- Unimed: probe sessão no extrato; fail-fast SSO em `waitForUnimedScreenService`.
- Amil: em sync manual, não lê token aleatório do CDP antes de API login; não limpa JWT em erro de senha.
- API: `withBrowserSyncMutex` — um browser Playwright pesado por vez.
- UI: sync-all **serial**; polling `sync-status` 15s (pausa com jobs ativos no dock).
- Timeout PG (30 min): `sync-browser-registry` fecha browser do job.

### 5. Arquivos

- **Mater Dei** (`persistMaterDeiExamFiles`): não baixa laudo se `documentId` no meta; não baixa imagens se `imageSeriesCount` já salvo.

## Próximos passos (roadmap)

1. `import_lineage` / `external_id` unificado para todos os connectors.

## Variáveis

| Variável | Default | Efeito |
|----------|---------|--------|
| `SYNC_SCHEDULED_INTERVAL_MS` | 0 (off) | API: loop de sync `trigger=scheduled` (silent, sessão válida) |
| `SYNC_MIN_INTERVAL_MS` | 30 min | API skip sync recente |
| `SYNC_STREAM_HEARTBEAT_MS` | 25 s | SSE heartbeat no progresso |
| `VITE_SILENT_SYNC_STALE_MS` | 6 h | Web auto silent na Carteira |
| `AMIL_SESSION_RENEW_MS` | 24 h | Renovar JWT Amil via CDP antes de expirar |
