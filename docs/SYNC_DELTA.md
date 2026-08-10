# Sync delta — o que já temos vs o que buscamos no portal

Auditoria de consumo de dados em integrações (2026-08-10). Objetivo: **buscar no terceiro só o inevitável**; no import, **gravar só novidades**.

## Resumo por portal

| Portal | Fetch no portal | Import no DB | Arquivos/PDF | Gap principal |
|--------|-----------------|--------------|--------------|---------------|
| **Unimed BH** | Full: extrato, autorizações, cartão | Dedup por chave (consulta, exame, pedido); auth atualiza se mudou | N/A no sync | APIs listam histórico completo cada sync |
| **Amil** | Full: beneficiários, plano, autorizações, guias | Dedup + update autorizações; matcher dependentes | N/A | Listas completas do portal cada sync |
| **Mater Dei** | Atendimentos/cirurgias: APIs “últimos”; **exames**: search paginado | Dedup atendimento/exame; laudos skip se `documentId` ou séries já salvas | Skip PDF/imagem se já persistido | **v1 incremental**: `examStartDate` desde max(exam)−14d ou lastSync |
| **Hermes Pardini** | Login HTTP OK; BFF exames não mapeado | — | — | Endpoints de lista/PDF pendentes |
| **ConecteSUS** | Import manual gov.br | Dedup no import | — | Sem sync automático |
| **Caderneta** | Upload manual | Dedup vacinas/marcos | — | Fora do Connect |

## Camadas

### 1. Intervalo entre syncs (API)

- `SYNC_MIN_INTERVAL_MS` — skip se último job OK recente (unless `force=1`).
- Silent sync exige `sessionReady`.

### 2. Fetch no portal (scrapers)

- **Mater Dei exames** (`computeMaterDeiExamStartDate`):
  - Com exames no DB: `MAX(exam_date) − 14 dias`.
  - Sem exames mas com `lastSyncAt`: `lastSyncAt − 14 dias`.
  - Primeira sync: últimos 365 dias (não 2015→hoje).
- **Unimed / Amil**: ainda buscam conjuntos completos expostos pelas APIs do portal.
- **Mater Dei atendimentos**: endpoint `last` (já limitado pelo portal).

### 3. Import (Core)

- **Unimed** (`CanonicalBatchImporter`): skip se chave de consulta/exame/pedido já existe; autorização atualiza.
- **Amil**: idem + matching de beneficiários.
- **Mater Dei**: dedup `mater_dei:` em notes; atendimentos por data+desc+ médico.
- **Novelty** (`sync_jobs.novelty`): contagens de novos vs atualizados para UI.

### 4. Arquivos

- **Mater Dei** (`persistMaterDeiExamFiles`): não baixa laudo se `documentId` no meta; não baixa imagens se `imageSeriesCount` já salvo.

## Próximos passos (roadmap)

1. Unimed: parâmetros de data no extrato/autorizações se API permitir; ou cursor por `lastSyncAt`.
2. Amil: sync de guias/autorizações só desde última modificação conhecida (`externalKey` / `updatedAt` portal).
3. Hermes: mapear BFF e dedup por `codigoCliente` + id exame.
4. `import_lineage` / `external_id` unificado para todos os connectors (evitar chaves ad hoc).
5. Sync “metadata only” quando fetch full é inevitável — já temos skip no import; expor `skipped*` no novelty de todos os portais.

## Variáveis

| Variável | Default | Efeito |
|----------|---------|--------|
| `SYNC_MIN_INTERVAL_MS` | 30 min | API skip sync recente |
| `SYNC_STREAM_HEARTBEAT_MS` | 25 s | SSE heartbeat no progresso |
| `VITE_SILENT_SYNC_STALE_MS` | 6 h | Web auto silent na Carteira |
