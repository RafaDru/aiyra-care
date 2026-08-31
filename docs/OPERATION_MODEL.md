# Modelo operacional — observação, resiliência e cache

> **Última atualização:** 2026-08-28  
> **Status:** decisões de desenho (não é spec de implementação completa).  
> Complementa `docs/OBSERVABILITY.md` (o que já medimos) e `docs/infra/OPS_ALERTS_PRODUCTION.md` (alertas Slack).

Objetivo: operar **enxuto** — automatizar e pré-codificar o máximo; **LLM com reasoning** como segunda linha; **humano** só no indispensável.  
LGPD: sem PHI em alertas agregados, cache público ou notificações externas genéricas.

---

## 1. Taxonomia de problemas

Não usar o mesmo critério para tudo.

| Dimensão | Exemplos | Quem acorda primeiro |
|----------|----------|----------------------|
| **Impacto no cliente** | UI quebrada, API sem tratamento, lentidão percebida | Automação UX + manifest de freshness; depois ops |
| **Impacto na operação** | sync stuck, cascata LLM, PG lento | Sondas + `evaluateOpsAlerts` |
| **Tipo** | ambiente, bug, gap de produto, segurança | Triagem (regras → LLM → humano) |

---

## 2. Pirâmide de escalação

```text
Nível 0 — Regras e automação determinística
  retry, circuit breaker, degrade UI, pausar scheduled sync, Ava lite, ops snapshot

Nível 1 — Playbooks codificados
  mapa feature × erro → mensagem + ação (retry, modal, aba Integrações)

Nível 2 — LLM interno (reasoning, sem PHI)
  input: snapshot ops + health + fingerprints; output: hipótese, confiança, runbook

Nível 3 — Humano (Rafael)
  segurança, LGPD, credenciais portal, deploy, decisão de produto, root cause incerto
```

**Princípio:** Slack/webhook aciona **Nível 3** só quando Níveis 0–2 marcam `human_required` ou ação não está na allowlist.

---

## 3. O que já existe no código (baseline)

| Capacidade | Onde | Limitação |
|------------|------|-----------|
| Métricas + alertas ops | `GET /ops/metrics`, `evaluateOpsAlerts`, `ops:alerts-check` | Erro/threshold; pouca **degradação** vs baseline |
| Eventos de produto | `product_events`, `trackProductEvent` | Sem stack; sem “unhandled only” |
| Health | `/health`, `/health/db` | Passivo; não wired em alertas |
| Degrade graceful | Neo4j off, LLM cascade, classificador sem LLM | Parcial; não unificado por flag |
| Sync multi-caminho | auto, manual, import, CDP/browser | Não formalizado como “modo fallback” |
| Push de sync | SSE `sync-completions` | Freshness por paciente, não manifest global |
| Novelty | `SyncNoveltySummary` no job | UI de histórico; não manifest de entidades |
| Smokes | `test:smoke:llm`, `test:smoke:billing`, `ops:smoke` | Sob demanda / CI |

---

## 4. Observação ativa (sondas) — escopo realista

**Synthetic monitoring:** processo nosso consulta caminhos críticos **sem usuário**.

| Sonda | Frequência sugerida | Gatilho forte (exemplo) |
|-------|---------------------|-------------------------|
| `GET /health` + latência | 5 min | 2× fail ou &gt; 3s |
| `GET /health/db` + latência PG | 5 min | postgres error ou &gt; 500ms |
| `npm run ops:probe` (bundle futuro) | 15 min | combinação acima + ops snapshot |
| Smoke LLM | 1×/dia ou pré-deploy | cascata total |

**Onde rodar:** `connect-worker` ou cron (mesmo processo que `ops:alerts-check`) — **não** em cada réplica da API.

**Degradação (fase 2):** comparar p95 Ava e duração sync vs baseline 7d — **warning** interno, não pager imediato.

**Fora de escopo inicial:** agente em cada VM, APM enterprise, session replay.

---

## 5. Experiência do cliente — erros não tratados (visão POC)

Biblioteca nas camadas visuais (futuro), alinhada a Sentry/RUM:

1. **Quem** — `account_id` (auth Supabase)
2. **Onde** — `feature_key` + rota (ex. `wallet`, `ava_chat`, `billing_checkout`)
3. **O que** — `error_fingerprint` (código + hash), **não** stack completo nem texto clínico

Backend cataloga visão **3D:** usuários × funcionalidades × fingerprints.

