# Investigação — client_error:76ed542fbdc2107c

| Campo | Valor |
|-------|--------|
| **investigationId** | `a12cfe9e-e833-4621-9b3a-cbcffc237f9a` |
| **alertId** | `client_error:76ed542fbdc2107c` |
| **Severidade** | warning |
| **Categoria** | product |
| **Mensagem** | HTTP_500 |
| **Tier** | 0 (rascunho automático — Suporte SRE) |
| **Playbook** | `ops-alert-tier0` |
| **Gatilho** | auto (`investigation.trigger`) |
| **Ambiente** | `integration` · API base `http://127.0.0.1:3010` (payload) |
| **Notas ops** | *(nenhuma no webhook)* |

## Contexto do alerta

| Campo (`details`) | Valor |
|-------------------|--------|
| `incidentOrigin` | `client_error_bridge` |
| `application` | Web |
| `route` (browser) | `/` |
| `feature` | `dashboard` |
| `api_path` | `/auth/sync` |
| `errorKind` | `api` |
| `fingerprint` | `76ed542fbdc2107c` |
| `checkedAt` | 2026-10-10T12:47:52.000Z |

O fingerprint confere com `SHA-256("dashboard|api|HTTP_500")[0:16]` — falha **5xx** em `POST /auth/sync` reportada pelo interceptor da web enquanto o usuário estava na **home** (`/`), durante o bootstrap de sessão (`AuthContext` → `api.auth.sync()`).

Bridge: [`docs/ops/CLIENT_ERROR_INCIDENT_BRIDGE.md`](../CLIENT_ERROR_INCIDENT_BRIDGE.md) · telemetria: [`docs/ops/TELEMETRY.md`](../TELEMETRY.md).

## Hipóteses (ordenadas)

1. **Postgres indisponível ou erro de conexão** durante `app_accounts` read/update ou `patient_memberships` em `syncAccountFromToken` — exceção não tratada no `AuthController.sync` → 500. Comum em stack local após restart parcial (API sobe, PG não).
2. **Membership “self” órfã** — `findSelfPatientId` retorna ID, mas `patients.findById` lança `NotFoundError` em `needsProfile()`; rota `/auth/sync` não captura → handler global 500 (plugin bridge registra `unhandled API error` em `api.log` se bridge ativo).
3. **Supabase Auth indisponível** — menos provável para 500: `SupabaseAuthAdapter.verifyAccessToken` devolve `null` em falha (401), não throw; salvo timeout/rede não mapeado pelo client SDK.
4. **Carga duplicada no mesmo request** — hook `optionalAuth` em `auth.routes.ts` já chama `syncAccountFromToken` antes do handler `POST /auth/sync` (segunda chamada no controller). Para contas existentes são dois updates PG; em condição de corrida rara na **primeira** criação poderia haver violação de unicidade em `auth_subject` (500).

## Evidências no monorepo (sem PHI)

- **Cliente:** `packages/web/src/contexts/AuthContext.tsx` — após `getSession`, `runSync` → `POST /auth/sync`.
- **Relato 5xx:** `packages/web/src/lib/api.ts` — `shouldReportDeclaredApiFailure` + `reportDeclaredApiFailure` com `feature` da rota browser (`dashboard` em `/`).
- **API:** `packages/api/src/infrastructure/http/auth/auth.controller.ts` — sync sem try/catch; erros de domínio/DB propagam.
- **Serviço:** `packages/api/src/application/auth/auth.service.ts` — `needsProfile` → `PatientService.findById` pode throw.
- **Middleware:** `packages/api/src/infrastructure/http/auth/auth.middleware.ts` — sync antecipada no `onRequest`.
- **Server 5xx + INC:** `packages/api/src/infrastructure/http/client-error-incident-bridge.plugin.ts` — log estruturado `{ err, url }` para `/auth/sync`.
- **Feature bridge server-side** (se 5xx detectado na API): `inferServerErrorBridgeFeature('/auth/sync')` → `account_settings` (diferente do fingerprint cliente `dashboard`).

## Verificações neste ambiente (agente nuvem)

- `GET http://127.0.0.1:3010/health` — **indisponível** (sem stack integration no pod do agente; esperado).
- Payload **sem** `callbackAuth` e processo do agente **sem** `OPS_INVESTIGATOR_CALLBACK_KEY` / `OPS_METRICS_KEY` — callback HTTP para o ops-console exige auth local (ver § Callback).

## Próximo passo humano

1. No notebook **integration**, abrir o [console ops](https://faqs-solving-ontario-four.trycloudflare.com?tab=incidentes&investigationId=a12cfe9e-e833-4621-9b3a-cbcffc237f9a&alertId=client_error%3A76ed542fbdc2107c) e confirmar contagem recente do fingerprint.
2. **`api.log`** (raiz do monorepo) no horário ~`12:47 UTC` — buscar `unhandled API error` com `url` contendo `/auth/sync` e stack (server-only, sem colar PHI no chat).
3. **Health:** `curl -s http://127.0.0.1:3010/health` e PG (`npm run env:status` ou probe postgres no runbook).
4. **SQL agregado (sem conteúdo clínico):**
   ```sql
   SELECT COUNT(*) AS n, MAX(created_at) AS last_seen
   FROM client_errors
   WHERE fingerprint = '76ed542fbdc2107c'
     AND created_at > NOW() - INTERVAL '24 hours';
   ```
5. Se stack apontar `NotFoundError` em `needsProfile` — auditar memberships `self` sem linha em `patients` para a conta afetada (ticket + base legal) ou corrigir dado órfão.
6. Se stack apontar `ECONNREFUSED` / timeout PG — `scripts/up.ps1` ou restart stack; ver [`docs/ops/RUNBOOK_ALERTS.md`](../RUNBOOK_ALERTS.md) (produto/infra adjacente).
7. Após correção de ambiente, repro: login → home `/` → rede deve mostrar `POST /auth/sync` **200**; fingerprint deve parar de subir.

**Tier 0:** nenhuma alteração de código ou merge nesta execução. Se a causa for bug de código (ex.: tratar órfão com 404/needsProfile seguro), escalar para defeito / Tier 1 com gates.

## Callback (agente)

- **URL:** `https://faqs-solving-ontario-four.trycloudflare.com/api/analysis-queue/callback`
- **Auth:** não fornecida no webhook (`callbackAuth` ausente); chaves `OPS_INVESTIGATOR_CALLBACK_KEY` / `OPS_METRICS_KEY` ausentes no ambiente do agente.
- **Tentativa 2026-10-10:** `POST …/triage-started` e `POST …/callback` → **HTTP 401** `{"error":"unauthorized"}`. **Ação humana:** concluir triagem no CH com o markdown acima ou reenviar callback do notebook com header `x-investigator-callback-key` (ou `x-internal-ops-key`).

## Console

https://faqs-solving-ontario-four.trycloudflare.com?tab=incidentes&investigationId=a12cfe9e-e833-4621-9b3a-cbcffc237f9a&alertId=client_error%3A76ed542fbdc2107c
