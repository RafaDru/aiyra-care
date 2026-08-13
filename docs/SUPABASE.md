# Supabase — Open Health

Projeto cloud existente: **lyljosprzmtapkocmxxa**

- Dashboard: https://supabase.com/dashboard/project/lyljosprzmtapkocmxxa
- Auth → URL Configuration: `http://localhost:5173` em Site URL e Redirect URLs
- Auth → Providers: habilitar Google (OAuth) e Email

## Variáveis (máquina do Rafael)

```powershell
# User env (já configuradas)
$env:SUPABASE_OPENHEALTH_FRONTEND_KEY
$env:SUPABASE_OPENHEALTH_SERVICE_ROLE_KEY
$env:SUPABASE_OPENHEALTH_DB_PASSWORD

# Gerar .env do monorepo
powershell -File scripts/setup-env.ps1 -Cloud
```

## Aplicar migration no Postgres cloud

```powershell
node scripts/apply-sql.mjs database/relational/018_app_accounts.sql --cloud
```

## CLI (criar novos projetos)

Requer token pessoal (não service role):

```powershell
supabase login
supabase projects list
```

OpenCode MCP já aponta ao projeto: `~/.config/opencode/opencode.json` → `project_ref=lyljosprzmtapkocmxxa`

## Google OAuth

1. **Supabase Dashboard** → [Authentication → Providers → Google](https://supabase.com/dashboard/project/lyljosprzmtapkocmxxa/auth/providers)
   - Ativar **Google**
   - Preencher **Client ID** e **Client Secret** (não basta salvar vazio)
2. **Google Cloud Console** → APIs & Services → Credentials → OAuth client (Web)
   - Authorized redirect URI: `https://lyljosprzmtapkocmxxa.supabase.co/auth/v1/callback`
3. **Supabase** → Authentication → URL Configuration
   - Site URL: `http://localhost:5173` (dev)
   - Redirect URLs: `http://localhost:5173/**`, `http://127.0.0.1:5173/**`

### Erro: `Unsupported provider: provider is not enabled`

O provedor Google está **desligado** (ou sem credenciais) no projeto Supabase cloud. O frontend está correto; a correção é só no dashboard:

1. Abrir Providers → Google → **Enable**
2. Colar Client ID/Secret do Google Cloud
3. Salvar e tentar login novamente

Variáveis `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` no `.env` servem para **Supabase local** (`supabase/config.toml`), não substituem a configuração do projeto cloud.

## Microsoft (Azure) OAuth

1. **Azure Portal** → Microsoft Entra ID → App registrations → app **Aiyra Care**
   - Redirect URI (Web): `https://lyljosprzmtapkocmxxa.supabase.co/auth/v1/callback`
2. **Supabase Dashboard** → [Authentication → Providers → Azure](https://supabase.com/dashboard/project/lyljosprzmtapkocmxxa/auth/providers)
   - Ativar **Azure**, Client ID + Secret da Azure
   - Tenant URL: vazio ou `https://login.microsoftonline.com/common` (trabalho + pessoal)
3. Frontend: `signInWithOAuth({ provider: 'azure', options: { scopes: 'email' } })`

**Agenda Outlook (sync calendário):** no mesmo app Azure, adicione também o redirect da **API** (não é o do Supabase):

`http://localhost:3010/calendar/microsoft/oauth/callback` (local; Azure **não** aceita `http://127.0.0.1` na plataforma Web) — ver `MICROSOFT_CALENDAR_*` no `.env.example`.

### Erro: provider Azure não habilitado

Igual ao Google — ativar e salvar credenciais no dashboard cloud (não só no `.env` local).

## Controle de acesso na API (sessão)

Com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE` no `.env` da API, **todas** as rotas (exceto `/health`, `/health/db` e `/auth/*`) exigem `Authorization: Bearer <access_token>` do Supabase.

Fluxo:

1. O hook global valida o JWT e sincroniza `app_accounts` (`auth_subject` = `user.id` do Supabase).
2. A API carrega `allowedPatientIds` = união de `patient_memberships` + pacientes com `owner_account_id`.
3. Controllers usam `assertPatientAccess` / `guardPatientEntity` — o `patientId` vem do recurso ou do body, mas **só é aceito se estiver em `allowedPatientIds` da sessão** (nunca confiar em `accountId` enviado pelo cliente).

Pacientes legados (ex.: Luís/Bruno) sem membership nem `owner_account_id` **não aparecem** até vincular:

```sql
-- Substituir :account_id pelo id em app_accounts do usuário logado
INSERT INTO patient_memberships (account_id, patient_id, role)
SELECT :account_id, id, 'guardian' FROM patients
ON CONFLICT (account_id, patient_id) DO NOTHING;
```

Sem as variáveis Supabase na API, o enforcement fica desligado (dev local aberto).