**Gatilho:** exceção React não tratada **ou** resposta API de erro **sem** handler declarado no cliente.

**Complemento:** aviso na UI + (futuro) notificar quando regularizado — ver §7 e épico `run-user-escalation`.

---

## 6. Fallbacks “dormentes” (só onde compensa)

Estruturas **paralelas e isoladas**, custo mínimo dormindo, acordadas por **gatilho forte + persistente** (ex. 30 min degradado).

| Ponto sensível | Caminho A (normal) | Caminho B (dormente) | Gatilho para acordar |
|----------------|-------------------|----------------------|----------------------|
| **Leitura PG pesada** | queries live | snapshot D-1 carteira/timeline em GCS (job noturno) | pool PG saturado / p95 query |
| **Sync portal** | scheduled + silent | só manual + cache “último OK” + pausa scheduled | fail rate &gt; 70% ou stuck |
| **Ava** | contexto completo + reflexão | **Ava lite** (contexto mínimo, read-only) | `llm_cascade_fail` |
| **Ops durante crise** | queries live em PG | último `ops-metrics` snapshot JSON | PG lento + probe fail |
| **Neo4j** | grafo UI | pins PG + prontuário (já existe) | deep health fail |

**Regras:**

- PG permanece **fonte canônica**; Caminho B é **stale/simplificado** — banner na UI obrigatório.
- Não manter segundo cluster PG 24/7; preferir object store + job batch.

---

## 7. Cache e freshness (invalidação por “estímulo”)

Nome técnico do padrão que você descreveu: **cache com invalidação por versão de dados** (data version / generation stamp), não TTL fixo sozinho.

### 7.1 Conceitos

| Conceito | Descrição |
|----------|-----------|
| **Generation stamp** | Timestamp ou contador monotônico por escopo (`account`, `patient`, `entity_domain`) atualizado **na escrita** |
| **Freshness manifest** | Resposta sumarizada: “quais domínios têm dados novos desde a última leitura do cliente” |
| **Invalidação por estímulo** | Sync terminou, upload, merge higiene → bump stamp do domínio afetado |
| **Compare-on-read** | Cliente ou gateway envia `If-None-Match: {stamp}`; se igual, 304 ou skip refetch |

Isso é equivalente a **ETag por domínio de dados**, comum em APIs REST e BFFs.

### 7.2 Níveis de cache (proposta AiyraCare)

| Nível | Onde | O que guarda | Invalidação |
|-------|------|--------------|-------------|
| **L0** | React (web) | estado de tela, SWR local | manifest mudou / SSE sync |
| **L1** | Web após auth | manifest: domínios stale por paciente/conta | `GET /account/freshness` (futuro) |
| **L2** | API in-memory (processo) | respostas pesadas (ex. contexto paciente) | stamp no request vs stamp em cache |
| **L3** | Object store | snapshot D-1 (fallback dormente) | job noturno; não invalidação fina |

**Não priorizar agora:** Redis cluster, CDN edge cache de dados clínicos.

### 7.3 Manifest na interface (1.1 / 1.2 do seu modelo)

Após autenticar (ou ao abrir app):

```http
GET /account/freshness
```

Resposta exemplo (sem PHI):

```json
{
  "accountGeneration": "2026-08-28T14:00:00Z",
  "patients": [
    {
      "patientId": "...",
      "domains": {
        "exams": { "generation": "...", "hasNew": true },
        "wallet": { "generation": "...", "hasNew": false },
        "sync_unimed": { "generation": "...", "hasNew": true }
      }
    }
  ]
}
```

**Dois motivadores (como no seu sistema antigo):**

1. **Refetch seletivo** — abas com `hasNew` ou `generation` ≠ cache local chamam API pesada.
2. **Alerta ao usuário** — badge “novos exames” / “sync trouxe dados” (já parcialmente via novelty + SSE).

**Pontes com o que já temos:**

- SSE `sync-completions` → bump `sync_*` / `exams` e atualizar manifest.
- `SyncNoveltySummary` → texto para notificação + input para `hasNew`.
- Silent wallet sync (`VITE_SILENT_SYNC_STALE_MS`) → lógica de stale por tempo; manifest unifica **por evento**, não só relógio.

### 7.4 Cache no backend (2.1 / 2.2 do seu modelo)

Na escrita (sync OK, exam import, resolve higiene):

```text
bump_patient_domain_generation(patient_id, 'exams')
```

Na leitura (ex. `GET /patients/:id/context`):

