# Guia de teste manual — Preview local (Ambiente 2)

> **Última atualização:** 2026-09-03  
> Use após `npm run preview:validate` verde. Integração (Ambiente 1) pode rodar em paralelo.

## URLs rápidas

Com hostnames locais ([`LOCAL_HOSTNAMES.md`](./LOCAL_HOSTNAMES.md)): **http://staging.aiyracare.test** (após `hosts:register` + `caddy:local`).

| O quê | Preview (teste) | Integração (dev) |
|-------|-----------------|------------------|
| **Web** | http://staging.aiyracare.test ou :5174 | http://dev.aiyracare.test ou :5173 |
| **API health** | http://api.staging.aiyracare.test/health | http://api.dev.aiyracare.test/health |
| **Console ops** | http://ops.staging.aiyracare.test | http://ops.dev.aiyracare.test |
| **Notificador** | http://127.0.0.1:3022/health | http://127.0.0.1:3012/health |
| **PostgreSQL** | `aiyracare_preview` | `aiyracare` |

## Antes de abrir o browser

```powershell
npm run preview:validate
```

Isso confirma: chaves distintas, tier preview, stack no ar, seed sintético, probe, alertas e smoke ops.

**Refresh de dados demo** (se pacientes sumirem):

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare_preview"
npm run seed:staging-refresh
```

## Login e pacientes demo

O seed cria a conta **Família Demo** (`demo-familia@aiyracare.local`) e dois pacientes:

| Paciente | Uso sugerido |
|----------|----------------|
| **Lucas Demo Silva** | Unimed BH (link mock), carteira, vacinas |
| **Ana Demo** | Amil (link mock), integrações |

Seu login Supabase precisa ver os pacientes demo no PG preview:

1. **Login uma vez** em http://localhost:5174 (cria `app_accounts` no `aiyracare_preview`).
2. Copie seu **user id** do Supabase (DevTools → Application → token JWT → `sub`).
3. Vincule Lucas/Ana:

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare_preview"
$env:AUTH_SUBJECT = "SEU_SUPABASE_USER_ID"
npm run link:demo-patients
```

Após login em **:5174**, confira o dashboard — deve listar pacientes se a conta tiver membership.

## Roteiro de teste (≈ 45 min)

### 1. Primeira impressão (5 min)
- [ ] Abrir http://localhost:5174 — carrega sem erro de API
- [ ] Login → dashboard
- [ ] Banner de compliance (se `COMPLIANCE_GATE_ENABLED=1` no preview)

### 2. Paciente — Carteira e dados (10 min)
- [ ] Abrir **Lucas Demo** → aba **Carteira**
- [ ] Ver cartão convênio / dados sintéticos
- [ ] Aba **Exames** ou **Vacinas** — conteúdo demo carregou
- [ ] **Runtime degradado:** se houver banner “dados podem estar desatualizados”, é esperado em testes de ops

### 3. Integrações (10 min)
- [ ] Aba **Integrações** — links Unimed/Amil visíveis
- [ ] Sync manual (pode falhar em portal real — OK no preview; observe modal de progresso)
- [ ] Ícones de status sync + texto (acessibilidade)

### 4. Configurações, família e opt-in ops (10 min)
- [ ] **Configurações → Geral** → toggle **“Avisar falhas repetidas de sincronização”**
- [ ] **Configurações → Família e cuidadores** — círculo «Minha família», convites, vincular perfis (migrations 057–060)
- [ ] **Reportar problema** (header) — enviar chamado com contexto técnico; conferir linha em `support_reports` (migration 061)
- [ ] **Dashboard** — agrupamento por família (se 2+ círculos)
- [ ] **Perfil** — botão «Quem tem acesso»
- [ ] Salvar e recarregar — preferências persistem

### 5. Console ops preview (10 min)
- [ ] Abrir http://ops.staging.aiyracare.test ou `:3023`
- [ ] Tag **Ambiente Staging** (âmbar) no topo do console
- [ ] Após o roteiro acima, aba **Produto** → **Saúde por feature** deve mostrar sessões (`app_screen_viewed`) nas telas visitadas
- [ ] Aba **Suporte** — fila `support_reports` open (se testou «Reportar problema»)
- [ ] Aba **Infra** — probe API/PG, latências ok/warning/critical
- [ ] Aba **Produto** — mapa de features, erros cliente (se houver)
- [ ] Aba **Sync** — fail rate, jobs 24h
- [ ] Aba **Ava** — percentis 24h vs 7d
- [ ] Botão **Verificar e acionar** alertas (se configurado webhook preview)

### 6. Comparar com integração (5 min)
- [ ] Console **:3013** mostra PG `aiyracare` (dados dev reais)
- [ ] Console **:3023** mostra PG `aiyracare_preview` (sintético)
- [ ] Chaves ops diferentes (`validate:ops-dual-keys` verde)

### 7. Entrega / gates (opcional)
- [ ] `npm run promotion:gates` — relatório em `promotion-report-last.md`
- [ ] Marcar aprovação no relatório quando satisfeito

## Comandos úteis durante o teste

```powershell
# Logs
Get-Content api-preview.log -Tail 40
Get-Content web-preview.log -Tail 40

# Notificador preview (toast)
$env:OPS_LOCAL_NOTIFIER_PORT='3022'; npm run ops:notifier:up

# Simular alerta crítico (toast no notifier local)
cd packages/api
$env:OPS_LOCAL_NOTIFIER_PORT='3022'
$env:OPS_CONSOLE_PORT='3023'
npm run ops:notifier:simulate -- --scenario=llm_cascade

# Bridge dev × produto
npm run dev-audit:bridge

# connect-worker (sync agendado + ops alerts no staging)
$env:DATABASE_URL = "postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare_preview"
$env:DEPLOYMENT_TIER = "preview"
$env:OPS_ALERTS_INTERVAL_MS = "900000"
npm run connect-worker

# Status de todos os serviços
npm run env:status
```

## O que é “sucesso”

- Navegação fluida em **:5174** sem 401/500 em rotas principais
- Console **:3023** com métricas e gráficos (mesmo com pouco tráfego)
- Preview **isolado** da integração (PG e chaves distintas)
- `preview:validate` e `promotion:gates` verdes antes de pedir promote

## Se travar na primeira tela

| Sintoma | Verificar |
|---------|-----------|
| “API indisponível” / HTML na API | `http://127.0.0.1:3020/health` — rodar `npm run up:preview` |
| Login loop | Supabase `.env` / `.env.preview` — mesmas vars `SUPABASE_*` |
| Lista de pacientes vazia | `seed:staging-refresh` no PG preview |
| Console ops 403 | Header ops key do **preview** (não copiar da integração) |
| Porta em uso | Integração e preview usam portas diferentes — ver tabela acima |

Ver também: [`ENV_PREVIEW.md`](./ENV_PREVIEW.md) · [`OPS_PREP_CHECKLIST.md`](./OPS_PREP_CHECKLIST.md) · [`TWO_ENV_MODEL.md`](./TWO_ENV_MODEL.md)
