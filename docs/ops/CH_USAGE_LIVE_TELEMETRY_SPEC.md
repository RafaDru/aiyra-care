# CH — Uso ao vivo e telemetria de produto (spec telas)

> **Data:** 2026-11-20  
> **Status:** U1–U3 implementados (2026-11-20) — U4 mobile / U5 heartbeat pendentes  
> **Autor:** estudo agêntico a pedido Rafael — frente Command Hub  
> **Relacionado:** [`TELEMETRY.md`](./TELEMETRY.md) · [`CONSOLE.md`](./CONSOLE.md) · [`OBSERVABILITY.md`](../OBSERVABILITY.md) · épico `business-analytics` · `ch-usage-live-telemetry` (roadmap)

---

## 1. Objetivo

Colocar **nas primeiras telas do Command Hub** uma visão clara do **uso de momento** e da **evolução no tempo**, por superfície e por funcionalidade — sem PHI, alinhada a LGPD e ao que já existe em Postgres.

**Perguntas que o operador deve responder em &lt; 30s:**

1. Quantas pessoas estão usando o produto **agora** (e em qual superfície)?
2. Como foi o ritmo de uso **hoje / esta semana / este mês**?
3. **Onde** no app está a atenção (e onde há falha técnica sobreposta)?

---

## 2. Inventário — dados que já temos

### 2.1 Tabelas e ingest

| Fonte | Migration | Ingest | Dimensões úteis para “uso” |
|-------|-----------|--------|----------------------------|
| **`product_events`** | 049 | `POST /telemetry/events` (auth + landing allowlist) | `account_id`, `session_id`, `event_name`, `route`, `properties`, `created_at` |
| **`client_errors`** | 051 | Web/mobile `api.ts` + boundary | `feature`, `fingerprint`, `account_id`, `session_id`, `route` |
| **`support_reports`** | 061 | `POST /support/reports` | volume, categoria, status (humano) |
| **`sync_jobs`** | — | workers | portal, status (operacional, não “DAU”) |
| **`llm_usage_events`** | 040+ | Ava / classificador | turnos, tokens (AI, não DAU) |
| **`app_accounts`** | — | cadastro | totais, crescimento (Negócio) |

**Allowlist de eventos:** `packages/api/src/domain/telemetry/product-event.ts` (~50 nomes).  
**Propriedades permitidas:** sem texto clínico; `feature_key`, `step`, `portal_type`, etc.

### 2.2 Instrumentação no app hoje

| Sinal | Web | Mobile | Notas |
|-------|-----|--------|-------|
| **`app_screen_viewed`** | ✅ `useScreenTelemetry` — 1× por `feature_key` por `sessionStorage` aba | ⚠️ **parcial / ausente** no estudo atual | Alimenta catálogo + matriz 24h |
| **Funil onboarding** | ✅ `onboarding_step` | — | Passos nomeados em `properties.step` |
| **Ava** | ✅ `ava_chat_*`, pins, proposed actions | parcial via API | AI tab já cobre |
| **Sync** | ✅ `sync_job_*` | — | Sync tab |
| **Landing / GTM** | ✅ `landing_*`, `clinician_share_*` | — | `account_id` often null |
| **Quick capture / consultório share** | ✅ eventos dedicados | rollout | capilaridade |

**`session_id` (browser):** UUID curto em `sessionStorage` (`aiyracare.browser_session`) — **não** é JWT Supabase.  
**WAU/MAU (Negócio):** `COUNT(DISTINCT account_id)` em `product_events` 7d/30d — já em `OpsMetricsPgRepository.businessAnalytics()`.

### 2.3 O que o CH já mostra (baseline)

| Tela atual | Grupo | Janela | Gap vs pedido |
|------------|-------|--------|----------------|
| **Visão geral** | Operação | 24h / 5m | Foco **saúde técnica** (alertas, Ava fail, sync) — não DAU nem mapa de uso |
| **Produto e UX** | Produto | **24h fixo** | Matriz acesso×falha, mapa estático de features — **sem** seletor dia/semana/mês |
| **Negócio** | Negócio | **30d** | WAU/MAU, top features 30d, funil — **não** “agora”, **não** heatmap |
| **Séries 24h** | Operação / AI | hora a hora | só sync, client_errors, Ava, support — **não** screen views agregados |

