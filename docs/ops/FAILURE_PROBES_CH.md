# Failure Probes — captura CH (spec canônica)

**Status:** spec (2026-10-06) · Rafael  
**Épico roadmap:** `failure-probes-ch`  
**Evolui:** telemetria `client_errors` + bridge allowlist → **captura global com opt-out por feature**

> **Escopo deste documento:** arquitetura alvo, contrato de dados e limites de pacote. Implementação fatiada em `failure-probes-ch`; **sem** refactor grande no monorepo até fatias SDK.

### MVP (decisão Rafael 2026-10-06)

| **MVP — implementar** | **Pós-MVP — só documentar** |
|------------------------|-------------------------------|
| React **web** SDK (evoluir `client-errors`) | Backend probe / filter Fastify (`@aiyra-care/failure-probe-fastify`) |
| React **Native** mobile SDK | Pacote **Angular** (CH / outros consumidores) |
| Bridge blocklist `FAILURE_PROBE_OPT_OUT_FEATURES` (M2) | SDK **Android / iOS** nativos |
| Suite QA `failure-probes-ch` (após M2) | |

**Fora do produto Failure Probes (permanece como hoje):** hook API **5xx por prefixo** (`CLIENT_ERROR_INCIDENT_API_PREFIXES` + ingest sintético no bridge) — ops/telemetria existente, **não** entra no MVP nem na migração de pacote probe.

---

## 1. Visão

**Failure Probes** é uma camada de captura centrada no **Command Hub (CH)** — quase um produto à parte, reutilizável fora do AiyraCare no longo prazo. Objetivo: declarar e correlacionar **falhas com impacto no usuário** antes de qualquer mensagem genérica («algo deu errado»), enviar contexto mínimo ao backend e acionar a cadeia automática **INC → triagem → DEF** já existente.

| Inclui (MVP web + mobile) | Não inclui (MVP) |
|-------------|-----------------|
| Exceção UI não tratada **sem** fallback utilizável (web + RN) | Degradação ops / alertas SRE (`ops_alerts`, runtime degraded) |
| HTTP **500–599** ou resposta API inesperada **sem** workaround no **cliente** | Backend Failure Probe / plugin Fastify (pós-MVP) |
| Erro de boundary React / interceptor API (web/mobile) | Angular package; SDK nativo Android/iOS (pós-MVP) |
| | PHI, stack traces em PG, dumps clínicos |
| | Notificar usuário quando corrigido (roadmap doc only) |

**Paralelo (não é Failure Probe):** hook servidor 5xx por prefixo no API — continua [`CLIENT_ERROR_INCIDENT_BRIDGE.md`](./CLIENT_ERROR_INCIDENT_BRIDGE.md).

**Princípio UX:** coleta **silenciosa** de contexto → ingest → bridge CH; o usuário só vê UI de erro padrão ou fluxo **Reportar problema** se quiser relato humano.

---

## 2. Objetivos e não-objetivos

### Objetivos

1. **Default global** de captura em superfícies suportadas, com **opt-out por feature** (inverter o modelo atual de allowlist `CLIENT_ERROR_INCIDENT_FEATURES`).
2. Contrato estável **probe → ingest → fingerprint → dedupe → INC** compartilhado entre **web e mobile** (MVP); backend probe documentado para pós-MVP.
3. Respeitar **LGPD**: sem PHI em Postgres; stacks só em log servidor quando aplicável.
4. **Manutenção planejada** suprime auto-INC (comportamento atual do bridge — manter).
5. Pacotes SDK nomeados para extração futura (`@aiyra-care/failure-probe` ou namespace CH probe).

### Não-objetivos (MVP)

- Substituir `support_reports` ou exigir consentimento extra para probes (telemetria técnica já coberta em política de privacidade / finalidade suporte).
- Unificar hook 5xx API existente no produto «Failure Probe» (permanece bridge separado).
- «Fixed notification» aos clientes impactados (ver §11 roadmap futuro).
- Unificar com Neo4j ou RAG clínico.

### Pós-MVP (spec apenas, sem entrega MVP)

- Pacote Angular (`FailureProbeModule` sketch).
- Plugin Fastify / backend outbound probe.
- SDK nativo Android/iOS (após paridade RN).

---

## 3. Tipos de probe

| `probe_kind` | Superfície | Quando dispara | `error_kind` legado |
|--------------|------------|----------------|---------------------|
| `ui.unhandled` | Web RN | Error boundary / render throw sem recovery | `ui` |
| `ui.promise` | Web RN | Unhandled rejection em fluxo feature | `ui` |
| `api.unexpected` | Web RN | Status 5xx ou shape inválido sem fallback local | `api` |
| `api.client` | Web RN | 4xx inesperado **sem** handler (opcional, tuning) | `api` |
| `companion.stream` | Web RN | Falha terminal stream Ava (hoje `ava_companion`) | `companion` |

| `server.outbound` | API Fastify | **Pós-MVP** (produto probe). **Hoje:** hook 5xx por prefixo no bridge — fora do MVP SDK. | `api` (`error_code=HTTP_5xx`) |

