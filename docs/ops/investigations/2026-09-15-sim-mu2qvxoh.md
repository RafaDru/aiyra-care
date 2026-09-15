# Investigação — sim-mu2qvxoh

- **Categoria:** technical_bug
- **Rota:** /patients/demo
- **Fingerprint:** sim_fingerprint_sync_timeout
- **Tier:** 0 (rascunho automático)
- **Gatilho:** auto (submit — payload sem `investigation.trigger` explícito; origem típica do simulador)
- **Ambiente:** integration (`environment.deploymentTier`)
- **API:** http://127.0.0.1:3010 (`environment.apiPublicUrl`)
- **Consentimento técnico:** sim (`consentTechnical: true`)
- **Notas ops:** *(ausente no payload)*

## Contexto operacional

O `reportId` (`sim-mu2qvxoh`) e o fingerprint (`sim_fingerprint_sync_timeout`) coincidem com o payload de teste gerado por `scripts/support-investigator-simulate.mjs` — **não** é um fingerprint SHA-256 de 16 caracteres produzido por `computeClientErrorFingerprint` (`packages/web/src/lib/client-error-fingerprint.ts`). Tratar como **validação da lane de automação**, não como incidente de usuário real, até confirmar linha em `support_reports`.

O campo `analysisQueue` **não** estava presente no webhook — callback automático para a fila de análise não pôde ser executado nesta run.

## Hipóteses

1. **Simulação local (mais provável)** — Chamado disparado via `npm run ops:support-investigator:simulate` para validar toast + Cursor Automation; fingerprint e rota `/patients/demo` são literais do script, sem erro real em `client_errors`.
2. **Timeout de job de sync (30 min)** — Se fosse chamado real na rota de paciente, o fluxo típico é silent sync na aba **Carteira** (`useSilentWalletSync` → `POST /integration-links/:id/sync?silent=1`). Jobs presos >30 min são normalizados em PG com `error = 'Sincronização expirou (timeout)'` (`sync-job.pg.repository.ts` → `reconcileEnvironment`).
3. **Timeout de scraper/portal** — Sync manual abre `SyncProgressModal` com hint após 3 min (`SYNC_LONG_RUNNING_HINT_MS`) e reconciliação SSE stale após 45 s; portais (Unimed/Amil/Mater Dei/Hermes) usam timeouts Playwright de 45–300 s — falha pode aparecer como erro de API na UI e gerar `client_errors` com `errorKind=api` na feature `patient_detail`.

## Evidências no repo

| Área | Arquivo / doc | Relevância |
|------|---------------|------------|
| Rota `/patients/:id` | `packages/web/src/App.tsx` → `PatientDetail` (`detail.tsx`) | Página onde sync silencioso e modal de sync coexistem |
| Silent sync | `packages/web/src/hooks/useSilentWalletSync.ts`, `detail.tsx` L248–280 | Dispara sync ao abrir Carteira; falhas silenciosas só logam `console.warn` |
| Timeout PG (30 min) | `packages/api/src/infrastructure/persistence/sync-job.pg.repository.ts` L107–131 | Mensagem canônica «Sincronização expirou (timeout)» |
| Bundle técnico | `packages/api/src/application/support-report/support-report.service.ts` L120–122 | Com `consentTechnical`, anexa `lastSyncFailure` do paciente ao `diagnostic_context` |
| Simulador | `scripts/support-investigator-simulate.mjs` L32–49 | Payload idêntico ao deste chamado |
| Triagem | `docs/ops/SUPPORT_REPORTS.md` | `technical_bug` → fingerprint + rota → Engenharia |
| Sync delta | `docs/SYNC_DELTA.md` §4 | Hardening timeout 30 min + `sync-browser-registry` |

**Fingerprint:** `sim_fingerprint_sync_timeout` **não** aparece no código de produção — apenas no simulador. Fingerprints reais são hex de 16 chars derivados de `feature|errorKind|errorCode`.

## Próximo passo humano

1. **Confirmar origem** — No console Suporte, verificar se `sim-mu2qvxoh` existe em `support_reports` ou se foi só simulação:
   ```sql
   SELECT id, status, category, route, analysis_status, created_at
   FROM support_reports
   WHERE id = 'sim-mu2qvxoh'
      OR id::text LIKE 'sim-%'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
2. **Se chamado real com timeout de sync** — Inspecionar último job do paciente (substituir `<patient-uuid>`; **não** usar `demo` como UUID):
   ```sql
   SELECT sj.id, sj.status, sj.step, sj.message, sj.error, sj.started_at, sj.finished_at, il.portal_type
   FROM sync_jobs sj
   JOIN integration_links il ON il.id = sj.integration_link_id
   WHERE il.patient_id = '<patient-uuid>'
   ORDER BY sj.started_at DESC
   LIMIT 5;
   ```
3. **Correlacionar fingerprint real** (se diferente do sim):
   ```sql
   SELECT fingerprint, error_code, feature, created_at
   FROM client_errors
   WHERE account_id = (SELECT account_id FROM support_reports WHERE id = '<report-uuid>')
   ORDER BY created_at DESC
   LIMIT 10;
   ```
4. **Concluir análise no console** — Após revisão humana: marcar **Concluir** com resumo e path `docs/ops/investigations/2026-09-15-sim-mu2qvxoh.md`.
5. **Configurar callback (backlog)** — Incluir `analysisQueue: { queueId, callbackUrl }` no payload de dispatch (`support-report-dispatch.ts`) para fechar o loop sem intervenção manual.

## Console

http://127.0.0.1:3013?tab=support
