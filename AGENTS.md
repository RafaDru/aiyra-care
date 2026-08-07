# Project Instructions for AI Agents

## O que é este projeto

**AiyraCare (Filhos)** — monorepo para cuidado infantil com histórico médico centralizado (Luís e Bruno). Stack: Fastify API + React/Vite web + PostgreSQL. Documentação viva em `docs/PROJETO.md`; histórico de decisões em `docs/HISTORICO.md`.

**Contexto para LLM/agentes:** `GET http://127.0.0.1:3010/project/context` — foto estruturada da app + decisões + `HISTORICO.md` parseado + lista de migrations. Fonte curada: `docs/project-context.json` (atualizar ao mudar arquitetura/roadmap).

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
- **Sync assíncrono**: `POST /integration-links/:id/sync` retorna `jobId`; UI faz polling em `GET /integration-links/sync-progress/:jobId` (`SyncProgressModal`, timeout cliente 5 min)
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

**Fluxo Amil (prioridade):**

1. `integration_links.encrypted_session_token` — sync 100% HTTP, sem browser
2. CDP — conecta ao Chrome real (`connectOverCDP`), lê cookie `userToken` ou abre perfil `.cache/amil-chrome-cdp` e aguarda login manual
3. Playwright — só com `AMIL_ALLOW_BROWSER=1`

JWT Amil: carteirinha/marca ótica em `objeto.login` (não `marcaOtica`). Login API: `POST /beneficiario/api/AuthOGS/Login` com `{ userData: { login, senha, idSistema: 400 } }`.

### Unimed BH — arquivos-chave

- `unimedbh-login.helper.ts` — login SSO
- `unimedbh-sync.scraper.ts` — extrato + autorizações + cartão virtual na mesma sessão
- `unimedbh-cartao-virtual.scraper.ts` — QR/token + campos do plano

## Frontend — onde mexer

- Perfil paciente: `packages/web/src/pages/patient/detail.tsx` (abas incl. **Carteira** `WalletTab`)
- Sync modal: `packages/web/src/components/scraper/SyncProgressModal.tsx`
- Vincular plano: modal em `detail.tsx` + `ImportInsuranceModal.tsx`
- API client: `packages/web/src/lib/api.ts`

## Migrations

SQL em `database/relational/`. Aplicar novas colunas manualmente se necessário (ex.: via `npx tsx` + `pg` no dir `packages/api`). Última relevante: `010_integration_link_session.sql` (`encrypted_session_token`, `session_expires_at`).

## Testes API

```powershell
cd packages/api
npx vitest run
```

## Commits / PRs

Só commitar ou abrir PR quando o usuário pedir explicitamente.