```text
if client.If-None-Match >= cached.generation → 304
else compute + cache in-memory keyed by (patientId, domain, generation)
```

**Equivalente moderno** ao “timestamp na base + gateway compara”: tabela `data_generations` (ou colunas em `patients` / `patient_sync_state`) — **não** variável de ambiente global (frágil em multi-instância).

| Escopo | Stamp | Bump quando |
|--------|-------|-------------|
| `account` | 1 linha | perfil, billing, compliance |
| `patient` | por paciente | qualquer dado clínico |
| `patient:exams` | fino | exam insert/update, sync exames |
| `patient:wallet` | fino | plano, autorização, sync convênio |
| `patient:timeline` | fino | qualquer evento na timeline |

**Sob demanda:** endpoint interno `POST /ops/cache/bump` só para ops (não env var manual).

### 7.5 Cache e degradação

Se Caminho B (snapshot D-1) acordou:

- manifest indica `mode: degraded_read` + `asOf: D-1`;
- L2 in-memory pode ser **desligado** para não competir com PG;
- L1 força leitura do snapshot ou resposta simplificada.

---

## 8. Correlação: cache, sondas, alertas

```text
Escrita (sync, upload) → bump generation → manifest L1 atualiza → UI refetch seletivo
                                              ↓
Sonda PG lenta (30 min) → acorda snapshot D-1 → manifest mode degraded
                                              ↓
evaluateOpsAlerts → Slack só se human_required
```

Um futuro `incident_id` pode ligar: fingerprint cliente + alerta ops + modo degradado.

---

## 9. Fora de escopo (honeroso ou pouco eficiente agora)

- Segundo Postgres sempre quente em paralelo
- WhatsApp bot transacional completo antes de manifest + fallbacks
- Stack traces completos em produção sem sanitização
- Grafana self-hosted antes de probes + snapshot
- Cache edge/CDN de payloads clínicos
- Anomaly detection ML

---

## 10. Roadmap sugerido (incrementos)

Ver **§13 Faseamento consolidado** e **§14 Pendências críticas** para o mapa completo do debate.

| Ordem | Entrega | Fase | Esforço |
|-------|---------|------|---------|
| 1 | `ops:probe` + alertas health/db slow | 1 | Baixo |
| 2 | `data_generations` + bump writes | 2 | Médio |
| 3 | `GET /account/freshness` + web refetch/badge | 2 | Médio |
| 4 | L2 cache contexto paciente | 2 | Baixo |
| 5 | Client error ingest (fingerprint) | 3 | Médio |
| 6 | Snapshot D-1 + modo degradado | 4 | Médio |
| 7 | LLM triage + Slack filtrado | 1 | Baixo |
| 8 | Ava lite automático | 4 | Baixo |

Épicos: `observability-platform` (done), `prod-run-intelligence` (parcial).

---

## 11. Referências no repo

| Doc / código | Tema |
|--------------|------|
| `docs/OBSERVABILITY.md` | product_events, ops metrics |
| `docs/infra/OPS_ALERTS_PRODUCTION.md` | Slack, cron |
| `packages/api/src/domain/ops/ops-alerts.ts` | Regras de alerta |
| `packages/web/src/hooks/usePatientSyncCompletions.ts` | SSE freshness sync |
| `packages/api/src/application/connect/sync-novelty.helper.ts` | Novelty após sync |
| `docs/ARCHITECTURE_DATA_LAYERS.md` | Neo4j degrade |

---

## 12. Thread de decisão

Decisões finas (thresholds, P0 portais, opt-in notificação) ficam neste doc e em `docs/HISTORICO.md` ao implementar cada incremento — não bloquear código MVP de manifest/generations.

---

## 13. Faseamento consolidado (debate 2026-08-28)

Mapa de **tudo** trazido na thread: taxonomia, POC cliente 3D, sondas, degradação, fallbacks dormentes, cache/freshness, pirâmide automação → LLM → humano.

### Visão das fases

```text
Fase 0  Foundation ops     [DONE]
Fase 1  Ops sem te acordar  [parcial — crítico]
Fase 2  Cache / freshness   [done — generations + manifest web]
Fase 3  Cliente: ver erros  [done — ingest + ops 3D]
Fase 4  Fallbacks dormentes [done — sync pause, Ava lite, snapshot D-1]
Fase 5  Proativo ao usuário [pendente — opt-in / legal]
Fase 6  Maturidade          [backlog]
```

### Fase 0 — Foundation (entregue)