API: snapshot único `GET /api/metrics` (console lê PG direto também). Séries: `timeSeries24h` apenas.

---

## 3. Lacunas e definições (importante para “Logins ativos”)

### 3.1 O que **não** temos hoje

| Conceito | Situação |
|----------|----------|
| **Sessões JWT Supabase ativas** | Não consultadas no CH; exigiria integração Auth Admin / audit log (fora do MVP integração) |
| **“Login” explícito** | Sem evento `auth_login_success` na allowlist |
| **Presença real-time** | Sem WebSocket de usuários; só inferência por último evento |
| **Heatmap hora×dia da semana** | Sem query nem UI |
| **Intervalo custom (date range)** | Negócio 30d fixo; produto 24h fixo |
| **Mobile paridade screen telemetry** | Gap conhecido — subconta DAU web |

### 3.2 Definições propostas (microcopy no CH)

| KPI UI (PT) | Definição técnica | Fonte |
|-------------|-------------------|--------|
| **Contas ativas agora** | `COUNT(DISTINCT account_id)` com `created_at >= now() - interval '15 minutes'` e `account_id IS NOT NULL` | `product_events` |
| **Sessões de app agora** | `COUNT(DISTINCT session_id)` na mesma janela (todas as superfícies) | `product_events` |
| **Visitantes anônimos agora** | Distinct `session_id` com `account_id IS NULL` (landing, share) | `product_events` |
| **DAU** | Contas distintas com evento autenticado no dia civil (TZ **America/Sao_Paulo**) | `product_events` |
| **WAU / MAU** | Já definido (7d / 30d rolling) | existente |
| **“Logins ativos” (label)** | **Não** usar literal “login” sem evento auth — UI: **«Contas ativas (15 min)»** + tooltip explicando proxy |

**Regra LGPD:** nunca listar `account_id`, e-mail ou CPF na UI; só contagens. Breakdowns &lt; k=5 → agrupar em «Outros» (k mínimo **5** em beta; **20** quando produção tiver escala — alinhado `TELEMETRY.md`).

### 3.3 Instrumentação recomendada (fase B)

| Evento novo | Finalidade |
|-------------|------------|
| `app_session_heartbeat` | A cada 5 min com app em foreground (web visibility + mobile AppState); refinha “agora” sem inflar `app_screen_viewed` |
| `auth_session_started` | 1× por login Supabase bem-sucedido (sem PII) — permite funil login→uso |
| Mobile `app_screen_viewed` | Paridade com web + `properties.surface: 'mobile'` |

Tudo passa por allowlist + review legal antes de prod.

---

## 4. Arquitetura de produto — novas telas

### 4.1 Princípio de navegação

- **Hero de uso** na **Visão geral** (Operação) — 4 KPIs + sparkline do dia (todo operador vê ao abrir o CH).
- **Profundidade** em nova aba **«Uso ao vivo»** no grupo **Produto** (não misturar com Incidentes).
- **Negócio** mantém funil 30d; link «Ver uso ao vivo» para a nova aba.

```
Operação → Visão geral     [KPIs uso + alertas]
Produto  → Uso ao vivo     [timeline, heatmap, agora]  ← NOVO tab: `usage`
Produto  → Produto e UX    [erros + matriz — janela segue filtro global]
Negócio  → Negócio         [WAU/MAU 30d — link para Uso]
```

URL: `?group=produto&tab=usage` · legado não aplicável.

### 4.2 Tela A — Faixa «Uso agora» (Visão geral + topo de Uso ao vivo)

| Bloco | Conteúdo | Visual |
|-------|----------|--------|
| **A1 Contas ativas** | 15 min / opcional 5 min | KPI grande + Δ vs média mesma hora ontem |
| **A2 Sessões app** | idem | KPI |
| **A3 Anônimos** | landing + share | KPI menor |
| **A4 Superfície** | web vs mobile vs landing (quando `surface` existir) | mini barras |
| **A5 Eventos/min** | taxa bruta `product_events` 15 min | sparkline 60 pontos (última hora) |

**Refresh:** 60s (aba visível), igual métricas atuais; badge «Ao vivo» com `generatedAt`.

### 4.3 Tela B — «Uso ao vivo» (tab `usage`)

#### B0 — Barra de tempo (global da aba)

