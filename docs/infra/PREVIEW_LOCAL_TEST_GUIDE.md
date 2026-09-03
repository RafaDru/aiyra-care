# Guia de teste manual — Preview local (Ambiente 2)

> **Última atualização:** 2026-09-03  
> Use após `npm run preview:validate` verde. Integração (Ambiente 1) pode rodar em paralelo.

## URLs rápidas

| O quê | Preview (teste) | Integração (dev) |
|-------|-----------------|------------------|
| **Web** | http://localhost:5174 | http://localhost:5173 |
| **API health** | http://127.0.0.1:3020/health | http://127.0.0.1:3010/health |
| **Console ops** | http://127.0.0.1:3023 | http://127.0.0.1:3013 |
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

Seu login Supabase precisa estar vinculado à conta demo **ou** use sua conta normal (dados próprios no PG preview após seed).

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

### 4. Configurações e opt-in ops (5 min)
- [ ] **Configurações → Geral** → toggle **“Avisar falhas repetidas de sincronização”**
- [ ] Salvar e recarregar — preferência persiste

### 5. Console ops preview (10 min)
- [ ] Abrir http://127.0.0.1:3023
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