| Tema do debate | Entrega | Status |
|----------------|---------|--------|
| Ops: métricas + alertas | `product_events`, `/ops/metrics`, `evaluateOpsAlerts` | done |
| Notificação ops | `OPS_ALERT_WEBHOOK_URL`, `ops:alerts-check`, connect-worker | código done |
| Auth ops | `OPS_METRICS_KEY`, `x-internal-ops-key` | done |
| Telemetria uso | Ava, sync, billing, onboarding, higiene API | done |
| Logs sem PHI | `log-sanitization.ts` | done |
| Degrade parcial | Neo4j off, LLM cascade, classificador sem LLM | done |
| Documentação | `OBSERVABILITY.md`, `OPS_ALERTS_PRODUCTION.md`, este doc | done |

### Fase 1 — Ops enxuto (você só no indispensável)

**Objetivo:** sondas ativas + triagem antes do Slack; configurar canal ops em prod.

| # | Entrega | Debate | Esforço | Status |
|---|---------|--------|---------|--------|
| 1.1 | `OPS_ALERT_WEBHOOK_URL` + cron/worker em prod | alertas | config | **crítico pendente (manual)** |
| 1.2 | `ops:probe` (health + db latency) no connect-worker | sondas ativas | baixo | **done** |
| 1.3 | Regras alerta API down / PG slow em `ops-alerts.ts` | degradação infra | baixo | **done** |
| 1.4 | Script LLM triage (snapshot → infra vs app + `human_required`) | pirâmide Nível 2 | baixo | pendente |
| 1.5 | Slack só se `human_required` (filtrar dispatch) | menos pager | baixo | pendente |
| 1.6 | Ops snapshot JSON em cada `ops:alerts-check` | fallback ops dormente | baixo | **done** |
| 1.7 | GCP billing budgets | ambiente | config | doc exists |

**Critério de saída Fase 1:** você recebe Slack só quando probe + regras + triage não resolveram; API down detectada sem usuário.

### Fase 2 — Cache e freshness (performance + UX)

**Objetivo:** invalidação por estímulo (generation stamp); menos query pesada; badges “dados novos”.

| # | Entrega | Debate | Esforço | Status |
|---|---------|--------|---------|--------|
| 2.1 | Migration `data_generations` + `bump()` helper | cache backend | médio | **done** |
| 2.2 | Bump em writes: sync OK, exam import, higiene resolve | estímulo de dados novos | médio | **done** |
| 2.3 | `GET /account/freshness` (manifest L1) | login + sumarizado | médio | **done** |
| 2.4 | Web: refetch seletivo + badges por domínio | 1.2.1 + 1.2.2 | médio | **done** |
| 2.5 | L2 in-memory + `If-None-Match` em `GET /patients/:id/context` | cache BFF/API | baixo | **done** |
| 2.6 | SSE sync-completions → bump domains | ligar SSE ao manifest | baixo | **done** |

**Critério de saída Fase 2:** após sync, só abas afetadas refetch; contexto paciente não repete trabalho se generation igual.

### Fase 3 — Experiência do cliente: detectar e catalogar

**Objetivo:** visão 3D (usuário × feature × erro); UI avisa falha não tratada.

| # | Entrega | Debate | Esforço | Status |
|---|---------|--------|---------|--------|
| 3.1 | React Error Boundary global | POC lib UI | baixo | **done** |
| 3.2 | Wrapper `api.ts`: erro sem handler → ingest | POC API path | médio | **done** |
| 3.3 | `POST /telemetry/client-errors` (fingerprint, allowlist) | backend catalogar | médio | **done** |
| 3.4 | Agregação 3D (queries ou view interna) | usuário × feature × erro | médio | **done** |
| 3.5 | Playbooks Nível 1: mapa feature × erro → mensagem UI | fallback interface | médio | **done** |
| 3.6 | Banner “dados podem estar desatualizados” (sync fail/stale) | alívio pressão | baixo | **done** (Carteira) |

**Critério de saída Fase 3:** você vê top fingerprints sem esperar ticket; usuário vê mensagem clara em erro não tratado.

### Fase 4 — Fallbacks dormentes (resiliência)

**Objetivo:** estruturas paralelas acordam sob gatilho forte; aliviam PG/sync/LLM.