| Preset | Granularidade eixo X | Lookback |
|--------|----------------------|----------|
| **Hoje** | 15 min ou 1 h (auto: &lt;200 contas ativas → 15 min) | 00:00–23:59 America/Sao_Paulo |
| **7 dias** | 1 h | rolling 7d |
| **30 dias** | 1 dia | rolling 30d |
| **Personalizado** | 1 h se ≤7d, senão 1 dia | max 90d (API cap) |

Comparar **opcional**: «vs período anterior» (overlay trace cinza).

#### B1 — Linha do tempo (série principal)

**Métricas selecionáveis (multi-select, máx 3):**

- Contas ativas (distinct `account_id`)
- Sessões (`session_id`)
- Telas vistas (`app_screen_viewed` count)
- Eventos totais (excl. `ops_worker_tick`, `stripe_webhook_rejected`)
- Erros cliente (`client_errors` count) — eixo Y secundário opcional

**Gráfico:** Recharts `ComposedChart` (mesma família `OpsCharts.tsx`).

#### B2 — Mapa de calor — funcionalidade × tempo

| Modo | Eixo Y | Célula | Métrica cor |
|------|--------|--------|-------------|
| **Por feature** | Top 15 `feature_key` (`app_screen_viewed`) ou área do catálogo | bucket de tempo do preset | `session_count` ou `event_count` |
| **Por área** | Carteira, Paciente, Integrações… (`ops-feature-catalog`) | idem | soma filhos |
| **Por rota** | top N rotas normalizadas | idem | só se k≥5 contas na célula |

**Visual:** heatmap CSS grid ou Recharts custom; escala sequencial (verde → âmbar); **overlay** contorno vermelho se `failRatePct` &gt; 15% na mesma célula (join `client_errors`).

#### B3 — Ranking lateral

Tabela: Feature | Sessões | Contas | Δ vs período anterior | Sinal falha (chip `hot` da matriz).

Click → drill-down modal: série só daquela feature + fingerprints 24h (reuso drill-down existente).

#### B4 — Funis rápidos (cards opcionais MVP+1)

- Onboarding: funil `onboarding_step` no intervalo
- Ava: started → completed
- Checkout: started → completed

Já existem queries parciais em `businessAnalytics`; reutilizar com filtro de datas.

---

## 5. API / backend (extensão)

### 5.1 Novo bloco no snapshot (preferível: endpoint dedicado)

**Opção recomendada:** `GET /api/usage?from=&to=&granularity=` (console BFF em `ops-console/src/server.ts`) para não inflar `/api/metrics` a cada 60s.

```typescript
// packages/api/src/domain/ops/ops-usage.types.ts (novo)
export interface OpsUsageLiveSnapshot {
  generatedAt: string
  windowMinutes: number
  activeAccounts: number
  activeSessions: number
  anonymousSessions: number
  bySurface: Array<{ surface: string; sessions: number; accounts: number }>
  eventsPerMinuteLastHour: Array<{ minute: string; count: number }>
}

export interface OpsUsageTimeSeries {
  from: string
  to: string
  granularity: '15m' | '1h' | '1d'
  series: Array<{
    bucketStart: string
    activeAccounts: number
    activeSessions: number
    screenViews: number
    totalEvents: number
    clientErrors: number
  }>
}

export interface OpsUsageHeatmap {
  from: string
  to: string
  granularity: '1h' | '1d'
  rows: Array<{
    featureKey: string
    label: string
    area: string
    cells: Array<{
      bucketStart: string
      sessionCount: number
      accountCount: number
      eventCount: number
      failRatePct: number | null // null se k < 5
    }>
  }>
}
```

### 5.2 Queries PG (esboço)

**Ativos agora:**

```sql
SELECT
  COUNT(DISTINCT account_id) FILTER (WHERE account_id IS NOT NULL) AS active_accounts,
  COUNT(DISTINCT session_id) AS active_sessions,
  COUNT(DISTINCT session_id) FILTER (WHERE account_id IS NULL) AS anon_sessions
FROM product_events
WHERE created_at >= NOW() - INTERVAL '15 minutes';
```

**Série (granularidade 1h):**