**Declared failure:** o SDK marca `declared: true` quando a falha é user-visible (tela quebrada ou ação bloqueada). Ruído interno (retry ok) pode ficar `declared: false` até política de volume.

---

## 4. Contrato de dados (ingest)

### Transporte atual (evolução)

| Hoje | Alvo |
|------|------|
| `POST /telemetry/client-errors` | Mesmo endpoint v1; corpo compatível + campos probe opcionais |
| Tabela `client_errors` (051) | Mesma tabela; mig futura só se colunas probe exigirem índice |

### Payload (sem PHI)

Campos **obrigatórios** (alinhados a `packages/web/src/lib/client-errors.ts`):

| Campo | Tipo | Notas |
|-------|------|--------|
| `feature` | string | Chave estável (`patient_wallet`, `ava_companion`, …) |
| `error_kind` | enum | `ui` \| `api` \| `companion` |
| `error_code` | string | Ex.: `HTTP_500`, `ChunkLoadError`, `AVA_STREAM_ABORT` |
| `fingerprint` | string(16) | Ver §5 |
| `route` | string? | Rota SPA / screen name |
| `api_path` | string? | Path template API (`/patients/:id/exams`) |
| `deployment_tier` | string | Do servidor se omitido no cliente |

Campos **probe (novos, opcionais v1)**:

| Campo | Tipo | Notas |
|-------|------|--------|
| `probe_version` | string | Semver pacote probe |
| `probe_kind` | string | §3 |
| `declared` | boolean | Falha user-impacting |
| `sdk_surface` | `web` \| `mobile` (MVP); `backend` reservado pós-MVP |
| `context` | object | Allowlist: `build`, `locale`, `viewport`, `portal_type`, `integration_link_id` (uuid ok), **sem** nomes, CPF, texto clínico |

**Proibido em PG e webhook INC:** stack trace, `message` com PII, corpo de resposta API, tokens, conteúdo Ava.

### Servidor 5xx (fora do MVP Failure Probe)

O hook atual (log server-only + ingest sintético + bridge por prefixo) permanece em `client-error-incident-bridge.config.ts` — **não** faz parte do MVP Web + Mobile. Pós-MVP pode alinhar contrato JSON com §4 via plugin Fastify dedicado.

---

## 5. Fingerprint

Regra estável (cliente e servidor):

```text
fingerprint = first16( sha256( `${feature}|${error_kind}|${normalized_code}` ) )
```

- `normalized_code`: upper-case; strip querystring de paths; mapear `HTTP_5\d\d` → `HTTP_5xx` opcional em prod para dedupe.
- Mesma fingerprint alimenta CH **Produto & UX**, dedupe INC (`client_error_incident_signals`) e dedupe DEF pós-triagem.

---

## 6. Ponte para INC (CH)

Fluxo alvo (inalterado em espírito; config evolui):

```text
Probe SDK → POST client-errors → insert PG
       → FailureProbePolicy (default ON, feature opt-out)
       → ClientErrorIncidentBridgeService (MIN_COUNT, dedupe, lane SRE)
       → ops_analysis_queue (INC-*)
       → IncidentDispatchService → triagem
```

| Knob | Hoje | Alvo |
|------|------|------|
| Master | `CLIENT_ERROR_INCIDENT_BRIDGE_ENABLED` | Mantém |
| Escopo features | **Allowlist** `CLIENT_ERROR_INCIDENT_FEATURES` | **Blocklist** `FAILURE_PROBE_OPT_OUT_FEATURES` (env) + default capture all declared |
| Ruído | `MIN_COUNT`, `DEDUPE_MS` | Mantém; ver [`CLIENT_ERROR_INGRESS_PROD_POLICY.md`](./CLIENT_ERROR_INGRESS_PROD_POLICY.md) |
| Lane SRE | `CLIENT_ERROR_INCIDENT_SRE_FEATURES` | Mantém até probe policy unificada; **decisão 4B (2026-10-06):** `integration_links` → `sre_support` só em `DEPLOYMENT_TIER=production`; notebook/preview ficam `development_support` — ver [`CLIENT_ERROR_INGRESS_PROD_POLICY.md`](./CLIENT_ERROR_INGRESS_PROD_POLICY.md) §8.4 |
| Manutenção | `OPS_PLANNED_MAINTENANCE=1` | Suprime enqueue INC; ingest continua |

**Transição:** até migração de config, allowlist atual continua válida; novos SDKs devem emitir `declared: true` para falhas qualificadas mesmo fora da allowlist (ingest sempre); bridge só abre INC quando política permitir.

Doc operacional legado: [`CLIENT_ERROR_INCIDENT_BRIDGE.md`](./CLIENT_ERROR_INCIDENT_BRIDGE.md) (marcado como evoluindo para probes).

---

## 7. Manutenção e ruído