| # | Entrega | Debate | Esforço | Status |
|---|---------|--------|---------|--------|
| 4.1 | Flag `sync_degraded_{portal}`: pausa scheduled + só manual | sync multi-caminho | médio | **done** |
| 4.2 | UI “último sync OK” + cache leve por link | sync fallback | baixo | **done** |
| 4.3 | Ava lite automático (`llm_cascade_fail`) | fallback LLM | baixo | **done** |
| 4.4 | Modo `degraded_read` via manifest (L3) | snapshot D-1 | médio | **done** |
| 4.5 | Job noturno snapshot GCS (carteira/timeline) | PG stress | médio | **done** |
| 4.6 | Neo4j degrade | já existe | — | done |

**Critério de saída Fase 4:** incidente PG ou portal não exige improviso; modo degradado visível na UI.

### Fase 5 — Proativo ao usuário (opt-in, legal)

**Objetivo:** avisar falha e regularização; canal alternativo só onde vale.

| # | Entrega | Debate | Esforço | Status |
|---|---------|--------|---------|--------|
| 5.1 | Incident state: open → resolved (server) | avisar quando regularizar | médio | pendente |
| 5.2 | Push/e-mail in-app genérico (sem PHI) | notificação | médio | pendente |
| 5.3 | `run-user-escalation` sync crítico persistente | POC WhatsApp | alto | pendente |
| 5.4 | Canal alternativo (WhatsApp bot) | POC transacional | alto | **fora de escopo curto** |
| 5.5 | Revisão legal LGPD notificações | segurança | — | pendente |

**Critério de saída Fase 5:** usuário informado sem PHI em canal externo; opt-in explícito.

### Fase 6 — Maturidade (backlog)

| Entrega | Debate |
|---------|--------|
| Alertas degradação p95 vs baseline 7d | sondas degradação |
| `human_required` em todos alertas ops | pirâmide completa |
| `incident_id` correlacionando ops + cliente + modo degradado | correlação |
| Grafana / Better Stack | dashboard |
| `run-dev-audit-bridge` | staging |
| Anomaly detection | fora de escopo |

---

## 14. Pendências críticas (prioridade absoluta)

Ordem sugerida para **beta com integrações frágeis** e **tempo limitado**:

| Prioridade | Item | Fase | Por que é crítico |
|------------|------|------|-------------------|
| **P0** | Configurar webhook + cron ops em prod | 1.1 | Sem isso, Fase 0 não opera de verdade |
| **P0** | `ops:probe` + alertas health/db slow | 1.2–1.3 | **done** — falta webhook em prod |
| **P0** | Banner stale + falha sync na Carteira | 3.6 | **done** |
| **P1** | `data_generations` + bump em sync/exam | 2.1–2.2 | Evita degradação PG quando uso cresce |
| **P1** | `GET /account/freshness` + badges | 2.3–2.4 | Refetch seletivo + “novos dados” |
| **P1** | Client error ingest (fingerprint) | 3.1–3.4 | Saber que UI quebrou antes do WhatsApp |
| **P2** | LLM triage + Slack filtrado | 1.4–1.5 | Reduz seu pager |
| **P2** | Ava lite automático | 4.3 | LLM outage |
| **P2** | Sync degraded mode (pausa portal) | 4.1 | Ops + UX em outage Amil/Unimed |
| **P3** | Snapshot D-1 + modo degradado leitura | 4.4–4.5 | Só se PG stress real |
| **P3** | Proativo usuário (e-mail/push) | 5.x | Após manifest + playbooks |
| **P4** | WhatsApp / bot transacional | 5.4 | Honeroso; depois de P0–P2 |

### O que NÃO é crítico agora

- Segundo Postgres quente, Redis cluster, Grafana self-hosted, WhatsApp bot completo, stack traces brutos, anomaly ML.

### Dependências entre fases

```text
Fase 1 (probe) ──► Fase 4.4 (acordar snapshot quando probe + PG slow)
Fase 2 (generations) ──► Fase 3 (manifest alimenta refetch após erro resolvido)
Fase 3 (ingest erro) ──► Fase 5 (notificar “regularizado”)
Fase 1 (triage) ──► menos dependência de Fase 5
```

### Roadmap.json (`prod-run-intelligence`)

| Item roadmap | Fase |
|--------------|------|
| run-product-events-ingest … run-error-fingerprint | 0 done |
| run-operation-model-doc | 0 done |
| run-ops-probe | 1 |
| run-data-generations | 2 |
| run-client-error-ingest | 3 |
| run-wakeable-fallbacks | 4 |
| run-user-escalation | 5 |
| run-dev-audit-bridge | 6 |