```sql
SELECT
  date_trunc('hour', created_at AT TIME ZONE 'America/Sao_Paulo') AS bucket,
  COUNT(DISTINCT account_id) FILTER (WHERE account_id IS NOT NULL) AS active_accounts,
  COUNT(DISTINCT session_id) AS sessions,
  COUNT(*) FILTER (WHERE event_name = 'app_screen_viewed') AS screen_views
FROM product_events
WHERE created_at >= $1 AND created_at < $2
  AND event_name NOT IN ('ops_worker_tick', 'stripe_webhook_rejected')
GROUP BY 1 ORDER BY 1;
```

**Heatmap feature × bucket:** `GROUP BY feature_key, bucket` a partir de `app_screen_viewed` + join agregado de `client_errors` por `feature` e bucket.

**Índices sugeridos (migration):**

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_events_created_account
  ON product_events (created_at DESC, account_id)
  WHERE account_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_events_screen_created
  ON product_events (created_at DESC, (properties->>'feature_key'))
  WHERE event_name = 'app_screen_viewed';
```

### 5.3 Cache

- Live snapshot: cache in-memory 30s no ops-console server (tolerância atraso «ao vivo»).
- Séries/heatmap: cache 2 min por chave `(from,to,granularity)`; invalidação no refresh manual.

---

## 6. UX / design system

- Reutilizar `OpsKpiCard`, `OpsPanel`, tokens `ch-zones.css`, grupo **Produto** (acento verde).
- Tooltip obrigatório em **Contas ativas** explicando proxy 15 min (não é Supabase sessions).
- Estado vazio: «Sem eventos no período» + link doc telemetria mobile se web-only.
- **Manutenção planejada:** banner read-only existente; KPIs de uso podem cair — não suprimir aba.

Mock estático (fase design): `/?mock=ch-usage` (segue padrão `ch-layout`).

---

## 7. Fases de entrega

| Fase | Entrega | Dependências |
|------|---------|--------------|
| **U0** | Este doc + roadmap + link CONSOLE | — |
| **U1** | KPIs «agora» na Visão geral + API `OpsUsageLiveSnapshot` | índices PG |
| **U2** | Tab `usage` + timeline presets Hoje/7d/30d | U1 |
| **U3** | Heatmap feature × tempo + drill-down | catálogo features |
| **U4** | Mobile `app_screen_viewed` + `surface` | mobile rollout |
| **U5** | Heartbeat + `auth_session_started` | legal + allowlist |

**QA (pós U2):** suite nova `ops-ch-usage-live` — seed `product_events`, assert KPIs e série; não exigir dados reais.

**Tier:** 1 (produto interno, sem PHI nova). **Review:** legal confirma labels; design U1/U3.

---

## 8. Métricas de sucesso (aceite)

1. Operador abre `:3013` → vê contas ativas 15 min sem scroll.
2. Troca **Hoje → 7 dias** → gráfico e heatmap atualizam &lt; 2s em notebook com 100k eventos/30d (com índice).
3. Heatmap mostra top feature do dia sem identificar usuário.
4. Matriz «Produto e UX» usa **mesma janela** que a aba Uso (filtro compartilhado em context React).
5. Documentação LGPD: sem novos campos identificáveis; k-anonymity nos breakdowns.

---

## 9. Referências de código

| Peça | Path |
|------|------|
| Negócio / WAU | `OpsMetricsPgRepository.businessAnalytics()` |
| Matriz 24h | `productEventUsage24h()` + `buildFeatureHealthMatrix()` |
| Screen telemetry | `packages/web/src/lib/telemetry/use-screen-telemetry.ts` |
| Catálogo | `packages/api/src/domain/ops/ops-feature-catalog.ts` |
| Nav CH | `packages/ops-console/src/client/ch-navigation.ts` |
| Charts | `packages/ops-console/src/client/components/OpsCharts.tsx` |

---

## 10. Decisões em aberto (Rafael)

| # | Pergunta | Recomendação |
|---|----------|--------------|
| D1 | Janela padrão «agora»: 15 ou 5 min? | **15 min** (menos ruído); 5 min em drill-down |
| D2 | Primeira tela: só Operação ou também default **Produto → Uso**? | Hero em **Operação**; profundidade em **Produto** |
| D3 | Priorizar heatmap por **feature** ou **área** no MVP? | **Área** no MVP (menos células vazias); feature no U3 |
| D4 | Investir em Supabase «sessions» reais? | **Adiar**; proxy `product_events` basta para beta |