- **Planned maintenance:** não abrir INC automático (bridge + hook 5xx) — [`OPS_PLANNED_MAINTENANCE.md`](./OPS_PLANNED_MAINTENANCE.md).
- **Deploy notebook:** Rafael pode usar manutenção + `MIN_COUNT` baixo em piloto.
- **Prod:** preferir atrasar INC a spam (charter solo operator); probes não bypassam `MIN_COUNT`.

---

## 8. Limites de pacote

| Pacote | MVP | Repo path (atual / alvo) | Responsabilidade |
|--------|-----|---------------------------|------------------|
| `@aiyra-care/failure-probe-core` | sim (M3) | `packages/failure-probe` (novo) | Tipos Zod, fingerprint, normalização, default-on/opt-out |
| `@aiyra-care/failure-probe-react` | **sim** | `packages/web/src/lib/client-errors.ts` | Boundary, `reportClientError`, React 19 |
| `@aiyra-care/failure-probe-react-native` | **sim** | `packages/mobile/src/lib/client-errors.ts` | Paridade web |
| Ingest API | sim (existente) | `packages/api` telemetry routes | Auth, validação, insert, bridge |
| `@aiyra-care/failure-probe-angular` | pós-MVP | doc / sketch | ErrorHandler + HTTP interceptor espelhado |
| `@aiyra-care/failure-probe-fastify` | pós-MVP | `packages/api` (futuro) | Não substitui hook prefixo 5xx no MVP |

Namespace alternativo longo prazo: pacotes publicados sob org **CH probe** se Aiyra e CH divergirem — contrato JSON permanece igual.

---

## 9. Superfícies

### 9.1 MVP — Web SDK (React)

- **Existe:** `client-errors.ts`, `AppErrorBoundary`, interceptor `api.ts`.
- **Evoluir:** extrair core; `declared` + `probe_kind`; default emitir todas features; mapa opt-out via env build `VITE_FAILURE_PROBE_OPT_OUT`.

### 9.2 MVP — Mobile SDK (React Native)

- **Existe parcial:** `packages/mobile/src/lib/client-errors.ts`
- **Evoluir:** paridade web + app state screen keys

### 9.3 Pós-MVP — Angular (documentação)

- `FailureProbeModule.forRoot({ ingestUrl, optOutFeatures })`
- `ErrorHandler` global + HTTP interceptor
- Mesmo payload §4

### 9.4 Pós-MVP — Native Android / iOS

- Após RN; Crashlytics **não** substitui probe CH (sem INC automático) — integração futura opcional.

### 9.5 Pós-MVP — Backend SDK (Fastify)

- Plugin `registerFailureProbe` — contrato §4; **não** confundir com hook 5xx por prefixo já em produção no bridge.

---

## 10. Migração desde `client-errors` + bridge allowlist

| Fase | Entrega |
|------|---------|
| **M0 (esta PR)** | Spec + roadmap + cross-links; sem mudança de código obrigatória |
| **M1** | `declared` + ingest sempre; bridge ainda allowlist (comportamento atual) |
| **M2** | Env `FAILURE_PROBE_OPT_OUT_FEATURES`; bridge lê blocklist; deprecar expandir `CLIENT_ERROR_INCIDENT_FEATURES` |
| **M3** | Extrair `packages/failure-probe`; web/mobile importam core |
| **Pós-MVP** | Angular package, Fastify plugin, nativo iOS/Android — spec §9.3–9.5 apenas |

QA contínua: [`client-error-ch-bridge`](../testing/suites/client-error-ch-bridge.md) até suite `failure-probes-ch` existir.

---

## 11. Roadmap futuro (somente documentação)

**Notificação de correção:** quando DEF `fixed` + INC `resolved` para fingerprint F, produto **poderia** notificar contas com eventos `client_errors` recentes para F — requer opt-in marketing/suporte, canal push/email, e política médica para Ava. **Não implementar** até épico dedicado.

---

## 12. Relacionados

| Doc | Uso |
|-----|-----|
| [`CLIENT_ERROR_INCIDENT_BRIDGE.md`](./CLIENT_ERROR_INCIDENT_BRIDGE.md) | Bridge atual (evoluindo) |
| [`CLIENT_ERROR_INGRESS_PROD_POLICY.md`](./CLIENT_ERROR_INGRESS_PROD_POLICY.md) | MIN_COUNT / dedupe / decisões Rafael |
| [`CH_AUTONOMOUS_OPS_STACK.md`](./CH_AUTONOMOUS_OPS_STACK.md) | Pipeline INC |
| [`TELEMETRY.md`](./TELEMETRY.md) | `client_errors` queries |
| [`CH_OPS_GAP_AND_PRIORITY.md`](./CH_OPS_GAP_AND_PRIORITY.md) | Prioridade engenharia |
| Feature card | [`../features/failure-probes-ch.md`](../features/failure-probes-ch.md) |

---

## 13. QA

- Regressão bridge: `npm run qa:run -- --suite client-error-ch-bridge`
- Futuro: suite `failure-probes-ch` (default-on + opt-out + manutenção)
