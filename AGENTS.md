# Project Instructions for AI Agents

## O que é este projeto

**AiyraCare (Filhos)** — monorepo para cuidado infantil com histórico médico centralizado (Luís e Bruno). Stack: Fastify API + React/Vite web + PostgreSQL. Documentação viva em `docs/PROJETO.md`; histórico de decisões em `docs/HISTORICO.md`.

**Contexto para LLM/agentes:** `GET http://127.0.0.1:3010/project/context` — foto estruturada da app + decisões + `HISTORICO.md` parseado + lista de migrations. Fonte curada: `docs/project-context.json` (atualizar ao mudar arquitetura/roadmap). **Roadmap priorizado:** `docs/roadmap.json` + UI menu Roadmap (`GET /roadmap`).

## Starting Services

When user says "up", "sobe", "sobe os serviços", or "restart", run:

```
taskkill /F /IM node.exe 2>&1 | Out-Null
Start-Sleep 2
powershell -File "C:\Users\rafae\Documents\Filhos\scripts\up.ps1" *>$null
```

Always use `*>$null` to suppress output so the chat doesn't get stuck.

## API & Web

- API: http://127.0.0.1:3010/health
- Web: http://localhost:5173
- Logs: `api.log` and `web.log` in project root
- DB local: `postgresql://postgres:postgres123@127.0.0.1:5432/openhealth`

## Arquitetura (resumo)

- **Hexagonal** em `packages/api`: `domain/` → `application/` → `infrastructure/`
- **Integrações de plano**: `IntegrationLink` (credenciais + sessão) → scrapers → `InsurancePlanService.upsertFromPortal` + import de `Authorization` / `MedicalRecord` / `Exam`
- **Sync assíncrono**: `POST /integration-links/:id/sync` retorna `jobId`; query `silent=1` (sem modal) ou `force=1` (ignora intervalo). UI: auto silent na Carteira (`shouldOfferSilentSync`); modal só no botão manual. Polling: `GET /integration-links/:id/sync-status` + `sync-progress/:jobId`.
- **Credenciais**: AES-256-GCM via `CRYPTO_KEY` em `.env` (`crypto-helper.ts`)
- **Auth API**: com `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE`, hook global em `security.plugin.ts`; escopo por paciente via `patient_memberships` + `owner_account_id` (`patient-access.guard.ts`). Ver `docs/SUPABASE.md`.
- **Integrações**: boundary Connect vs Core em `docs/CONNECT.md`; pacote `packages/connect` (contrato canônico). Scrapers ainda em `packages/api` até Fase 2.

## Sync por portal (estado atual)

| Portal | Sync automático | Como autentica | O que importa |
|--------|-----------------|----------------|---------------|
| **Unimed BH** | Sim | Playwright login `acesso.unimedbh.com.br` | Extrato (consultas/copart), autorizações (APIs OutSystems), plano (Cartão Virtual), QR/token |
| **Amil** | Sim ✅ validado | Token JWT salvo → CDP Chrome → Playwright (fallback) | Plano, carências, guias/tokens → `Authorization` |
| **Bradesco Saúde** | Não (só vínculo/import manual) | — | — |
| **ConecteSUS** | Import manual gov.br | Login interativo FHIR | Vacinas, exames |

### Amil — variáveis de ambiente

| Variável | Default | Efeito |
|----------|---------|--------|
| `AMIL_CDP_URL` | `http://127.0.0.1:9222` | Endpoint CDP do Chrome real; `0` desabilita |
| `AMIL_ALLOW_BROWSER` | `false` | `1` permite Playwright (WAF costuma bloquear) |
| `AMIL_HEADLESS` | `false` | Só relevante se `AMIL_ALLOW_BROWSER=1` |
| `AMIL_CHROME_PATH` | auto | Caminho do `chrome.exe` |
| `AMIL_MANUAL_LOGIN_TIMEOUT_MS` | `300000` | Tempo para clicar Entrar no Chrome CDP |

### Connect — sync silencioso

| Variável | Default | Efeito |
|----------|---------|--------|
| `SYNC_MIN_INTERVAL_MS` | `1800000` (30 min) | API: skip sync se último job OK recente (unless `force=1`) |
| `AMIL_SESSION_RENEW_MS` | `86400000` (24h) | Renovar JWT Amil via CDP antes de expirar |
| `VITE_SILENT_SYNC_STALE_MS` | `21600000` (6h) | Web: auto silent sync ao abrir Carteira **só com `sessionReady`** |

**Sync silencioso na Carteira:** auto-sync só dispara com sessão persistida válida (`sessionReady`); primeiro login sempre via botão **Sincronizar** (pode abrir portal/Chrome). API ignora `silent=1` sem sessão (`skipped: session_required`).

**Progresso de sync (UI):** push-first via SSE `GET /integration-links/sync-progress/:jobId/stream` (heartbeat ~25s); GET `/sync-progress/:jobId` só reconciliação se stream mudo >45s. Ver `docs/SYNC_DELTA.md` para delta sync por portal.

**Fluxo Amil (prioridade):**

1. `integration_links.encrypted_session_token` — sync 100% HTTP, sem browser
2. **API `AuthOGS/Login`** — login HTTP com CPF/senha (sem browser); salva JWT
3. CDP — lê cookie `userToken` do Chrome já aberto (não abre janela nova)
4. CDP + preenchimento — só em sync **manual** (`interactiveLogin`); tenta API in-page antes do clique em Entrar
5. Playwright — só com `AMIL_ALLOW_BROWSER=1` e se CDP falhar

JWT Amil: carteirinha/marca ótica em `objeto.login` (não `marcaOtica`). Login API: `POST /beneficiario/api/AuthOGS/Login` com `{ userData: { login, senha, idSistema: 400 } }`.

### Unimed BH — arquivos-chave

- `unimedbh-login.helper.ts` — login SSO
- `unimedbh-sync.scraper.ts` — extrato + autorizações + cartão virtual na mesma sessão
- `unimedbh-cartao-virtual.scraper.ts` — QR/token + campos do plano

## Frontend — onde mexer

- Perfil paciente: `packages/web/src/pages/patient/detail.tsx` (abas **Carteira**, **Convênios**, **Integrações**)
- Sync modal: `packages/web/src/components/scraper/SyncProgressModal.tsx`
- Vincular plano: modal em `detail.tsx` + `ImportInsuranceModal.tsx`
- API client: `packages/web/src/lib/api.ts`

### UI — listas agrupadas com colunas alinhadas

Regra: novas telas com **grupos de cards/linhas** devem manter alinhamento horizontal entre grupos.

- `GroupedAlignedTables` — vários grupos (título + tabela) com as **mesmas colunas** e `tableLayout="fixed"`
- `aligned-table-columns.ts` (`ALIGNED_COL`) — larguras fixas compartilhadas (portal 220, ações 208, etc.)
- `AlignedFieldGrid` — detalhes expandidos (labels alinhados em grid)
- Logos: `packages/web/public/brands/` — `logoSrc` (inline), `logoSquare` (avatar), `logoBanner` (faixa)
- Exemplos: `IntegrationsTab`, `CoverageTab`

## Migrations

SQL em `database/relational/`. Aplicar novas colunas manualmente se necessário (ex.: via `npx tsx` + `pg` no dir `packages/api`). Última relevante: `010_integration_link_session.sql` (`encrypted_session_token`, `session_expires_at`).

## Testes API

```powershell
cd packages/api
npx vitest run
```

## Commits / PRs

Só commitar ou abrir PR quando o usuário pedir explicitamente.
