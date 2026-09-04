# Investigação Tier 0 — `sim-mtnbio1q`

> **Gerado:** 2026-09-04 (automação support_report)  
> **Playbook:** `support-report-tier0` (Tier 0 — rascunho ops, sem PR nem alteração de produto)  
> **Escopo:** somente metadados do webhook; sem descrição do usuário, bundle PG ou dados clínicos.

---

## 1. Metadados do webhook

| Campo | Valor |
|-------|-------|
| `reportId` | `sim-mtnbio1q` |
| `category` | `technical_bug` |
| `route` | `/patients/demo` |
| `topFingerprint` | `sim_fingerprint_sync_timeout` |
| `consentTechnical` | `true` |
| `consentProfileAccess` | `false` |
| `dashboardUrl` | `http://127.0.0.1:3013?tab=support` |
| `submittedAt` | `2026-09-04T18:59:26.654Z` |

---

## 2. Triagem automática (Tier 0)

| Sinal | Leitura |
|-------|---------|
| **Categoria** | `technical_bug` → fila Engenharia; correlacionar fingerprint + rota ([`SUPPORT_REPORTS.md`](../SUPPORT_REPORTS.md) § Triagem). |
| **Rota** | `/patients/demo` → feature `patient_detail` (perfil do paciente: Carteira, integrações, sync silencioso). Ver `deriveFeatureFromRoute` em `packages/web/src/lib/client-error-fingerprint.ts`. |
| **Fingerprint** | `sim_fingerprint_sync_timeout` — **não** segue o formato real de `client_errors` (SHA-256 truncado, 16 hex). Prefixo `sim_` indica **payload sintético de teste/simulação**, não fingerprint de produção. |
| **Consentimento técnico** | `true` — bundle diagnóstico existe em PG (`diagnostic_context`), mas **não foi consultado** neste Tier 0. |
| **Acesso ao perfil** | `false` — operador **não** deve abrir prontuário ou queries clínicas para este chamado. |
| **Ambiente** | `dashboardUrl` aponta console integração `:3013` (dev local). |

**Severidade preliminar:** baixa para incidente multi-usuário (1 chamado, fingerprint simulado). Se o mesmo fingerprint real aparecer >5 usuários/24h → escalar para incidente ([`RUNBOOK_ALERTS.md`](../RUNBOOK_ALERTS.md) § Severidade rápida).

---

## 3. Hipótese principal

**Timeout de sincronização de integração na tela de perfil do paciente (`/patients/*`), provavelmente durante sync silencioso na aba Carteira ou acompanhamento de job via SSE/polling.**

Evidências (somente metadados):

1. **`topFingerprint`** contém `sync_timeout` — alinhado a falhas de portal/sync, não a erro de UI genérico ou billing.
2. **`route`** = perfil de paciente — local onde `useSilentWalletSync` dispara sync silencioso (`packages/web/src/hooks/useSilentWalletSync.ts`) e SSE de conclusão (`usePatientSyncCompletions`).
3. **`category`** = `technical_bug` — consistente com falha operacional (job/sync), não confusão de UX.
4. Backend classifica mensagens de timeout de portal como `timeout` (`packages/api/src/domain/portal-auth/portal-auth-failure.ts`); alerta ops `sync_stuck_<jobId>` cobre jobs `running` > 30 min ([`RUNBOOK_ALERTS.md`](../RUNBOOK_ALERTS.md) § Sync).

**Confiança:** média-baixa — o prefixo `sim_` sugere exercício de automação; a hipótese descreve o **cenário que o fingerprint nomeia**, útil para triagem humana se um chamado real equivalente chegar.

---

## 4. Hipóteses alternativas

| # | Hipótese | Por quê considerar |
|---|----------|-------------------|
| A | **Webhook/simulação de pipeline ops** — chamado de teste da automação investigadora | `reportId` e `topFingerprint` com prefixo `sim-` / `sim_`; ausência do fingerprint no código-fonte. |
| B | **Timeout de API (não sync)** — ex.: `GET /patients/:id` ou contexto lento | Rota de paciente; fingerprint real seria `patient_detail\|api\|HTTP_*` ou `NETWORK`, não `sync_timeout`. |
| C | **Sync manual travado** (botão Sincronizar em Integrações) | Mesma família de erro; rota reportada pode ser Carteira no momento do reporte, não aba Integrações. |

---

## 5. Áreas prováveis no código (referência Tier 1)

Sem abrir bundle ou perfil — mapa para engenharia:

| Área | Arquivo / doc | Relação |
|------|---------------|---------|
| Sync silencioso Carteira | `packages/web/src/hooks/useSilentWalletSync.ts`, `packages/web/src/lib/silent-sync.ts` | Dispara sync com `silent: true` ao abrir perfil. |
| Classificação timeout portal | `packages/api/src/domain/portal-auth/portal-auth-failure.ts` | Regex `timeout\|expirou (timeout)\|timed out`. |
| Jobs stuck / reconcile | `docs/ops/RUNBOOK_ALERTS.md` § `sync_stuck_*`, `npm run reconcile:sync-jobs` | Job `running` > 30 min. |
| Último sync fail no bundle | `support-report.service.ts` → `fetchLastSyncFailure` | Só consultável com autorização Tier 1+ e ambiente ops. |
| Console triagem | `http://127.0.0.1:3013?tab=support` | Fila `support_reports` + aba Sync. |

---

## 6. Próximos passos recomendados (humano / Tier 1)

1. **Console Suporte** — localizar `sim-mtnbio1q` na fila open; marcar `triaged` se for simulação confirmada.
2. **Se chamado real (fingerprint 16 hex, sem `sim_`):**
   - Aba **Sync** no console — jobs stuck/fail rate por portal.
   - Query `sync_jobs` + correlacionar `client_errors` por fingerprint ([`SUPPORT_REPORTS.md`](../SUPPORT_REPORTS.md) § Queries).
   - Verificar worker (`worker_stale`) e CDP/browser se portal exige login interativo.
3. **Não abrir perfil clínico** — `consentProfileAccess: false`.
4. **Escalar para Tier 2+** apenas se fingerprint real agrupar múltiplos usuários ou `sync_fail_rate_*` critical.

---

## 7. Limitações desta investigação

- Playbook referenciado (`docs/ops/automations/support-report-investigator.prompt.md`) **não encontrado** no repositório; estrutura inferida de [`SUPPORT_REPORTS.md`](../SUPPORT_REPORTS.md) e hub [`README.md`](../README.md).
- Tier 0: **sem** leitura de `diagnostic_context`, descrição do usuário, screenshot ou dados de paciente.
- **Sem** alteração de código ou PR (conforme política Tier 0).

---

## 8. Decisão ops

| Campo | Valor |
|-------|-------|
| **Status sugerido** | `triaged` (se simulação) / `open` (se produção real confirmada) |
| **Fila** | Engenharia — sync/integrações |
| **Ação imediata** | Nenhuma em produto; validar se automação de teste ou incidente real |
