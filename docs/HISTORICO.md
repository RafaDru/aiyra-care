# Histórico do Projeto AiyraCare

## [2026-09-03] - Base de conhecimento e entregas roadmap (família, Amil, B2B, docs)

### Contexto
Consolidar tracking de negócio/funcionalidade para humanos e LLMs; fechar itens alinhados do roadmap (higienização Neo4j, Amil filtro, orgs B2B, screenshots landing, preview).

### Realizado
- **Documentação:** `docs/DOCUMENTATION_SYSTEM.md`, `docs/README.md`, `docs/features/` + `index.json`, `docs/help/*`.
- **API:** `GET /project/context` passa a incluir catálogo `features` do index.
- **Família (design):** `docs/FAMILY_ACCESS_MODEL.md` + épico `family-access-model` + feature card.
- **Amil:** modal período/beneficiário; query params sync; sub-etapa `fetch-utilizacao`.
- **B2B:** API `/organizations` + members (migration 055).
- **Higienização:** `HygieneGraphProjector` DUPLICATE_CANDIDATE + testes.
- **Preview:** `up-preview.ps1` aplica migrations antes do seed.
- **Landing:** screenshots reais em `packages/web/public/landing/`.

### Decisão
- **Fonte de verdade semântica** permanece no repo (`roadmap.json` + feature cards + domain docs).
- **GitHub Projects** = kanban operacional com labels `roadmap:<id>`, não substitui `.md`.

### Próximo
- [ ] Fase 1 `family-access-grants-schema` + convites
- [ ] `ava-help-knowledge-base` — expor help para Ava
- [ ] Labels `roadmap:*` no GitHub

## [2026-09-03] - Ops Run: console visual, gráficos e checklist preparação

### Contexto
Fechar itens `run-ops-console-visual-design` e `run-ops-console-charts-scales` do épico `prod-run-intelligence`; consolidar workspace canônico `aiyra-care`.

### Realizado
- **Console `:3013`:** tema AiyraCare (`ops-theme.tsx`), KPIs com sparklines, gráficos Recharts (sync, Ava, probe, fail rate, orçamento).
- **Thresholds:** `ops-thresholds.ts` — latência probe ok/warning/critical alinhada à API (`OPS_PROBE_*`).
- **Séries:** `timeSeries24h` na API + percentis Ava 24h vs 7d no painel Ava.
- **Docs:** `docs/infra/OPS_PREP_CHECKLIST.md` — ritual local, preview, gates.
- **Workspace:** canônico `%USERPROFILE%\workspace\aiyra-care` (repo `RafaDru/aiyra-care`); pasta `aiyra-cara` removida.

### Próximo
- [ ] `run-dev-audit-bridge` — correlacionar dev-audit com product_events
- [ ] Validar `promotion:gates` no Preview local

### Próximo
- [ ] `env-preview-host` — Preview no GCP

## [2026-09-03] - Validação local preview + ritual `preview:validate`

### Realizado
- **`npm run preview:validate`** — ritual único (dual-keys, health, post-deploy, smoke preview, dev-audit bridge).
- **Fix `.env.preview`** — API/console carregam override quando `PORT=3020` / `DEPLOYMENT_TIER=preview`.
- **PG preview** — `seed:staging-refresh` em `aiyracare_preview` (Lucas/Ana demo + volume sintético).
- **Guia manual:** `docs/infra/PREVIEW_LOCAL_TEST_GUIDE.md` (~45 min de roteiro).
- **Validado:** `preview:validate` OK · integração `ops:smoke` FULL OK · notificadores `:3012` + `:3022`.

## [2026-09-03] - run-dev-audit-bridge: hooks Cursor × product_events

### Realizado
- **CLI** `npm run dev-audit:bridge` — lê `docs/dev-audit/**/*.jsonl` + `product_events` no PG.
- **API** `GET /ops/dev-audit-bridge` — relatório JSON (ops key).
- **Correlação:** buckets horários agente vs uso app; hints operacionais; output `dev-audit-bridge-last.json`.
- **Testes:** `dev-audit-bridge.test.ts` no `test:ops`.

### Próximo
- [ ] `env-preview-host` — Preview no GCP

## [2026-09-03] - run-user-escalation: aviso família em sync crítico (opt-in)

### Realizado
- **Migration 056** — `account_notification_preferences` + `sync_escalation_incidents` (open → resolved).
- **API:** `GET/PATCH /account/notification-preferences`, `GET /account/sync-escalations`.
- **Gatilho:** 3+ falhas em 24h no mesmo `integration_link`; cooldown 6h; resolve ao sync OK.
- **Canal:** webhook genérico (`USER_ESCALATION_WEBHOOK_URL` ou `OPS_ALERT_WEBHOOK_URL`) — sem PHI.
- **UI:** Configurações → Geral → toggle opt-in.
- **Telemetria:** `sync_escalation_opened` / `sync_escalation_resolved`.

### Próximo
- [ ] `run-dev-audit-bridge` — correlacionar dev-audit com product_events
- [ ] `env-preview-host` — Preview no GCP

## [2026-09-03] - Ops dual keys: `.env.preview` isolado

### Realizado
- **Arquivo `.env.preview`** — chaves ops e PG preview separados de `.env` (integração).
- **Scripts:** `setup:ops-preview` escreve em `.env.preview`; `validate:ops-dual-keys` bloqueia chaves iguais.
- **`up.ps1 -Preview`** — carrega `.env` + override `.env.preview`.
- **Gates:** `promotion:gates` inclui validação opcional de dual keys.

### Próximo
- [ ] `env-preview-host` — Preview no GCP

## [2026-09-03] - Workspace canônico `aiyra-care`

### Decisão
- Repositório e workspace: `%USERPROFILE%\workspace\aiyra-care` (`https://github.com/RafaDru/aiyra-care.git`).
- Nome `aiyra-cara` descontinuado; ver `docs/CURSOR_WORKSPACE.md` e `scripts/migrate-cursor-workspace.ps1`.

## [2026-09-02] - Política ambientes: local → GCP Preview

### Decisão
- **Ambiente 1 (Integração):** permanece **local** (+ CI GitHub).
- **Ambiente 2 (Preview):** **local** (`up:preview`, `3020/5174`) até ritmo de promoção + testes estável; depois **GCP** (projeto `openhealth-503119`).
- **Cursor Cloud:** fora de escopo por hora.
- Docs: `TWO_ENV_MODEL.md`, `ENV_PREVIEW.md`, `DEPLOY_PREVIEW.md`.

## [2026-09-02] - SUS lembrete reimport + B2B org schema

### Realizado
- **Migration 054** — `sus_reimport` em `care_reminders`; lembrete 6 meses após sync ConecteSUS.
- **Migration 055** — `organizations` + `organization_members` (B2B primitives).
- **UI:** `CareReminderBanner` — ação «Reimportar SUS» no perfil do paciente.
- Domain `Organization` entity; roadmap `sus-reminder` done.

## [2026-09-02] - SUS sync silencioso + reimport UX + E2E smoke

### Realizado
- **API:** `POST /patients/:id/conectesus/sync?silent=1` — fetch HTTP gov.br + import com dedup.
- **Web:** `useSilentConecteSUSSync` na Carteira; `SusPublicHealthBanner` na aba Vacinas.
- **E2E:** Playwright `e2e/smoke.spec.ts` no CI web job.
- Roadmap: `sus-reimport-ux`, `del-e2e-smoke` done.

## [2026-09-02] - Ambientes: volume staging + CI staging + probe gate

### Realizado
- **seed-staging-volume.mjs** — sync_jobs, product_events, llm_usage sintéticos.
- **refresh-staging-demo.mjs**, **apply-all-migrations.mjs**, **staging-probe-gate.mjs**.
- **CI:** `.github/workflows/staging.yml` (database-smoke), `deploy-prod.yml` (manual).
- Docs: `BACKUP.md`, `DEPLOY_STAGING.md`; épico `platform-environments` **done**.

## [2026-09-02] - Ecossistema visual + ambientes + seed demo

### Contexto
CNPJ em regularização; priorizar estruturação técnica e mapa de negócio (personas B2B + marketplace farmácias horizonte).

### Realizado
- **docs/ECOSYSTEM.md** — mapas mermaid (personas, valor, monetização, marketplace sem patrocínio).
- **docs/B2B_PARTNERS.md** — segmentos + marketplace farmácias.
- **docs/infra/ENVIRONMENTS.md** — matriz local/staging/prod.
- **seed-demo-data.mjs** + `npm run seed:demo`; **validate-migrations.mjs** no CI.
- Roadmap: `business-ecosystem`, itens `platform-environments` parciais done.

## [2026-09-02] - Roadmap: ambientes dev/staging/prod + discovery B2B

### Contexto
Regularização de CNPJ em andamento — cobrança live adiada; foco em estruturar aplicação (massas, staging sintético, esteiras) e planejar oferta B2B.

### Realizado
- **Roadmap** — épicos `platform-environments` (P2) e `b2b-partner-platform` (P3) em `docs/roadmap.json`.
- **Ambientes:** gerador de massas, staging «shape produtivo» com dados fake, CI staging/prod, gates migration, backup, sondas, worker parity.
- **B2B:** discovery por segmento (médicos, planos, labs, farmácias), primitives org/RBAC/API, pricing e contratos.

### Decisões
- **Staging** não restaura dump de prod com PHI; massas sintéticas LGPD-safe.
- **B2B** em discovery separado do go-live B2C; export/share médico evolui dentro do pacote clínico.
- Docs detalhados: `docs/infra/ENVIRONMENTS.md` e `docs/B2B_PARTNERS.md` (backlog nos épicos).

## [2026-09-01] - Sessão gov.br persistida + auth genérico nos portais

### Contexto
ConecteSUS/Caderneta abriam Chrome em cada “Buscar”; falhas de sync em convênios não orientavam o usuário a atualizar senha vs reconectar sessão.

### Realizado
- **Migration 053** — `govbr_sessions` (token FHIR por `account_id`); `integration_links.auth_attention`; `sync_jobs.failure_kind`.
- **SUS:** `GovBrTokenSession` + `PublicHealthScrapeService`; reimport ConecteSUS/Caderneta **sem browser** enquanto token válido; `GET /account/govbr-session`.
- **Auth portais:** `domain/portal-auth/portal-auth-failure.ts` + `portal-sync-auth.helper.ts`; UI Integrações com avisos credentials/session.
- **Docs:** `SUS_CONECTESUS.md`, `CONNECT.md`, `project-context.json`, roadmap `sus-govbr-session` + `connect-portal-auth`.

### Decisões
- Sessão **gov.br** na **conta** (`govbr_sessions`), espelhando `calendar_connections` — não em `integration_links` (que é vínculo paciente×portal com senha).
- Sessão **convênio/hospital/lab** continua em `integration_links.encrypted_session_token`.
- Scrapers gov.br ainda em `packages/api` (Connect Fase 2); contrato canônico government pendente.

### To-Dos
- [ ] ConecteSUS no sync silenciente da Carteira quando `govbr_session.sessionReady`
- [ ] UX reimport SUS em Vacinas (`sus-reimport-ux`)

## [2026-09-01] - Grupo Fleury UI fase 1 + ops dashboard local

### Realizado
- **Fleury UI:** card Grupo Fleury na Nova integração, busca por submarca, labels em Integrações/sync/carteira (`fleury_group` + `integration-catalog`).
- **Logos:** `public/brands/fleury/` — Grupo Fleury SVG (CDN), Pardini, Fleury, a+, Labs a+; pills com imagem em `FleuryLabBrandPill`.
- **Ops:** página `http://localhost:5173/ops`, API client `api.ops.*`, notifier local (`ops-local-notifier.mjs` + toast), `up.ps1` integrado.
- **Dispatch:** payload com `dashboardUrl`; docs `OPS_ALERT_CHANNELS.md`, `OPS_ALERTS_PRODUCTION.md`.

### To-Dos
- [ ] Fase 2 Fleury: badge laboratório nos exames + filtro por marca
- [ ] Kit oficial Hermes Pardini (central downloads Grupo Fleury)

## [2026-08-31] - Grupo Fleury Precision Care — documentação + PoC auth/marca

### Contexto
Hermes Pardini integrado ao Grupo Fleury; portal unificado com login OTP (SMS/e-mail/WhatsApp) exibe exames Pardini na mesma conta. APIs já são Fleury (`resultados.grupofleury.com.br` + `paciente/api/v1`).

### Realizado
- **docs/FLEURY_PRECISION_CARE.md** — arquitetura, endpoints, headers de marca, hipóteses PoC.
- **Scripts:** `probe:fleury-auth` (OTP interativo + password), `probe:fleury-marca` (replay `/pedidos` por perfil).
- **Código:** `FLEURY_PRECISION_MARCA_PROFILES`, `fleuryPrecisionUnifiedEntryUrl`, `openFleuryPrecisionUnifiedPortal`.
- **Roadmap:** épico `fleury-precision-care`; **CONNECT.md** + **AGENTS.md** atualizados.

### To-Dos
- [ ] Rodar PoC com conta real (`FLEURY_PROBE_SAVE_FULL_TOKEN=1` + `probe:fleury-marca`)
- [ ] Sync UI OTP; connector `grupo_fleury_precision_care`

## [2026-08-31] - Fase 1 ops: sondas + banner Carteira

### Realizado
- **ops:probe** — latência `/health`, PG `SELECT 1`, Neo4j opcional; artefato `scripts/output/ops-probe-last.json`.
- **Alertas infra** — `infra_api_down`, `infra_postgres_slow`, etc. em `evaluateOpsAlerts`.
- **connect-worker** — roda probe antes de ops-alerts; `ops-alerts-check` grava `ops-metrics-last.json`.
- **Web** — banner stale/falha na aba Carteira (`wallet-sync-banner.ts`).
- **Docs** — `OPERATION_MODEL.md` faseamento §13–14; `PARALLEL_WORK.md` (ops vs Fleury).

## [2026-08-28] - Modelo operacional (observação, cache, resiliência)

### Contexto
Thread de desenho: operação enxuta, sondas ativas, fallbacks dormentes, cache por geração de dados (manifest freshness), escalação automação → LLM → humano. Sem implementação completa — documentação de decisão.

### Realizado
- **docs/OPERATION_MODEL.md** — taxonomia, pirâmide de escalação, sondas realistas, fallbacks, níveis L0–L3 de cache/freshness, fora de escopo, incrementos sugeridos.
- **docs/OBSERVABILITY.md** — link ao modelo operacional; lacunas atualizadas.

## [2026-08-26d] - Ava: prompt compacto + hooks troca paciente

### Realizado
- **Prompt builder:** com pins ativos na conversa, `buildMinimalContextBlock` (alergias + meds + identidade); detalhes vêm dos pins.
- **Hooks troca paciente:** modal ao mudar lente com pins de outro paciente (manter ou remover); hint de inatividade (45 min) com pins ativos.
- **Testes:** `ava-prompt-builder.test.ts`.

## [2026-08-26c] - Ava: pins de sessão + LGPD conversas

### Realizado
- **Migration 048:** `ava_session_context` (pins por conversa; cascade com conversa).
- **API contexto:** `GET/PATCH /ava/conversations/:id/context` (pin/unpin); bloco **REGISTROS PINADOS** no prompt; aceleradores auto-pin `source=accelerator`.
- **LGPD:** `PATCH` arquivar, `DELETE` conversa, `GET /ava/conversations/export` (JSON conta); cascade `DELETE /auth/account` já cobre `ava_conversations`.
- **Web:** chips de contexto (`AvaContextChips`); arquivar/excluir conversa no drawer.
- **Testes:** `ava-session-context.test.ts` em `test:critical`.

## [2026-08-26b] - Ava: conversas persistidas + anexo de imagem no chat

### Realizado
- **Migration 047:** `ava_conversations`, `ava_messages`; FK `llm_usage_events.conversation_id` → conversa.
- **API:** `GET/POST /ava/conversations`, mensagens; chat com `conversationId` (auto-criação), persistência de turnos; `attachmentDocumentId` + bloco OCR/interpretação (`AvaDocumentContextService`).
- **Web:** seletor de conversa no drawer; retomar última sessão do paciente; `conversationId` no dock; anexo de imagem com modal de aviso de consumo IA (dismiss em localStorage).
- **Atividade:** `context.attachment` no stream SSE.
- **Testes:** `ava-conversation.test.ts`, `ava-document-context.test.ts`.

## [2026-08-26] - Ava: expressões, ferramental read-only, status SSE, UX chat

### Realizado
- **Expressões:** PNGs dedicados (`greeting`, `listening`, `reflective`, `researching`); crossfade dock ~2,2s; chat lite 1s; `docs/AVA_EXPRESSIONS.md`.
- **UX chat:** layout conversacional estável; balão de pensamento à direita (overlay no thread); trilha de status sem disclaimer redundante.
- **Ferramental G4 (parcial):** `ava-tools.ts` + `ava-activity.ts`; ferramentas read-only com heurísticas; SSE `streamActivity` no chat; UI `chatWithActivity` + passos no balão.
- **Quota dev:** `LLM_QUOTA_UNLIMITED` / bypass por e-mail; web `isLlmQuotaExhausted` respeita `quotaBypassed`.
- **Docs:** `AVA_OPERATIONAL.md` G4 parcial; testes `ava-tools.test.ts` em `test:critical`.

## [2026-08-25c] - Ava G2 + UX chat (chips, balão flutuante)

### Realizado
- **G2:** `AvaOperationalContextService` (navegação, sync read-only, laudos); links internos no markdown.
- **UX drawer:** removida Ava duplicada no header; chips de paciente em vez de dropdown.
- **Balão de pensamento:** overlay flutuante no thread durante LLM; sem trilha pontilhada.

## [2026-08-25b] - Ava G1: aceleradores + entity pins

### Contexto
Primeiro grupo de Ava operacional: botões contextuais que abrem o dock com lente correta e registro em foco no prompt.

### Realizado
- **API:** `entityPin` no body de `POST /patients/:id/ava/chat`; `AvaEntityContextService` (exam, exam_order, exam_result_item, exam_marker); bloco **REGISTRO EM FOCO** no orchestrator.
- **Web:** `ava-dock-bus.ts` (`aiyracare:ava-open`); `AvaAcceleratorButton`; integração em `ExamsTab`, `ExamMarkersDashboard`, `InlineExamMarkersList`.
- **Docs:** `AVA_OPERATIONAL.md`; `ava-accelerators` → done no roadmap.
- **Testes:** `ava-entity-context.test.ts` em `test:critical`.

## [2026-08-25] - Ava: lente de paciente, layout conversacional, pool de tokens

### Contexto
Corrigir fallback Bruno, seletor de paciente, UX face-a-face e barra de tokens incoerente.

### Realizado
- **docs/AVA_PATIENT_LENS.md** — estratégia lente + layout + tokens.
- **useAvaPatientLens** — rota → último usado → `isSelf` → primeiro; override no drawer.
- **AvaPatientLensSelect** no header do drawer; reset do chat ao trocar (`key` + epoch).
- **Layout conversacional** — colunas Ava (108px) | mensagens | usuário (52px); nuvem de pensamento com trilha.
- **computeLlmUsageQuota** — `usagePercent` sobre pool total (franquia restante + pacotes).
- **AvaQuotaBar** — detalhe com % do pool.

## [2026-08-24b] - Pipeline de entrega, hooks Cursor, paciente titular (Você)

### Contexto
Endurecer operação agêntica (LLM-agnóstica), lastrear desenvolvimento, atualizar roadmap com ciclo Build/Run e entregar diferenciação do paciente titular da conta.

### Realizado
- **Cursor hooks** (`.cursor/hooks.json`): `sessionStart`, `beforeShellExecution`, `afterFileEdit`, `preToolUse` — auditoria em `docs/dev-audit/`; bloqueio `.env`/credenciais; shell destrutivo.
- **Docs:** `DELIVERY_PIPELINE.md`, `CURSOR_AGENT_OPS.md`, `docs/dev-audit/README.md`.
- **CI:** `vitest critical` + job **web build** em `.github/workflows/ci.yml`; parsers/marcadores em `test:critical`.
- **Roadmap:** épicos `dev-delivery-pipeline`, `prod-run-intelligence`; exam markers/pipeline marcados done.
- **Paciente titular:** API `isSelf`/`membershipRole`; `markAsSelf` no cadastro adulto; tag **Você** no dashboard; `set-self-patient.ts`.

## [2026-08-24] - Marcadores estruturados, pipeline unificado, Ava conversacional + lastro documental

### Contexto
Consolidar extração de laudos (Hermes/Mater Dei), UI de marcadores históricos, experiência de chat da Ava (global, humanizada) e garantir que a Ava enxerga valores laboratoriais normalizados com rastreabilidade ao documento de origem.

### Realizado — dados e pipeline
- **Migration 045** `exam_result_items`: marcadores estruturados (analito, valor, unidade, ref, status, `collected_at`).
- **Migration 046**: idempotência (`uq_exam_result_items_dedup`) + `source_document_id` (lastro ao `documents`).
- **Pipeline unificado** (`exam-artifact.pipeline.ts`): PyMuPDF → parser fonte → LLM fallback interno metered → catálogo semântico.
- **MaterDeiPdfReportParser v2**: seções (sem contaminação), hemograma completo, triagem neonatal.
- **LLM marker extraction**: `exam_marker_extraction` em `llm.types`; orçamento interno R$100.
- **Backfill lastro**: 58/58 marcadores com `source_document_id` via `exams.notes` JSON.
- **Ava contexto**: `AvaPatientContextService` inclui marcadores com histórico (antes só `result_summary` textual).

### Realizado — UI
- **Marcadores do Exame**: dashboard master-detail + gráficos com faixa de referência; sub-abas com iconografia em `ExamsTab`.
- **Ava global**: `AvaGlobalDock` (FAB fixo); removida do header do perfil.
- **Chat Ava**: markdown GFM, relatório PDF, margens, avatar usuário à direita, balão de pensamento com frases rotativas, rosto maior (64px).
- **RequireCompliance**: validação 1x por sessão (elimina "refresh" do layout em cada navegação).

### Testes
- `materdei-pdf.parser.test.ts`, `llm-marker-fallback.extractor.test.ts`, `llm-marker-extraction-prompt.test.ts`
- Suite API: **62 arquivos, 219 testes** passando (`npx vitest run`).

### Docs
- `docs/EXAM_ARTIFACT_PIPELINE.md` reescrito; `AGENTS.md`, `AVA_VISION.md`, `roadmap.json`, `project-context.json`.

---

## [2026-08-21] - Ava Global (orb fixo) + Renderização Rica + Relatório PDF

### Contexto
Ava era presa ao header do profile do paciente. Decisão: presença global na conta, com "poder de fogo" para representar dados de forma humanizada.

### Realizado
- **Orb global (`AvaGlobalDock`)**: FAB fixo sobreposto ao conteúdo (canto inferior direito), montado no `AppLayout` — presente em todas as telas (dashboard, emergência, settings, paciente). `patientId` derivado da rota (`/patients/:id` ou `?patientId=`) com fallback para o 1º paciente da conta. Removido o dock do header do perfil.
- **Renderização rica**: `AvaMarkdown` (react-markdown + remark-gfm) nos balões — tabelas comparativas GFM, listas, negrito, CSS temático. System prompt da Ava instrui uso de tabelas para múltiplos exames/marcadores e estrutura com subtítulos.
- **Relatório**: modal dedicado (`AvaReportModal`) com conversa renderizada + botão Imprimir/Salvar PDF (janela formatada com disclaimers LGPD/médico).
- **Fixes pré-existentes**: `NotFoundError` assinatura em `ava-patient-context.service.ts`; tipo `AvaCritiqueResult` no fallback de crítica (`ava-orchestrator.service.ts`).
- **Roadmap**: novos itens `ava-global-dock`, `ava-rich-rendering`, `ava-report-modal` (done); `ava-accelerators` ("Pergunte à Ava" por entidade) e `ava-charts-in-chat` (gráficos inline via blocos ```chart) planejados; `ava-platform-presence` → in_progress.

### Decisão de abordagem
FAB flutuante escolhido em vez de widget no Header (64px já saturado com user/theme/language): funciona em todas as páginas sem disputar espaço, alcançável a um toque, permite animação de presença constante.

---

## [2026-08-20] - Backlog: Padrão de cores/logos em Origens + Estrutura de Marcadores Clínicos / Resultados de Exames

### Contexto
Registrados no backlog dois aprimoramentos de UX e de arquitetura de dados clínicos:
1. **Origens de Entidades com Identidade de Marca**: Evoluir o componente de Origem nas listagens (`ExamsTab`, `MedicalRecordsTab`, `AuthorizationsTab`, `VaccinesTab`) para adotar a identidade visual com logomarcas, ícones e tinting de operadora/provedor (estilo da aba Convênios/CoverageTab).
2. **Normalização de Resultados de Exames (Marcadores Médicos)**: Criação de um sub-domínio dedicado a marcadores e analitos de exames (`exam_result_items` / Marcadores Médicos) para armazenar valores mensuráveis (Glicose, Hemoglobina, TSH, PCR, etc.) com unidades, faixas de referência e tendência temporal para dashboards.

### Realizado (backlog)
- `docs/roadmap.json` atualizado com o item `int-source-tag-brand-tint` no épico de integrações e com os itens `exam-artifact-structured` e `exam-markers-dashboards` no épico de artefatos de exame.

---

## [2026-08-20] - Motor de Classificação Semântica em 3 Tiers (Embeddings Vetoriais + LLM + Catálogo Dinâmico)

### Contexto
Implementada arquitetura genérica e reutilizável de **classificação semântica** em 3 camadas (3 Tiers), desenhada para escalar não apenas para rótulos de operadoras de saúde (Amil, Unimed, etc.), mas para múltiplos cenários da plataforma: OCR de documentos, receitas médicas, analitos de laudos laboratoriais e futuras integrações.

### Decisão de arquitetura
| Tier | Mecanismo | Comportamento |
|------|-----------|---------------|
| **Tier 1** | **Embeddings Vetoriais & Catálogo** | Vetorização por N-Grams e Similaridade de Cosseno com score de confiança quantitativo em `[0.0, 1.0]`. Se `similaridade >= 0.80`, classifica instantaneamente (`method: 'vector'`). |
| **Tier 2** | **Fallback LLM** | Se a confiança vetorial não atinge o limite aceitável (< 0.80), aciona o LLM com teto e metering interno. |
| **Tier 3** | **Auto-Categorização no Catálogo Dinâmico** | O resultado do LLM é gravado automaticamente na tabela `semantic_catalog_cache` (Migration 044). Consultas futuras desse termo ou de variações similares dão hit vetorial/cache direto em 1ms sem custo de LLM. |

### Realizado
- **Migration 044 (`semantic_catalog_cache.sql`)**: Tabela para persistência do catálogo dinâmico aprendido por domínio (`domain`, `normalized_label`, `kind`, `destination`, `confidence`, `times_hit`).
- **Domain (`domain/semantic-classification/`)**:
  - `semantic-classification.types.ts`: Tipos genéricos do motor (`SemanticDomain`, `SemanticClassificationResult`, `SemanticCacheRepositoryPort`).
  - `vector-embedding.engine.ts`: Motor de vetorização L2 + Cosseno de similaridade + score de confiança.
- **Infrastructure (`infrastructure/persistence/` & `classification/`)**:
  - `semantic-catalog-cache.pg.repository.ts`: Repositório Postgres do catálogo dinâmico.
  - `vector-exam-catalog-lookup.ts`: Adapter de busca do catálogo via embeddings vetoriais.
- **Application (`application/semantic-classification/` & `llm/`)**:
  - `unified-semantic-classifier.service.ts`: Orquestrador genérico dos 3 Tiers.
  - `llm-internal-cost.factory.ts`: Injeta `VectorExamCatalogLookup` e `SemanticCatalogCachePgRepository` no classificador.
  - `llm-backed-label-classifier.ts`: Auto-salva aprendizados do LLM no catálogo dinâmico.
- **Testes & Scripts**:
  - `tests/vector-embedding.engine.test.ts` (4 testes de vetorização e similaridade de cosseno).
  - `tests/unified-semantic-classifier.test.ts` (testes do fluxo completo 3-Tier com cache dinâmico).
  - Adicionados a `npm run test:critical` (18/18 suítes, 82/82 testes 100% aprovados).
  - Script smoke: `packages/api/scripts/semantic-classification-smoke.ts`.

---

## [2026-08-19] - Amil: Descoberta e captura da API de Atendimentos Realizados (BuscarDemonstrativoUtilizacao)

### Contexto
Identificada a lacuna na integração Amil: o sync capturava guias (`PostTokens`) com tipo genérico (`CONSULTA SP/SADT`, `EXAMES`), mas não capturava a lista de atendimentos reais da tela `#/atendimentos-realizados` com a descrição do procedimento específico (ex.: `10101039 - Consulta Em Pronto Socorro`, `40324192 - Antígeno Ns1 Do Vírus Da Dengue`, `40201210 - Vídeo-Endoscopia Naso-Sinusal`).

### Descoberta e Realizado
- **Mapeamento do Endpoint Real**: A API da tela de Atendimentos Realizados utiliza o endpoint:
  `GET /beneficiario/api/Beneficiario/Beneficiario/BuscarDemonstrativoUtilizacao/{marcaOtica}/{startDate}/{endDate}`
- **Atualização do Helper `fetchAmilUtilizacao`**: Reescrito em `amil-utilizacao.helper.ts` para consultar semestres (de até 1.5 anos atrás) para cada beneficiário, extraindo todos os `atendimentos` (`procedimento`, `prestador`, `dataRealizacao`, `quantidade`).
- **Normalização e Roteamento**:
  - Adicionada limpeza de prefixos numéricos TUSS (`\d{5,10} - `) em `normalizeHealthLabel`.
  - Expandidas palavras-chave de exame em `EXAM_KEYWORDS` (`DENGUE`, `PESQUISA`, `ENDOSCOPIA`, `NASOSINUSAL`).
  - Roteamento inteligente via `LlmBackedLabelClassifier`: exames vão para `exams` (ou `medical_records` tipo `exame`), consultas e pronto-socorro para `medical_records`.
- **Validação com Dados Reais**:
  - Testado e confirmado a extração e ingestão com sucesso de **27+ atendimentos reais** para Rafael, Luis, Bruno e Jenifer no banco de dados.
- **Testes**: `npm run test:critical` executado com 100% de aprovação (16/16 suítes, 75/75 testes).

---

## [2026-08-19] - Amil: Heurística de correlação Autorização ↔ Atendimento (backlog)

### Contexto
A API da Amil (`BuscarDemonstrativoUtilizacao`) não fornece uma chave explícita que vincule os atendimentos (consultas/exames) com suas respectivas guias de autorização (`PostTokens`). O banco de dados canônico possui `authorization_id` nas tabelas `medical_records` e `exams` para esta finalidade, mas a informação não vem da fonte.

### Decisão de arquitetura
- Será necessário desenvolver uma **lógica de matching heurística** dentro do `CanonicalBatchImporterService` para correlacionar atendimentos com autorizações existentes. Isso pode ser feito baseando-se em `patient_id`, `authorization_date` próximo ao `record_date`/`exam_date`, `procedure_description` similar e `prestador`.
- Este trabalho é um item de backlog, a ser implementado em uma fase futura.

### Realizado (backlog)
- Adicionado ao `docs/roadmap.json` como item `int-amil-correlacao` no épico `integracoes-dados`.

### Docs
- `docs/roadmap.json` — item `int-amil-correlacao`.

---

## [2026-08-19] - Amil: Heurística de correlação Autorização ↔ Atendimento (backlog)

### Contexto
A API da Amil (`BuscarDemonstrativoUtilizacao`) não fornece uma chave explícita que vincule os atendimentos (consultas/exames) com suas respectivas guias de autorização (`PostTokens`). O banco de dados canônico possui `authorization_id` nas tabelas `medical_records` e `exams` para esta finalidade, mas a informação não vem da fonte.

### Decisão de arquitetura
- Será necessário desenvolver uma **lógica de matching heurística** dentro do `CanonicalBatchImporterService` para correlacionar atendimentos com autorizações existentes. Isso pode ser feito baseando-se em `patient_id`, `authorization_date` próximo ao `record_date`/`exam_date`, `procedure_description` similar e `prestador`.
- Este trabalho é um item de backlog, a ser implementado em uma fase futura.

### Realizado (backlog)
- Adicionado ao `docs/roadmap.json` como item `int-amil-correlacao` no épico `integracoes-dados`.

### Docs
- `docs/roadmap.json` — item `int-amil-correlacao`.

---

## [2026-08-19] - Backlog: catálogo de medicações (base dinâmica)

### Contexto
Usuário adicionou ao backlog a evolução da medicação em **catálogo único e dinâmico**: ao cadastrar uma medicação, buscar pelo nome/composto e auto-sugerir o nome genérico ou comercial (de preferência de forma **semântica**); cada nova medicação identificada alimenta uma base que facilita cadastros futuros de outros usuários. Value: (1) catalogar medicações, (2) bulas, (3) imagens oficiais de embalagem/medicação para identificação, (4) analítica/cruzamentos futuros.

### Decisão de arquitetura
- **Candidato ≠ automático**: novo input do cliente que não casa com o catálogo vira **CANDIDATO** a nova medicação (fila curada), não entra direto no catálogo.
- **Base dinâmica**: catálogo único reutilizável em cadastros futuros (multi-usuário); com higienização/dedup semântico ao longo do tempo (estilo Google Photos).
- **Aproveita modelo atual**: `Medication` já tem `genericName`/`brandName` (domain/medication) e vínculos com health-thread, reminders e administração de medidas.

### Realizado (backlog)
- Épico `medication-catalog` (P4, categoria `tecnico`) com 7 itens em `docs/roadmap.json`: auto-sugestão semântica, fluxo de candidato, catálogo único dinâmico, higienização do catálogo, bula, imagens oficiais e analítica/cruzamentos.

### Docs
- `docs/roadmap.json` — épico `medication-catalog` (+ 7 itens).

---

## [2026-08-19] - Fallback LLM de classificação + metering de custo interno

### Contexto
Usuário aprovou a integração real do fallback LLM (`llmFallback`) no classificador de rótulos de operadora (antes só documentado). Exigiu **monitoramento de uso** e **separação** do custo de LLM em duas categorias: (a) **desejo do usuário final** (Ava, leitura manuscrita) — ligado aos pacotes/entitlements do cliente; (b) **operacional nosso** (classificação de rótulos e jobs de otimização) — custo interno, com cascata Zen free → Go DeepSeek → Gemini e **teto de R$ 100/mês**.

### Decisão de arquitetura
| Decisão | Motivo |
|---------|--------|
| `cost_bucket` em `llm_usage_events` (`client` vs `internal`) | Separa uso do cliente do operacional sem nova tabela de eventos |
| `llm_internal_budget` (migration 043) em centavos de R$ | Orçamento mensal interno com teto default R$100 |
| `LlmBackedLabelClassifier` (application) | Envolve o engine local e aciona `LlmRouter` só p/ rótulos ambíguos (conf < 0.6) |
| `LlmInternalCostService` | Checa teto antes da chamada; registra evento + saldo; audit `local_fallback`/`budget_exhausted` |
| Custo estimado por tokens × preço por 1M do modelo | Determinístico, sem depender de fatura; preços configuráveis via env |
| Ativado na integração (sync Amil) **e** no job | `amilResultToCanonicalBatchAsync` (classifyBatch) + `--llm` no reclassify |

### Realizado
- Migration **043** `internal_llm_budget.sql`: `cost_bucket` em eventos + `llm_internal_budget`
- `domain/llm/` — `llm-internal-cost-policy.ts` (preços/teto/câmbio), `llm-internal-prompt.ts` (prompt + parse JSON)
- `infrastructure/persistence/` — `llm-internal-budget.pg.repository.ts`; `llm-usage.pg.repository.ts` (`cost_bucket` + stats)
- `application/llm/` — `llm-internal-cost.service.ts`, `llm-internal-cost.factory.ts`
- `application/classification/llm-backed-label-classifier.ts` — fallback LLM com budget + audit
- `amil-canonical.mapper.ts` — `amilResultToCanonicalBatchAsync` (lote); `portal-sync.orchestrator.ts` usa `buildClassificationClassifier`
- Job `reclassify-amil-medical-records.ts` — suporte `--llm`/`--apply --llm` + relatório de custo
- Scripts `report-internal-llm-usage.ts` (+`--top`) e `llm-internal-classify-smoke.ts`
- API `GET /llm/usage/internal` (observabilidade, ops key) em `ava.routes.ts`
- Env: `LLM_INTERNAL_CLASSIFY_LLM`, `LLM_INTERNAL_ALLOW_ZEN_FREE`, `LLM_INTERNAL_MONTHLY_BUDGET_CENTS` (R$100), `LLM_INTERNAL_USD_BRL`, `LLM_INTERNAL_OBSERVABILITY_KEY`, `LLM_INTERNAL_PRICE_OVERRIDE_JSON`
- Testes: `llm-internal-prompt`, `llm-internal-cost.service`, `llm-backed-classifier`, `amil-label-classifier` (+async); adicionados ao `test:critical`

### Docs
- `docs/LLM_USAGE.md` — seção "Custo CLIENTE vs INTERNO" (env + fluxo + observabilidade)
- `docs/OBSERVABILITY.md` — indicadores do LLM interno
- `docs/CLASSIFICATION_ENGINE.md` — fallback LLM integrado
- `AGENTS.md` — migration 043; `docs/project-context.json` — entidade `LlmInternalBudget`, rota, decisão

---

## [2026-08-19] - Classificador de rótulos Amil + roteamento consulta/exame

### Contexto
Usuário apontou que a tela "Atendimentos Realizados" da Amil exibe consultas (e, em tese, exames) que iam **sempre** para `medical_records` (Authorization), sem analisar o conteúdo. Pediu análise da lógica atual e melhoria de identificação/destino, respeitando Hexagonal e modularizando "motores" reutilizáveis em integração e jobs.

### Decisão de arquitetura
| Decisão | Motivo |
|---------|--------|
| Port `LabelClassifierEngine` no domínio | Trocar de motor (rules→fuzzy→embeddings/LLM) sem tocar consumidores |
| Engine `AmilLabelClassifier` (application) | Catálogo exato + sinônimos/siglas + keywords + fuzzy + fallback |
| Adapter `FuzzyExamCatalogLookup` (infra) | Edit-distance `@nlptools/distance` (leve); substituível por embedding |
| Fallback LLM | **Só documentado** (hook `llmFallback`/`classifyWithLlm`); integração com `llm-router` fica planejada |

### Realizado
- `domain/classification/` — `label-classification.ts` (port + tipos + normalize), `exam-catalog.ts` (catálogo canônico versionado + keywords)
- `application/classification/amil-label-classifier.ts` — engine rules+fuzzy + fallback LLM opcional
- `infrastructure/classification/fuzzy-exam-catalog-lookup.ts` — adapter edit-distance
- `amil-canonical.mapper.ts` — injeta motor e **roteia** `exame→exam`, `consulta/procedimento/outro→medical_record`
- `canonical-batch-importer.service.ts` — ramo `importAmilExam` (importa em `exams`)
- `scripts/reclassify-amil-medical-records.ts` — job de re-mapeamento (dry-run/`--apply`) reusa o motor
- Testes `amil-label-classifier.test.ts` (9 casos); registro na tabela de docs (`AGENTS.md`), `docs/CLASSIFICATION_ENGINE.md`, `docs/roadmap.json`, `docs/project-context.json`

### Docs
- `docs/CLASSIFICATION_ENGINE.md` — novo

---

## [2026-08-18] - Emergência, metering LLM Ava, pedidos de exame, higienização

### Migrations 037–042
| # | Arquivo | Tema |
|---|---------|------|
| 037 | `measurement_observations` | Observações em medidas |
| 038 | `care_reminders` | Lembretes de cuidado |
| 039 | `emergency_directory` | Guia/contatos de emergência por paciente |
| 040 | `llm_usage` | Metering de chamadas LLM Ava |
| 041 | `exam_orders` | Pedidos de exame + `exams.exam_order_id` |
| 042 | `hygiene_candidates` | Fila de candidatos a duplicata + resolução |

### Higienização (dedup — estende `DATA_HYGIENE.md`)
- Detectores de **exame**: `exam_dedup_key`, `exam_date_type_lab`, `exam_date_type`, `exam_date_result`, `exam_pedido_type`
- Detectores de **vacina**: `vaccine_catalog_slot`, `vaccine_date_catalog_dose`, `vaccine_date_name`, `vaccine_date_catalog`
- Scan após create + varredura batch (`scanPatient` exames + vacinas); blocking na inserção (score ≥ 88) em `ExamService`/`VaccineService`; listagens ocultam `hygieneCanonicalId`
- API: `GET /hygiene/candidates`, `POST /hygiene/candidates/:id/resolve`
- Scripts: `scan:hygiene`, `apply-hygiene-resolutions.ts`, `fix-rafael-covid-exams.mjs`, `fix-rafael-dengue-vaccines.mjs`
- Casos reais corrigidos: 5 COVID em 11/04/2021 (Rafael); 3 vacinas dengue 1ª dose (Rafael)

### Pedidos de exame (041) + Hermes
- `exam_orders` + `exams.exam_order_id`; domínio/API `exam-order`; Hermes sync + laudo PDF vinculado a pedido
- Web: `ExamsTab` agrupada por pedido

### Emergência (039) + metering LLM (040)
- `emergency-directory` + contactos de emergência; `GET /emergency/directory`
- `llm_usage_events` + `llm-usage.pg.repository`; metering Ava

### Docs novos
- `docs/EMERGENCY.md`, `docs/LLM_USAGE.md`, `docs/EXAM_ARTIFACT_PIPELINE.md`, `docs/EXAM_OCR.md`, `docs/OBSERVABILITY.md`

### Visão Ava
- `docs/AVA_VISION.md` — companheira global, sessões, pins (moonshot)

---

## [2026-08-18] - Visão Ava, arquitetura PG/Neo4j, observabilidade e roadmap

### Decisão de arquitetura

- **Postgres:** entidades, atributos, relacionamentos de negócio (FK, `clinical_entity_links`), conversas Ava (planejado), telemetria.
- **Neo4j:** apenas **associações** entre entidades PG (caminhos, pins de sessão, candidatos higienização, analytics opt-in) — não duplicar prontuário.

### Produto Ava (moonshot documentado)

- Companheira global na **conta**; sessões persistidas; painel de contexto (pins); hooks troca paciente; higienização estilo Google Photos.
- ML personalizado cedo; agora: eventos + grafo + regras; NLP agregado com opt-in separado do Zen.

### Documentação nova

- `docs/AVA_VISION.md` — visão, sessões, LGPD, fases moonshot
- `docs/ARCHITECTURE_DATA_LAYERS.md` — split PG vs Neo4j
- `docs/DATA_HYGIENE.md` — dedup on-insert, weekly, login
- `docs/OBSERVABILITY.md` — monitoramento proativo, `product_events` planejado

### Roadmap (`roadmap.json`)

- `ava-companion-platform` (P1)
- `ava-context-transparency` (P2)
- `ava-graph-associations` (P2)
- `data-hygiene-dedup` (P2)
- `observability-platform` (P1)
- `product-analytics-optin` (P3)

---

## [2026-08-14] - Ava: política de segurança (sem diagnóstico + hard stops)

### Decisão de produto

- IA **nunca afirma diagnóstico** — só temas para debate com o pediatra.
- **Hard stops** determinísticos (regras antes da LLM): ex. alergia registrada × medicação cogitada → `do_not_apply`, prioridade `critical`, linguagem firme (não aplicar; pediatra / urgência do plano / SAMU 192).
- Roadmap horizonte: catálogo emergência, notificação ativa, dispositivos — com gate ANVISA.

### Docs / código

- `docs/AGENTS_APOIO.md` — política de linguagem
- `docs/legal/ANVISA_SAMD_POSITION.md` — hard stops vs triagem autônoma
- `family-support-rules` — alergia × med atualizado
- `roadmap.json` — `agent-emergency-knowledge`, `agent-active-emergency`, `agent-devices-monitoring`

---

## [2026-08-14] - Medidas Fase 3: WHO, glicemia import, notificações web

### Contexto

Fechar épico `plat-medidas` antes do épico **Agentes RAG**.

### Entregas

- **Curvas WHO:** `who-growth-reference.ts` (P3/P50/P97 0–60 meses); `GET /measurements/who-growth`; UI `WhoGrowthChartGrid` na aba Antropometria; percentil em `context.whoPercentile` ao registrar peso/altura/PC.
- **Import glicemia:** parser de `exams.resultSummary` → `POST /measurements/import-glucose`; botão na aba Gráficos.
- **Notificações web:** `useCareReminderNotifications` + opt-in no banner; polling 60s com `Notification` API.
- **Roadmap:** `plat-medidas` → done; doc `docs/MEASUREMENTS.md`.

---

## [2026-08-13] - Sprint go-live tech: agenda, calendários, settings, billing, legal UX

### Contexto

Consolidação de P2–P3 antes do épico **Agentes RAG**: estrutura de Configurações, agenda com sync Google/Outlook, billing Stripe completo, legal/compliance end-to-end no código, roadmap com badges de revisão humana.

### Agenda e calendários externos

- **Modelo:** `scheduled_events` (029) + import ICS (034) + `calendar_connections` (035, 036).
- **API:** CRUD agenda, `POST /scheduled-events/import/ics`, OAuth Google (`/calendar/google/*`) e Microsoft (`/calendar/microsoft/*`) — pull `calendarView` −30d/+180d + push de eventos locais.
- **Web:** aba **Agenda** (`AgendaTab`) — calendário estilo Google (marcas coloridas, + no dia, painel lateral); `GoogleCalendarConnectCard` + `OutlookCalendarConnectCard`.
- **Azure Outlook local:** redirect Web só aceita `http://localhost:3010/...` (não `127.0.0.1`); ver `MICROSOFT_CALENDAR_REDIRECT_URI` e `docs/SUPABASE.md`.
- **Google:** `GOOGLE_CALENDAR_*`; redirect API `http://127.0.0.1:3010/calendar/google/oauth/callback`; test users no GCP em modo Testing.

### Configurações (settings-area-structure)

- Rotas: `/settings/general`, `/account`, `/plan`, `/legal` via `SettingsLayout`.
- Removido monólito `AccountPlanSection` e página `/settings` antiga.
- Doc: `docs/ACCOUNT_AND_PLAN.md`.

### Billing SaaS (Stripe)

- Migrations 030/033; checkout pacotes + assinatura família; webhook → créditos/entitlements; Customer Portal; `GET /billing/me`; export Contabilizei (`GET /billing/export/contabilizei` + script CLI).
- UI: `BillingSettingsCard` em `/settings/plan`.
- Doc: `docs/BILLING.md`, `docs/infra/GCP_BILLING_ALERTS.md`.

### Legal / LGPD (tech completa)

- Migrations 031–032; módulo hexagonal `legal-compliance`; 4 docs v1.0 + cookies + consentimento menor.
- `COMPLIANCE_GATE_ENABLED`, `RequireCompliance`, `/compliance/accept` (modal + Vite SPA bypass).
- `LegalContentPort` adapters: `fs` | `http` | `gcs` (`LEGAL_CONTENT_ADAPTER`).
- Exclusão conta `DELETE /auth/account`; canal DPO; `GO_LIVE_TECHNICAL_READINESS.md`, `HUMAN_REVIEW_QUEUE.md`.
- **Pendente humano:** parecer advogado, NFS-e live, Stripe live, ANVISA antes de agentes clínicos.

### Export clínico e sequência

- Share link 48h (`027_clinical_export_share`); assets autorização Unimed (`028`); kind `acompanhamento` (`026`).
- Export resumido/completo + share; polish sequência clínica e trilhas no contexto.

### Sync / Connect (hardening)

- Unimed session probe + fail-fast SSO; Amil JWT-first; mutex browser; sync-all serial; jobs timeout + browser registry.
- Amil utilização → consultas; dependentes; Unimed carências PDF + guia PDF + foto médico; Bradesco agentic.

### OCR / documentos

- `OcrStatsPanel`, política OCR; métricas `GET /documents/ocr-stats`.

### Roadmap e revisões

- `roadmap.json` schema v2: `reviewBadges`, épico `human-review-gates`, épicos marcados done até agenda-sync-bidirectional.
- `FEATURE_REVIEW_FRAMEWORK.md`, skills `.cursor/skills/aiyracare-*`, PR template, workflow tier3 CI.
- **Próximo épico código:** `agentes` (P3 RAG) — gate `legal-anvisa-review-rag` + médico.

### Migrations novas (026–036)

| # | Arquivo | Tema |
|---|---------|------|
| 026 | `health_thread_kind_acompanhamento` | kind acompanhamento |
| 027 | `clinical_export_share` | links públicos export |
| 028 | `authorization_assets` | PDF guia, foto médico |
| 029 | `scheduled_events` | agenda programada |
| 030 | `billing` | Stripe, créditos, purchases |
| 031 | `legal_compliance` | docs legais + aceite |
| 032 | `account_profiles` | perfil estendido |
| 033 | `subscription_period` | período assinatura |
| 034 | `scheduled_events_external` | UID ICS / external_id |
| 035 | `calendar_connections` | OAuth Google |
| 036 | `calendar_microsoft_provider` | provider microsoft |

Scripts: `apply-migration-026.mjs` … `036.mjs`, `seed-legal-documents.mjs`, `export-billing-contabilizei.mjs`.

---

## [2026-08-13] - Legal, LGPD e conformidade (estrutura inicial)

### Contexto

Preparação para oferta do AiyraCare ao **público externo** (B2C): documentos legais versionados, aceite vinculado à conta, módulo hexagonal alinhado ao Connect.

### Documentação

- [`docs/LEGAL_COMPLIANCE.md`](./LEGAL_COMPLIANCE.md) — arquitetura, enquadramento regulatório, API, checklist go-live.
- [`docs/legal/`](./legal/) — Termos v1.0, Privacidade v1.0, CHANGELOG (modelos — revisão jurídica pendente).

### Implementado

- Migration `031_legal_compliance.sql` — `legal_documents`, `legal_document_acceptances` (SHA-256, `is_current`).
- Módulo hexagonal `legal-compliance`: `LegalContentPort`, `ComplianceGatePort`, PG repos, `FsLegalContentAdapter`.
- API: `GET /compliance/documents`, `GET /compliance/documents/:kind/current` (público); `GET /compliance/status`, `POST /compliance/accept` (auth).
- Scripts: `apply-migration-031.mjs`, `seed-legal-documents.mjs`.
- Web: rotas públicas `/termos`, `/privacidade`.
- Roadmap: epic `legal-lgpd-compliance` + categoria `regulacao`.

### Backlog (próximo)

- Aceite obrigatório no signup + gate de rotas (`COMPLIANCE_GATE_ENABLED`).
- Exclusão de conta, cookie policy, canal DPO, revisão advogado, NFS-e, incident response, revisão ANVISA antes de RAG clínico.

### Produto / negócio (conversa 2026-08-13)

- Stripe: tarifa por transação (+0,7% Billing em assinaturas); não rentabilidade com saldo parado.
- Gateways BR: subadquirente + conta PJ Contabilizei para payout; credenciamento direto só com volume.
- Regularidade go-live: LGPD (dados sensíveis + menores), CDC, fiscal; ANVISA SaMD em geral não para organizador familiar sem diagnóstico.

## [2026-08-13] - DocuSign, conta/plano e revisões paralelas

- **DocuSign:** B2C termos/privacidade → click-wrap + PG (`LEGAL_COMPLIANCE.md` §11); DocuSign só B2B.
- `docs/ACCOUNT_AND_PLAN.md` + `AccountPlanSection` (conta, compliance, plano família).
- `docs/FEATURE_REVIEW_FRAMEWORK.md` + skills `.cursor/skills/aiyracare-review-*` (tier 0–3).
- Roadmap: `account-plan-management`, `feature-review-framework`.

### Aceite obrigatório + gate (2026-08-13 tarde)

- Web: checkbox no signup, `/compliance/accept`, `RequireCompliance`, links em Configurações.
- API: `COMPLIANCE_GATE_ENABLED=1` bloqueia rotas com `403 COMPLIANCE_PENDING` (exceções `/compliance/status|accept`).

### Exclusão de conta (LGPD art. 18)

- `DELETE /auth/account` body `{ "confirmPhrase": "EXCLUIR" }`
- Remove pacientes `owner_account_id`, arquivos GCS, memberships, créditos, `app_accounts` (cascade billing/legal)
- Cancela Stripe subscription se configurado; remove usuário Supabase Auth

## [2026-08-06] - Linha do tempo + projeção Neo4j (Eixos 3.4 e 4)

- `GET /patients/:id/timeline` com filtros (`kinds`, `sources`, `from`/`to`, `timelineMonths`, `limit`/`offset`); `PatientContextService.buildTimeline` sem quebrar `/context`.
- Aba **Linha do tempo** no perfil (`TimelineTab`): filtros por tipo/período, toggle linha horizontal vs lista.
- `HealthThreadGraphProjector` + `NEO4J_SYNC_ENABLED` (default off): upsert `Patient`/`HealthThread`/`Hypothesis`, `SUPPORTS`, `RULED_OUT`, `CONFIRMED_AS` após persist de trilhas.

## [2026-07-22] - Terceira Sessão: CRUDs Completos + Setup Frontend

### Contexto
Finalizada toda a infraestrutura cloud, implementamos todos os CRUDs da API
seguindo Arquitetura Hexagonal (Ports & Adapters) com TypeScript + Fastify.
Iniciamos o planejamento do frontend web com Design System.

### Decisões Arquiteturais da API
| Decisão | Opção | Motivo |
|---------|-------|--------|
| Arquitetura | Hexagonal (Ports & Adapters) | Separação clara entre domínio, aplicação e infraestrutura |
| Validação | Zod | Type-safe, composável, integrado ao ecossistema |
| Entity Pattern | Classes imutáveis com factories (create/restore) | Consistência, proteção do domínio |
| Repository | Interface no domínio, implementação no infra | Inversão de dependência, testável |
| DI | Manual (construtores no routes.ts) | Simples, sem overhead de framework |

### Realizado

**Infraestrutura Cloud (completa)**
- [x] Supabase: PostgreSQL 17 cloud (lyljosprzmtapkocmxxa) + REST API + anon/service_role keys
- [x] AuraDB Neo4J: instância free (7cbe171c.databases.neo4j.io) conectada e testada
- [x] GCP: projeto openhealth-503119, billing ativo (conta 01D669-5010DA-C81EE4)
- [x] Cloud Storage API ativada + bucket openhealth-documents-503119 (us-central1, STANDARD)
- [x] CORS configurado, lifecycle policy (delete 365 dias)
- [x] Service account openhealth-account com papel Storage Admin
- [x] GitHub Secrets: GCP_BUCKET e todas as credenciais atualizadas
- [x] scripts/setup-env.ps1 atualizado com todos os endpoints cloud

**API - CRUDs Hexagonais (9 entidades)**
- [x] Patient (pacientes) — domain + application + PG repo + HTTP
- [x] GrowthRecord (peso/altura) — completo
- [x] Vaccine (vacinas) — completo
- [x] Medication (medicações) — completo
- [x] Allergy (alergias) — completo
- [x] Exam (exames) — completo
- [x] Document (documentos) — completo
- [x] MedicalRecord (consultas) — completo
- [x] Diagnosis (diagnósticos) — completo

**Estrutura final da API:**
```
packages/api/src/
├── index.ts                         ← entrypoint + 9 rotas registradas
├── db/
│   ├── postgres.ts                  ← Pool PG
│   └── neo4j.ts                     ← Driver Neo4J
├── domain/                          ← CORE (0 dependências externas)
│   ├── errors.ts
│   └── {patient, growth-record, vaccine, medication,
│        allergy, exam, document, medical-record, diagnosis}/
│       ├── {entity}.entity.ts       ← entidade (create/restore)
│       └── {entity}.repository.ts   ← porta (interface)
├── application/                     ← CASOS DE USO
│   └── {entity}/
│       └── {entity}.service.ts      ← orquestra regras
└── infrastructure/                  ← ADAPTADORES
    ├── persistence/
    │   └── {entity}.pg.repository.ts ← implementa porta (PG)
    └── http/{entity}/
        ├── {entity}.schema.ts       ← validação Zod
        ├── {entity}.controller.ts   ← handlers Fastify
        └── {entity}.routes.ts       ← plugin Fastify
```

### Próximos Passos
- [ ] Gráficos de crescimento (Recharts)
- [ ] Página de configurações
- [ ] Agentes IA integrados no frontend
- [ ] App mobile (React Native + Expo)

---

## [2026-07-22] - Quarta Sessão: Frontend Web

### Contexto
Iniciamos o frontend web com React + Ant Design + i18n + tema customizável.
Estrutura componentizada, responsiva, com suporte a múltiplos idiomas e paletas de cores.

### Decisões
| Decisão | Opção | Motivo |
|---------|-------|--------|
| UI Library | Ant Design 5 | Componentes enterprise maduros, tema via ConfigProvider |
| i18n | react-i18next | Padrão da indústria, detector automático de idioma |
| Tema | Context + ConfigProvider | Paletas indigo/teal/rose + dark mode |
| HTTP | fetch nativo + service layer | Sem dependência extra, tipado com TypeScript |
| Roteamento | react-router-dom | Padrão, lazy loading futuro |

### Realizado
- [x] Ant Design + react-router-dom + i18next instalados
- [x] ThemeProvider com 3 paletas (indigo, teal, rose) + dark mode
- [x] i18n pt-BR / EN com detector automático e fallback
- [x] Layout: sidebar colapsável + header com theme/language switcher
- [x] Dashboard: cards das crianças com idade, sexo, peso, altura
- [x] Perfil paciente: avatar, dados, 8 abas (crescimento, vacinas, medicações, alergias, exames, consultas, diagnósticos, documentos)
- [x] Formulários CRUD via modal em cada aba
- [x] API service layer tipado para todas as 9 entidades
- [x] Hook genérico `usePatientEntity` para listagem

### Estrutura Final do Frontend
```
packages/web/src/
├── main.tsx, App.tsx
├── lib/           api.ts + api.types.ts
├── hooks/         use-patient-entity.ts
├── theme/         colors.ts + ThemeProvider.tsx
├── i18n/          locales/pt-BR.json + en.json
├── components/
│   ├── ui/        PageHeader, EntityFormModal, LanguageSwitcher, ThemeSwitcher
│   └── layout/    AppLayout (Sider + Header + Content)
├── pages/
│   ├── dashboard.tsx
│   └── patient/
│       ├── detail.tsx
│       └── tabs/  8 entidades (Growth, Vaccines, Medications, etc.)
└── styles/        globals.css
```

---

## [2026-07-22] - Quinta Sessão: Open Design Integration

### Contexto
Integração do design system gerenciado pelo Open Design com o frontend
Ant Design. O Open Design mantém as paletas de cores, tokens e descrições
visuais, enquanto o frontend consome esses tokens via bridge.

### Realizado
- [x] Design system "aiyra-care" atualizado no Open Design com 3 paletas
- [x] DESIGN.md com descrição completa de componentes e estilos
- [x] brand.json com paletas, tipografia, layout e voice & tone
- [x] tokens.palettes.json (indigo #4F46E5, teal #0D9488, rose #E11D48)
- [x] Frontend bridge (open-design-bridge.ts) que lê tokens do Open Design
- [x] ThemeProvider atualizado para usar tokens do Open Design + Ant Design
- [x] Script sync-opendesign.ps1 para sincronização automática
- [x] Documentação no PROJETO.md

### Fluxo
```
Open Design (tokens) → sync-opendesign.ps1 → ThemeProvider → Ant Design ConfigProvider → UI
```

---

## [2026-07-21] - Segunda Sessão: Setup Infraestrutura

### Realizado
- [x] .env gerado a partir de variáveis de ambiente da máquina
- [x] PostgreSQL local: database aiyracare + schema relacional aplicado
- [x] Neo4J local (porta 7687) + schema de grafos aplicado
- [x] API Fastify: rotas /health e /health/db (PG ok, Neo4J ok)
- [x] GitHub Secrets: GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE, NEO4J_*
- [x] scripts/setup-env.ps1 com suporte local e cloud
- [x] Correção: @neo4j/graph removido, neo4j-driver sem auth quando vazio

### Pendências da Sessão (resolvidas)
- [x] Supabase: novo projeto criado (lyljosprzmtapkocmxxa)
- [x] GCP: projeto openhealth-503119 + service account + bucket
- [x] AuraDB: instância free 7cbe171c.databases.neo4j.io

---

## [2026-07-21] - Fundação do Projeto

### Contexto
Criação do AiyraCare, sistema para centralizar histórico médico infantil.

### Crianças Cadastradas
- **Luís Drummond Freitas Reis** - Nasc: 23/01/2020 - 20kg
- **Bruno Drummond Freitas Reis** - Nasc: 26/10/2022 - 14kg

### Decisões Arquiteturais Iniciais
| Decisão | Opção | Motivo |
|---------|-------|--------|
| Repositório | aiyra-care (GitHub) | Novo repositório dedicado |
| Banco Relacional | PostgreSQL (Supabase) | Free Tier gerenciado |
| Banco de Grafos | Neo4J AuraDB Free | Free Tier gerenciado |
| Mobile | React Native + Expo | Multiplataforma |
| Web | React + Vite | Performance e simplicidade |
| Backend | Node.js + TypeScript | Tipagem forte, ecossistema rico |
| Agentes | Python (FastAPI) | Bibliotecas de IA/ML maduras |

### Estrutura Inicial do Projeto
```
aiyra-care/
├── .github/workflows/   # CI/CD
├── docs/                 # Documentação viva e histórico
├── packages/
│   ├── web/              # React (Vite)
│   ├── mobile/           # React Native (Expo)
│   ├── api/              # Node.js/TypeScript
│   └── agents/
│       ├── pediatria/    # Agente de Pediatria
│       ├── integracao/   # PDF/OCR/Prontuários
│       └── farmaceutico/ # Medicações e Interações
├── database/
│   ├── relational/       # Schemas PostgreSQL
│   └── graph/            # Schemas Neo4J
├── .env.example
├── package.json
├── tsconfig.base.json
└── README.md
```

### Realizado na Fundação
- [x] Repositório GitHub criado (RafaDru/aiyra-care) e push realizado
- [x] Estrutura monorepo montada (packages/web, mobile, api, agents)
- [x] Schemas PostgreSQL (8 tabelas)
- [x] Modelo Neo4J (nós e relacionamentos)
- [x] API base Fastify + conexões PG e Neo4J
- [x] Agent stubs (FastAPI)
- [x] CI/CD básico (GitHub Actions)
- [x] Docs: HISTORICO.md + PROJETO.md

---

## [2026-07-23] - Sexta Sessão: Melhorias + OCR

### Corrigido
- [x] CORS: `@fastify/cors` adicionado à API
- [x] EntityFormModal: catch vazio agora mostra erro real
- [x] `type: 'date'` removido de todos Form.Items (Ant Design v5 retorna dayjs, não Date)
- [x] `App.useApp()` sem provider — adicionado `<AntAppProvider>` no main.tsx
- [x] IMC calculado automaticamente no backend ao criar GrowthRecord
- [x] Estado vazio na Dashboard melhorado (link "Nova Criança")
- [x] Abas do paciente: `destroyInactiveTabPane` + `styles.body`
- [x] CORS methods: adicionado DELETE, PUT, PATCH, OPTIONS
- [x] api.ts: não envia `Content-Type: application/json` em DELETE (sem body)
- [x] Delete no Popconfirm: adicionado try/catch com mensagem de erro

### Implementado - OCR (Fase 1)
- [x] Domain interfaces: `FileStorage` e `OcrProvider` (portas)
- [x] `GcsFileStorage`: upload/download para GCS bucket
- [x] `GoogleVisionOcrProvider`: OCR via Google Cloud Vision API
- [x] `DocumentService.uploadAndCreate()`: upload + OCR + persistência
- [x] Rota `POST /documents/upload` (multipart, @fastify/multipart)
- [x] Frontend: input file real (Upload.Dragger) no DocumentsTab
- [x] i18n: chaves documentType.* e dropHint

### OCR Pipeline
```
DocumentService (application)
    │
    ▼
CompositeOcrProvider (infrastructure)
    │
    ├── PythonOcrAdapter (pytesseract local) ← primário
    │       └── python-ocr.py + Tesseract 5 + tessdata/por
    │
    └── GoogleVisionOcrProvider (cloud) ← fallback
            └── @google-cloud/vision + Vision API
```
- [x] PythonOcrAdapter: pytesseract + Pillow, fallback PATH automático
- [x] CompositeOcrProvider: tenta Python, fallback Google Vision
- [x] Tesseract 5 + tessdata por (português) instalados
- [x] Up.ps1 silencioso (*>$null) registrado no AGENTS.md

### Implementado - Scraper Agentic (Portais de Saúde)
```
domain/scraper/
├── portal-credentials.ts   ← tipos de credenciais
├── scraper-types.ts         ← ScrapedVaccine/Exam/Prescription
└── health-portal-scraper.ts ← HealthPortalScraper (porta)

application/scraper/
└── agentic-scraper.service.ts ← orquestrador

infrastructure/
├── llm/
│   └── groq-llm.adapter.ts       ← Llama 3.3 70B via Groq
├── scraper/
│   ├── browser-manager.ts         ← Playwright chromium headless
│   ├── agents/
│   │   ├── auth.agent.ts          ← login + diagnóstico de falhas
│   │   ├── nav.agent.ts           ← navegação por seções
│   │   └── extract.agent.ts       ← extração via LLM
│   └── conectesus.portal.ts       ← adapter ConecteSUS
```
- [x] Playwright + Groq SDK instalados
- [x] AuthAgent: login com LLM, diagnóstico de CAPTCHA/2FA/layout
- [x] NavAgent: navega inteligente por seções do portal
- [x] ExtractAgent: extrai vacinas, exames, receitas via LLM
- [x] ConecteSUSPortalAdapter completo

---

## [2026-07-24] - Sétima Sessão: Scraper ConecteSUS + Refinamentos

### Contexto
Finalização do scraper ConecteSUS via FHIR, correções no fluxo de login,
refatoração do modal de importação e adição de campos de documento pessoal
e relacionamentos familiares.

### Corrigido
- [x] Formulário de importação: removidos campos password/birthDate (login é feito manualmente no gov.br via navegador)
- [x] Erro FHIR Composition 404: parsing de referência corrigido (regex `Composition/id` em vez de `split('/composition/')`)
- [x] Botão "Editar" no perfil do paciente: estava sem `onClick`
- [x] `calcAge`: adicionada guarda para birthDate nulo/undefined
- [x] PATCH patient: undefined fields não sobrescrevem dados existentes (filtro `Object.entries` no service)
- [x] Dashboard atualiza lista após importação do ConecteSUS

### Implementado - Documentos Pessoais
- [x] Coluna `cpf` (VARCHAR(11) UNIQUE) na tabela patients
- [x] Coluna `cns` (VARCHAR(15)) na tabela patients
- [x] Extração automática de CPF e CNS do FHIR Patient (identifier array)
- [x] Match por CPF na importação (prioritário ao nome)
- [x] População automática de CPF/CNS ao criar ou vincular paciente

### Implementado - Relação Parental
- [x] Coluna `parent_ids UUID[]` na tabela patients (relação pai/filho)
- [x] Select múltiplo de pais/responsáveis no modal de edição
- [x] Exibição de pais e filhos na aba "Dados Básicos"
- [x] Tags clicáveis que navegam ao perfil do familiar

### Implementado - Categorias por Idade
- [x] Categoria computada no backend (`ageCategory`: children/adolescents/adults)
- [x] Dashboard agrupa pacientes em 3 seções com cabeçalho e contador
- [x] Cada card exibe a categoria como tag colorida
- [x] Ordem de exibição: Adultos → Adolescentes → Crianças

### Implementado - Integrações
- [x] Página `/integrations` com cards para cada integração
- [x] Card ConecteSUS disponível, demais marcados "Em breve"
- [x] Menu "Integrações" na sidebar (`ApiOutlined`)
- [x] Botão de importação removido do Dashboard

### Implementado - Sessões
- [x] Página `/session` com timeline do histórico de desenvolvimento
- [x] API `GET /sessions` que lê e parseia o `HISTORICO.md`
- [x] Menu "Sessões" na sidebar

### Estrutura Final da API
```
packages/api/src/
├── index.ts                         ← entrypoint + 11 rotas registradas
├── db/
│   ├── postgres.ts                  ← Pool PG
│   └── neo4j.ts                     ← Driver Neo4J
├── domain/                          ← CORE (0 dependências externas)
│   ├── errors.ts
│   ├── document/
│   │   ├── file-storage.ts          ← porta FileStorage
│   │   └── ocr-provider.ts          ← porta OcrProvider
│   ├── scraper/
│   │   ├── portal-credentials.ts    ← tipos de credenciais
│   │   ├── scraper-types.ts         ← ScrapedVaccine/Exam/Prescription
│   │   └── health-portal-scraper.ts ← interface HealthPortalScraper
│   └── {patient, growth-record, ...}/
│       ├── {entity}.entity.ts       ← entidade (create/restore)
│       └── {entity}.repository.ts   ← porta (interface)
├── application/                     ← CASOS DE USO
│   ├── scraper/
│   │   └── agentic-scraper.service.ts
│   ├── document/
│   │   └── document.service.ts      ← upload + OCR
│   └── {entity}/
│       └── {entity}.service.ts      ← orquestra regras
└── infrastructure/                  ← ADAPTADORES
    ├── persistence/
    │   └── {entity}.pg.repository.ts
    ├── conectesus/
    │   ├── fhir-types.ts            ← tipos FHIR
    │   └── conectesus-gateway.ts    ← gateway REST FHIR
    ├── llm/
    │   └── groq-llm.adapter.ts      ← Groq + Llama 3.3 70B
    ├── ocr/
    │   ├── composite-ocr.provider.ts
    │   ├── google-vision.ocr.ts
    │   └── python-ocr.adapter.ts
    ├── scraper/
    │   ├── browser-manager.ts
    │   ├── agents/
    │   │   ├── auth.agent.ts
    │   │   ├── nav.agent.ts
    │   │   └── extract.agent.ts
    │   └── conectesus.portal.ts
    ├── storage/
    │   └── gcs.storage.ts
    └── http/{entity}/
        ├── {entity}.schema.ts
        ├── {entity}.controller.ts
        └── {entity}.routes.ts
```

### Estrutura Final do Frontend
```
packages/web/src/
├── main.tsx, App.tsx
├── lib/           api.ts + api.types.ts
├── hooks/         use-patient-entity.ts
├── theme/         colors.ts + ThemeProvider.tsx
├── i18n/          locales/pt-BR.json + en.json
├── components/
│   ├── ui/        PageHeader, EntityFormModal, LanguageSwitcher, ThemeSwitcher
│   ├── layout/    AppLayout (Sider + Header + Content)
│   └── scraper/   ImportConecteSUSModal.tsx
├── pages/
│   ├── dashboard.tsx              ← cards agrupados por idade
│   ├── integrations.tsx           ← cards de integrações
│   ├── session.tsx                ← timeline do histórico
│   └── patient/
│       ├── detail.tsx             ← perfil + 9 abas (Dados Básicos + 8 médicas)
│       └── tabs/  Growth, Vaccines, Medications, etc.
└── styles/        globals.css
```

### Roteamento Final
```
/                        → Dashboard (cards agrupados por idade)
/patients/:id            → Detalhe do paciente (9 abas)
/integrations            → Página de integrações
/session                 → Histórico de sessões de desenvolvimento
```

---

## [2026-07-27] - Oitava Sessão: Unimed BH Sync + Source Tagging + Authorizations

### Contexto
Substituímos a abordagem de scraping agent-based (LLM genérico) por scrapers específicos para Unimed BH, com vínculo persistente por paciente, sync assíncrono com progresso, source tagging e entidade de autorizações.

### Decisões Arquiteturais
| Decisão | Opção | Motivo |
|---------|-------|--------|
| Vínculo | IntegrationLink (tabela própria) | Persiste credenciais + portal, reutilizável para Amil/Bradesco |
| Criptografia | AES-256-GCM (crypto-helper.ts) | Senhas armazenadas com segurança, chave via CRYPTO_KEY |
| Sync | Assíncrono com polling (jobId) | Scraper leva >30s, não pode travar HTTP |
| Progresso | In-memory Map com auto-cleanup (5min) | Simples, sem dependência externa |
| Source tag | Coluna `source` em records + componente SourceTag | Rastreabilidade da origem dos dados |
| Dedup | Composite key antes do INSERT | Evita duplicatas em resyncs |
| Lock | Set<string> no controller | Impede execução concorrente por paciente+portal |

### Realizado

**Migrações SQL**
- [x] `003_source_column.sql`: source VARCHAR(50) NOT NULL DEFAULT 'manual' em exams, vaccines, medical_records; tabela integration_links (id, patient_id, portal, credential_id, encrypted_password, created_at, updated_at)
- [x] `004_authorizations.sql`: tabela authorizations com id, patient_id, procedure_code, procedure_description, doctor_name, doctor_council, clinic_name, authorization_date, validity_date, status ENUM, guide_number, quantity, notes, source, created_at

**Infrastructure**
- [x] `crypto-helper.ts`: encrypt/decrypt com AES-256-GCM, generateKey, algoritmo com IV aleatório + auth tag
- [x] `sync-progress-store.ts`: ProgressStore class — createJob, updateProgress, getProgress, removeJob com auto-cleanup via setTimeout
- [x] `unimedbh-login.helper.ts`: shared login flow — navega para `acesso.unimedbh.com.br`, preenche #username/#password, clica "Entrar"
- [x] `unimedbh-extrato.scraper.ts`: navega para Extrato de Utilização, extrai linhas da tabela (data, procedimento, prestador, valor), faz fallback para label "Data de Atendimento: <data>"
- [x] `unimedbh-autorizacoes.scraper.ts`: navega para Autorizações de Exames, extrai cards (procedimento, médico, clínica, datas, status, guia, quantidade)
- [x] `unimedbh-sync.scraper.ts`: scraper combinado — login uma vez, navega extrato → autorizações na mesma sessão, retorna ScrapedUnimedData

**Domain**
- [x] `authorization.entity.ts`: Authorization class com create/restore, toJSON com snake_case
- [x] `authorization.repository.ts`: interface (findById, findAll, save, update, delete)

**Persistence**
- [x] `authorization.pg.repository.ts`: implementação PG com mapeamento camelCase ↔ snake_case

**HTTP**
- [x] `integration-link.controller.ts`: CRUD + sync endpoint (com lock, decrypt, dedup, progress) + sync-all + sync-progress polling
- [x] `integration-link.schema.ts`: Zod schemas (createIntegrationLinkSchema, syncProgressParamsSchema)
- [x] `integration-link.routes.ts`: plugin Fastify com 7 rotas
- [x] `authorization/`: schemas, controller, routes com CRUD completo

**Frontend**
- [x] `SourceTag.tsx`: componente com cores por source (manual=blue, conectesus=green, unimed=volcano, amil=purple, bradesco_saude=orange)
- [x] `SyncProgressModal.tsx`: modal com Steps (navigate → login → fetch-extrato → fetch-autorizacoes → importing → done), polling automático a cada 1s, botão de fechar manual, tela de resultado
- [x] VaccinesTab, ExamsTab, MedicalRecordsTab: coluna "Origem" com SourceTag
- [x] AuthorizationsTab: tabela com procedimento, médico, clínica, datas, status (Tag colorida: authorized=blue, used=green, expired=red), validade, guia, origem; form-modal CRUD
- [x] Patient detail: adicionada aba "Autorizações" (10ª aba)
- [x] Integrations page: card Unimed BH com botão "Vincular" (modal com campos: email, password, dependente) e "Sincronizar" + "Remover"
- [x] `api.ts`: métodos authorizations.list/create, sync, syncProgress

**Tests**
- [x] Vitest configurado (vitest.config.ts + tsconfig.json paths)
- [x] `crypto-helper.test.ts`: 4 testes (encrypt/decrypt, reproduzibilidade, formato inválido, CRYPTO_KEY ausente)
- [x] `sync-progress-store.test.ts`: 5 testes (create/get, update progress, update com resultado, job inexistente, remove)

### Testes
```powershell
npx vitest run --config vitest.config.ts
# Results: 9 passed, 0 failed
```

### Status
```powershell
# Sync endpoint funcional (com lock + dedup + progress):
POST http://localhost:3000/integration-links/:id/sync
GET  http://localhost:3000/integration-links/sync-progress/:jobId

# Testado: login Unimed BH, navegação extrato e autorizações
# SyncProgressModal: steps atualizam em tempo real
```

### Non-functional
- Sync lock: retorna 409 se sync já estiver em execução para o mesmo paciente+portal
- Passwords armazenados criptografados (AES-256-GCM), descriptografados apenas no momento do sync
- Auto-cleanup de jobs de progresso após 5 minutos
- Dedup na importação: exams por examType+examDate, authorizations por procedureCode+guideNumber, records por recordDate+doctorName

---

## [2026-07-27] - Nona Sessão: Scraper Improvements + Rich Authorization Detail

### Contexto
Melhoramos a extração de datas do scraper de autorizações (fallback para linhas de data sem label), consolidamos testes, exploramos a página de detalhe via Chrome DevTools para extrair dados muito mais ricos (17 procedimentos, médico com foto, endereço, etc.), e organizamos a documentação.

### Realizado

**Scraper Date Fix**
- [x] `unimedbh-autorizacoes.scraper.ts`: quando label "Data de Autorização"/"Data de Validade" não é encontrada, agora percorre parágrafos em busca de linhas contendo data no formato DD/MM/YYYY; primeira data → authorizationDate, segunda → validityDate

**Chrome DevTools Exploration**
- [x] Navegação para `AutorizacoesDetalhe` no portal Unimed BH
- [x] Descoberta: página contém 17 itens de procedimento (não apenas 1), nome do médico com foto (blob URL), especialidade, endereço e telefone do local, número de solicitação, senha/password, timeline de histórico, botão "Baixar guia" (PDF)
- [x] Dados atuais do scraper simples são insuficientes — toda a riqueza da página de detalhe é desperdiçada

**Documentation**
- [x] PROJETO.md atualizado com todas as novas entidades, endpoints, arquitetura, estrutura frontend e próximos passos
- [x] HISTORICO.md atualizado com oitava e nona sessões

### Próximos Passos (Documentados no PROJETO.md)
1. Expandir migration authorizations com novas colunas (solicitation_number, password, specialty, doctor_photo_url, local_address, items JSONB, history JSONB)
2. Atualizar Authorization entity com novos campos
3. Fazer scraper navegar para página de detalhe de cada autorização e extrair dados completos
4. Testar sync end-to-end com credenciais reais (rafaeldruzak@yahoo.com.br)

---

## [2026-07-27] - Décima Sessão: Sync Rico Unimed BH via APIs OutSystems

### Contexto
Assumimos o refinamento do sincronismo Unimed BH. Em vez de parsear HTML da listagem, mapeamos as APIs OutSystems do portal (login Playwright → intercept screen services) e catalogamos pedido + itens + médico/local como entidades para cruzamento futuro (Neo4J/agentes).

### Decisões
| Decisão | Opção | Motivo |
|---------|-------|--------|
| Fonte de dados | APIs OutSystems (screenservices) | JSON estruturado; HTML da listagem é pobre |
| Itens do pedido | Tabela `authorization_items` | Entidade própria para cruzamento futuro (não só JSONB) |
| Histórico/locais | JSONB em authorizations | Timeline e endereços variáveis; suficiente até grafo |
| Auth | IntegrationLink (email + senha AES-256-GCM) | Sync automático; login Playwright por job |
| Resumo | SyncResult com authorizationDetails | UX: o que foi criado/atualizado após cada sync |
| Neo4J / microserviços | Roadmap | Foco atual = sync; grafos e split depois |

### APIs mapeadas
- `DataActionListarSolicCliente` — lista pedidos (NumeroPedido, Senha, SolicIdEncriptado, médico, datas, status)
- `DataActionObterInformacoesSolicitacao` — ListaProcedimento (N itens)
- `DataActionObterPrestador` — especialidade + nome
- `DataActionObterInfoPrestador` — endereços/telefones
- `DataActionListarHistoricoSolic` — histórico do pedido

### Realizado
- [x] Migration `005_authorization_enrichment.sql`
- [x] Entity `Authorization` enriquecida + `AuthorizationItem`
- [x] Repos PG + schemas Zod + AuthorizationsTab expansível
- [x] `UnimedBhSyncScraper` reescrito para interceptar APIs e detalhar cada pedido
- [x] Sync com upsert por `solicitation_number` + resumo rico no modal
- [x] Docs: status + roadmap microserviços/Neo4J

### Próximos
1. Validar sync na UI
2. (Roadmap) Projetar Authorization/Doctor/Procedure no Neo4J
3. (Roadmap) Split em microserviços mantendo ports hexagonais
4. (Roadmap) Documentos de identificação + OCR → CPF → Unimed; UI "Arquivos"

---

## [2026-07-27] - Nomenclatura Arquivos + Roadmap Identificação

### Realizado
- [x] UI: aba/labels "Documentos" → "Arquivos" (pt-BR/EN) para não confundir com docs pessoais
- [x] Roadmap: docs de identificação (certidão etc.), OCR obrigatório populando paciente, CPF dos meninos para Unimed
- [x] UI: aba "Crescimento" → "Medidas"; PC → "Perímetro cefálico" (local para medições atuais e futuras)

---

## [2026-07-27] - Documentos de Identificação + OCR → Paciente

### Contexto
Backlog para importar dados dos meninos via certidão: tipos de identificação em Arquivos, OCR e aplicação de CPF/nome/nascimento no paciente (base para Unimed).

### Realizado
- [x] Migration `007_identity_document_types.sql` (certidao_nascimento, rg, cpf_card, cnh)
- [x] Parser `identity-document.parser.ts` (CPF com dígitos verificadores, data, nome, filiação)
- [x] Upload retorna `suggestedPatient`; endpoint `POST /documents/:id/apply-identity`
- [x] UI Arquivos: grupos Identificação/Clínicos; revisão OCR com checkboxes para aplicar no paciente
- [x] Testes parser (3) — total 12 testes API

### Como usar
1. Paciente → Arquivos → Adicionar Arquivo → Certidão de Nascimento (foto/scan)
2. Revisar OCR → marcar CPF (e nome/nascimento se quiser) → Confirmar e aplicar no paciente
3. CPF fica no cadastro para vincular/sincronizar Unimed

---

## [2026-07-27] - Roadmap: Export para o médico (2 níveis)

### Contexto
Precisamos levar o histórico ao consultório de forma útil — não só dump completo.

### Roadmap
- [ ] **Export completo** — prontuário integral do paciente
- [ ] **Export resumido** — informações relevantes para apresentar ao médico (alergias, medicações, diagnósticos, últimas consultas/exames, vacinas em atraso, autorizações vigentes), em formato apresentável (PDF/impressão)

---

## [2026-07-28] - Backlog: Rede credenciada agregada (“Decolar” da saúde)

### Contexto
Hoje cada operadora/SUS tem sua própria busca de rede. A ideia é um módulo de descoberta unificada no AiyraCare: o usuário/paciente busca uma vez e o sistema compõe resultados de vários provedores vinculados (e do SUS), melhorando o ranking com o tempo — análogo à Decolar para voos/hotéis, mas para rede credenciada.

### Backlog (não implementar agora)
- [ ] **Módulo Rede Credenciada** — busca (especialidade, local, nome, urgência etc.)
- [ ] **Arquitetura por adapters** — um adapter por fonte (SUS/ConecteSUS, Unimed BH, Amil, Bradesco Saúde, …), plugável conforme vínculos do paciente
- [ ] **Composição / ranking** — unificar resultados, deduplicar, ranquear e evoluir qualidade ao longo do tempo
- [ ] **UI de descoberta** — experiência tipo agregador (filtros, mapa/lista, origem do resultado por provedor)

### Fora de escopo imediato
- Não confundir com sync clínico (autorizações/extrato/carteira); este módulo é **descoberta de rede**, não importação de prontuário.

---

## [2026-07-28] - Discovery: Portal Beneficiário Amil (área logada)

### Contexto
Mapeamento inicial da Amil no browser do Cursor (SPA React em `https://www.amil.com.br/beneficiario/#/`) para futuro adapter de sync, no mesmo espírito do Unimed BH.

### Achados técnicos
- Auth: cookie `userToken` (JWT Bearer) + login por CPF/carteirinha
- APIs REST sob `/beneficiario/api/Beneficiario/...` (ex.: `ListaBeneficiarios`, `Plano`, `GuiasTokens/.../PostTokens`, `ListaBeneficiariosCarteirinha`)
- Home mostra carteirinha digital; rota `#/carteirinha` pode retornar “serviço não disponível” conforme perfil
- **Guias e tokens** (`#/guias-tokens`): lista pedidos com data, senha, token, situação, tipo, executante — filtrável por beneficiário (titular + dependentes)
- Menus relevantes: Rede credenciada, Meu plano, Minha saúde, Minha utilização, Reembolso, Telemedicina

### Backlog Amil (próximo)
- [x] Scraper/sync Amil via Playwright + APIs REST (Bearer): plano/carências + guias/tokens → autorizações
- [ ] Utilização Amil → consultas/exames; dependentes → pacientes adicionais
- [ ] Carteira digital Amil (QR/token se disponível no perfil)
- [ ] Adapter de rede credenciada Amil (quando o módulo agregado sair do backlog)
- [x] Domínio compartilhado `InsurancePlan` + `PlanMembership` (base multi-operadora)

---

## [2026-07-28] - Área do plano (Unimed ∩ Amil) + discovery Unimed Meu Plano

### Contexto
Amil e Unimed expõem o mesmo núcleo de “produto + vínculo do beneficiário”. Na Unimed isso já vem no Cartão Virtual (`DadoCartaoCliente`); há páginas Meu Plano adicionais (carência, 2ª via contrato, inclusão de serviços, info ANS).

### Unimed — páginas / campos em comum
- `CartaoVirtual` / `CarteiraVirtual` — token/QR + verso com ANS, acomodação, abrangência, CNS, contratante, validade, aditivos
- `InformacoesPlanosAns`, `DeclaracaoCarencia`, `SegundaViaContrato`, `InclusaoDeServicos` (200) — candidatos a carências/documentos do plano
- Campos alinhados à Amil: productCode/ANS, segmentation, accommodation, coverage, contractType, contractor, CNS, inclusionDate

### Realizado
- [x] Migration `009_insurance_plans.sql` (`insurance_plans` + `plan_memberships`)
- [x] Domínio + repos + `InsurancePlanService.upsertFromPortal`
- [x] `GET /plan-memberships?patientId=`
- [x] Cartão Virtual Unimed agora faz upsert de plano/membership e enriquece o payload
- [x] UI Carteira: seção **Meu plano** (inclui carências quando houver)
- [x] Sync clínica Unimed também atualiza plano/membership (Cartão Virtual na mesma sessão)
- [x] Sync Amil: login AuthOGS → `ListaBeneficiarios` / `Plano` / `Carencia` → `upsertFromPortal`; `PostTokens` → `Authorization`
- [x] UI syncável: Unimed + Amil (vincular e sincronizar / botão sync na carteira)

### Pendente
- [ ] Carências Unimed via `DeclaracaoCarencia` (PDF Jasper — sem lista estruturada ainda)
- [ ] Utilização / exames / vacinas Amil

---

## [2026-07-28] - Sync Amil + plano na sync Unimed + carências

### Realizado
- `AmilSyncScraper` (Bearer após `api/AuthOGS/Login`)
- `waiting_periods` no `PortalPlanSnapshot` / upsert
- Unimed sync enriquece `InsurancePlan`/`PlanMembership`
- Carteira mostra carências sincronizadas

---

## [2026-07-28] - Décima-primeira Sessão: Login Amil, WAF e preenchimento de formulário

### Contexto
Primeiros syncs Amil falhavam com "usuário ou senha inválidos" e depois 403. Debug colaborativo no browser confirmou: CPF estava correto; a senha não entrava no redux-form do portal. WAF da Amil bloqueia POST de login quando disparado por Playwright automatizado.

### Achados
- Login Amil: `POST /beneficiario/api/AuthOGS/Login` com `{ userData: { login, senha, idSistema: 400 } }` — CPF sem máscara no payload.
- Cookie/sessão: `userToken` (JWT Bearer); expiração ~30 min.
- JWT: carteirinha/marca ótica em `objeto.login` (ex.: `094995656`), não em `marcaOtica`.
- `page.fill()` no campo senha deixa valor vazio no React — necessário native value setter + eventos `input`/`change`.
- Playwright (mesmo headed) recebe **403 WAF** no POST de login; login manual pelo usuário no mesmo browser funciona.

### Realizado
- [x] `setReactInputValue` + validação de CPF/senha antes do submit
- [x] Detecção de POST sem senha no body
- [x] Mapeamento JWT `objeto.login` para marca ótica / carteirinha
- [x] Chrome visível por padrão (`AMIL_HEADLESS=false`)
- [x] Fluxo colaborativo: preencher + aguardar clique manual em Entrar
- [x] `SyncProgressModal`: steps unificados Unimed/Amil, timeout cliente 5 min, mensagem única no footer

### Arquivos
- `packages/api/src/infrastructure/scraper/amil-sync.scraper.ts`
- `packages/web/src/components/scraper/SyncProgressModal.tsx`

---

## [2026-07-28] - Décima-segunda Sessão: Auth Amil silenciosa (token + CDP)

### Contexto
Usuário pediu sync sem abrir browser detectável pelo WAF. Playwright continua flagado; solução: reutilizar sessão JWT e conectar ao **Chrome real** via CDP.

### Decisões
| Decisão | Opção | Motivo |
|---------|-------|--------|
| Sessão Amil | `encrypted_session_token` em `integration_links` | Sync subsequente 100% HTTP |
| CDP | `chromium.connectOverCDP` + perfil `.cache/amil-chrome-cdp` | Chrome real não é Playwright launch |
| Playwright Amil | Opt-in `AMIL_ALLOW_BROWSER=1` | WAF bloqueia automação |
| Primeiro login | Auto-launch Chrome com `--remote-debugging-port=9222` | UX sem comando manual |

### Realizado
- [x] Migration `010_integration_link_session.sql`
- [x] `IntegrationLink`: `encryptedSessionToken`, `sessionExpiresAt`, `setSessionToken`, `clearSessionToken`
- [x] `AmilSyncScraper`: ordem token → CDP → browser; `syncWithToken` via `playwright.request` (sem browser)
- [x] `tryReadTokenFromCdp` + `loginViaCdpChrome` + `ensureCdpChromeRunning`
- [x] `runAmilSync` persiste token após sync; limpa sessão em 401/403
- [x] `.gitignore`: `.cache/`
- [x] Documentação: `PROJETO.md`, `HISTORICO.md`, `AGENTS.md`, `README.md`

### Variáveis de ambiente (Amil)
- `AMIL_CDP_URL` — default `http://127.0.0.1:9222`
- `AMIL_ALLOW_BROWSER` — default false
- `AMIL_CHROME_PATH` — opcional
- `AMIL_MANUAL_LOGIN_TIMEOUT_MS` — default 300000

### Fluxo operacional atual
1. Sync tenta token salvo → APIs Amil direto.
2. Se expirado: abre/conecta Chrome CDP, preenche CPF/senha, usuário clica Entrar.
3. Token salvo no vínculo; próximos syncs silenciosos até expirar.

### Pendente
- [x] Validar primeiro sync CDP end-to-end em produção local ✅ **2026-07-28**
- [ ] Renovação proativa de sessão (CDP em background antes de expirar)
- [ ] Utilização Amil → MedicalRecord/Exam

---

## [2026-07-28] - Documentação para continuidade de sessões IA

### Realizado
- [x] `docs/PROJETO.md` — seção **Como a plataforma opera agora** (fluxo usuário, sync Unimed/Amil, env, arquivos-chave)
- [x] `docs/HISTORICO.md` — sessões 11–12 Amil + este registro
- [x] `AGENTS.md` — instruções operacionais expandidas
- [x] `README.md` — quick start + links para docs

---

---

## [2026-08-06] - ProjectContext para LLM e agentes

### Contexto
Necessidade de refletir decisões e foto atual da aplicação em entidade estruturada consumível por LLMs/agentes, alinhada ao catálogo de relações planejado.

### Realizado
- [x] `docs/project-context.json` — snapshot curado (camadas, domínios, decisões, roadmap, trilhas, catálogo de relações planejado)
- [x] `GET /project/context` — agrega JSON + `HISTORICO.md` parseado + migrations
- [x] Parser compartilhado `historico.parser.ts` (usado por `/sessions` e `/project/context`)
- [x] `api.project.context()` no web client; `AGENTS.md` e `README.md` atualizados
- [x] Testes `project-context.test.ts`

### Decisão
| Decisão | Motivo |
|---------|--------|
| JSON curado + API dinâmica | LLM lê um payload; humanos mantêm `project-context.json` ao mudar arquitetura |
| HISTORICO parseado na API | Histórico cronológico completo sem duplicar manualmente cada sessão no JSON |

---

## [2026-08-06] - Roadmap: contexto determinístico + trilhas de saúde

### Contexto
Discussão sobre evolução clínica da plataforma: histórico completo, Neo4j para hipóteses, documentos/LLM, agentes de apoio, e resumo do paciente **sem LLM**. Proposta de “assuntos em andamento” (tarefas, investigações, hipóteses, episódios com sintomas).

### Decisões
| Decisão | Opção | Motivo |
|---------|-------|--------|
| Resumo base | Postgres + template (`PatientContext`) | Fatos com proveniência; sem alucinação |
| Trilhas | `HealthThread` com kinds `task`, `investigation`, `hypothesis`, `episode` | Um conceito na UI; inputs diferentes |
| Diagnóstico formal | Tabela `diagnoses` existente | Trilhas cobrem pré-diagnóstico e suspeitas |
| Neo4j | Projeção após PG + trilhas | CRUD no PG; grafo para relações e agente |
| Ordem | Context → Trilhas → Neo4j → Agentes | Agentes precisam de contexto factual |

### Realizado (sessão)
- [x] `GET /patients/:id/context` — agregação determinística
- [x] `PatientContextPanel` + timeline horizontal no perfil
- [x] Seção **Roadmap — Contexto, trilhas e inteligência clínica** em `docs/PROJETO.md`
- [x] **Eixo 3.1** — `health_threads`, API CRUD, card **Em andamento** (`HealthThreadsPanel`)

### Roadmap integrado (próximos)
1. **Eixo 3.2** — entradas, sintomas, links a exame/autorização
2. **Eixo 3.3** — conversão hipótese → diagnóstico/alergia; context enriquecido
3. **Eixo 4** — lineage → Neo4j + aba timeline com filtros
4. **Eixo 5** — agente com `PatientContext` + trilhas + citações

### Exemplos mapeados
- Rafael: trilha `task` (checkup médica família)
- Luís: trilha `investigation` (adenoides / respiratório + exames)
- Bruno: trilha `hypothesis` (suspeita alergia)
- Episódio febre: trilha `episode` → log sintomas → timeline → diagnóstico

---

## [2026-07-28] - Amil: sync validado ✅

### Status
**Integração Amil operacional.** Sync completo testado com sucesso após auth via Chrome CDP (login manual em Entrar) + persistência de sessão.

### O que funciona
- Vincular paciente com CPF + senha do portal beneficiário Amil
- Sync assíncrono na aba **Carteira** (`WalletTab`)
- Login: token salvo → sync silencioso; ou Chrome CDP (`.cache/amil-chrome-cdp`) na primeira vez / sessão expirada
- Importação: **plano** + **carências** → `InsurancePlan` / `PlanMembership` (Meu plano)
- Importação: **guias/tokens** → `Authorization`
- Carteirinha/marca ótica via JWT `objeto.login` (ex.: plano LINCX)

### Ainda fora de escopo
- Utilização Amil (consultas/exames) → `MedicalRecord` / `Exam`
- Carteira digital Amil (QR) se disponível no perfil
- Dependentes como pacientes separados

---

## [2026-08-10] - Carteira em 3 abas, sync push-first, UI integrações e refresh

### Contexto
Consolidação da aba Carteira (Carteirinhas / Convênios / Integrações), progresso de sync sem polling agressivo, sidebar com histórico de sincronizações, Hermes Pardini (Precision Care), e correção do **Token ausente** no hard refresh com paciente selecionado.

### Decisões
| Decisão | Opção | Motivo |
|---------|-------|--------|
| Progresso de sync | SSE push-first + GET reconciliação | Evitar poll 800 ms; heartbeat no stream |
| Histórico sync UI | Snapshot do `lastJob` no mesmo card do dock | Comparar estado final; alinhamento visual |
| Refresh SPA | Vite proxy `bypass` para `/patients/*` e `/roadmap` | Navegação HTML não deve ir à API (401 Token ausente) |
| Mater Dei incremental | `examStartDate` desde max(exam)−14d | Reduzir fetch full 2015→hoje no portal |
| Convênios | Collapse sem `accordion` | Comparar dois planos expandidos |

### Realizado
- [x] Navegação paciente Opção A (`section` + `tab`); abas Carteira: Carteirinhas, Convênios, Integrações
- [x] `WalletSyncDock` / `IntegrationsSyncSidebar` — progresso ao vivo + últimas sincronizações por data/hora
- [x] SSE `GET /integration-links/sync-progress/:jobId/stream` + `sync-job-stream.ts`
- [x] Fix polling React (`onTerminal` em ref); cards histórico = `SyncJobCardView`
- [x] Hermes Pardini: ROPC, scraper, link no catálogo; BFF exames pendente
- [x] `docs/roadmap.json`, `docs/SYNC_DELTA.md`, sync incremental Mater Dei
- [x] **Refresh corrigido** — `vite.config.ts` bypass document navigation; `AuthContext` ignora `INITIAL_SESSION` vazio

### To-Dos (sequência)
- [x] Refresh corrigido (proxy Vite vs rotas SPA)
- [x] Registrar histórico e momento atual da aplicação (`HISTORICO.md` + `project-context.json`)
- [x] Commit e push `main` (esta sessão)
- [x] Mapear BFF Hermes Pardini (lista + PDF exames) — ✅ 2026-08-12 (`780162e`)
- [x] Sync incremental Unimed/Amil (fetch portal com janela/cursor) — 2026-08-11
- [x] Renovação proativa sessão Amil em background (`AMIL_SESSION_RENEW_MS`)
- [ ] Export PDF resumido para consulta médica

### Momento atual da aplicação (snapshot)
- **Web:** perfil paciente com macro-seções; Carteira em 3 sub-abas; dock lateral de sync sempre visível em Integrações; auth Supabase com token em memória + stream de progresso.
- **API:** sync jobs só PG; portais Unimed, Amil, Mater Dei, Hermes (lista + PDF laudo).
- **Auth refresh:** hard refresh em `/patients/:id?...` serve SPA via Vite, não JSON 401 da API.
- **Roadmap vivo:** `docs/roadmap.json` + página Roadmap; P0 Connect silencioso em progresso.

### Arquivos-chave
- `packages/web/vite.config.ts` — bypass SPA no proxy
- `packages/web/src/components/scraper/SyncJobCardView.tsx`
- `packages/api/src/infrastructure/scraper/sync-job-stream.ts`
- `packages/api/src/application/connect/sync-delta.helper.ts`
- `docs/SYNC_DELTA.md`, `docs/roadmap.json`

---

## [2026-08-11] - P0 Connect: hardening sync, Carteira silenciosa, incremental Unimed/Amil

### Contexto
Consolidação do épico P0 (sync silencioso): UI de marcas/alinhamento, sync automático na aba Carteira, robustez de sessão Unimed/Amil, e fetch incremental em sync `silent=1`.

### Decisões
| Decisão | Opção | Motivo |
|---------|-------|--------|
| Silent sync | Só na aba **Carteira** (`useSilentWalletSync`) | Integrações fica para ação manual + histórico |
| Incremental | `silent && !force` na API | Manual/`force` mantém janela full |
| Unimed extrato silent | 2 meses vs 6 manual | Menos timeout em `DataActionListarExtratoUtilizacao` |
| Unimed auth silent | Detalhe só desde `lastSync−14d` | Lista ainda full; evita N× goto detalhe |
| Amil guias silent | `PostTokens` desde `lastSync−14d` | API já aceita `PeriodoIni`/`PeriodoFim` |
| Browser | `browser-sync-mutex` + registry em timeout | Evita corrida no sync-all; mata Playwright órfão |
| Amil CDP | Não ler token CDP em sync manual antes de API | Evita usuário errado no Chrome paralelo |

### Realizado
- [x] UI brands: logos por operadora, tint em Convênios/Integrações, `GroupedAlignedTables`, Amil `#4F14FF` na Carteira
- [x] `useSilentWalletSync` + `useWalletLinkSyncStatus` — novelty discreta nos cards
- [x] Hardening Unimed: probe extrato, fail-fast SSO, `sync-browser-registry`
- [x] Hardening Amil: JWT-first; não limpar sessão em senha inválida
- [x] Sync-all serial (UI) + mutex API; polling `sync-status` 15s com pausa no dock
- [x] `sync-delta.helper`: incremental Unimed + Amil; testes vitest
- [x] Commits `4c70e72`, `b471fb5`
- [x] `skipped*` no novelty (Unimed consultas/exames/auth; Amil auth) + UI `formatSyncNovelty`
- [x] Amil silent: skip fetch plano/carências + `skipCoverage` no mapper (só guias)

### To-Dos (sequência)
- [x] Mapear BFF Hermes Pardini (lista + PDF exames) — ✅ 2026-08-12 (`780162e`)
- [ ] Export PDF resumido para consulta médica

### Momento atual da aplicação (snapshot)
- **Web:** Carteira dispara silent sync (6h stale, `sessionReady`); Integrações = Sincronizar manual + dock SSE.
- **API:** incremental Unimed/Amil/Mater Dei; dual-write `sync_jobs`; mutex browser.
- **Roadmap:** P0 Connect ✅; Hermes BFF + PDF ✅.

### Arquivos-chave
- `packages/web/src/hooks/useSilentWalletSync.ts`
- `packages/api/src/application/connect/sync-delta.helper.ts`
- `packages/api/src/infrastructure/sync/browser-sync-mutex.ts`
- `docs/SYNC_DELTA.md`

---

## [2026-08-12] - Hermes BFF, sync_jobs PG-only, scheduler scheduled

### Contexto
Fechar backlog P0 Connect: mapear API real do Hermes Pardini (portalpaciente), eliminar dual-write em `sync-progress-store`, e habilitar sync agendado com `trigger=scheduled`.

### Decisões
| Decisão | Opção | Motivo |
|---------|-------|--------|
| Hermes API | `paciente/api/v1/pedidos` + `/exames` | Shell `precision-care/api` não lista exames; SPA usa microfrontend portalpaciente |
| Progresso sync | Só `sync_jobs` PG | Histórico estável; SSE via `publishSyncJobEvent`; heartbeat reconcilia PG |
| Execução sync | `IntegrationLinkSyncService` | Controller HTTP fino; script/loop reutiliza mesmo pipeline |
| Scheduled | Silent + `sessionReady` + `SYNC_MIN_INTERVAL_MS` | Igual política Carteira; sem login interativo |

### Realizado
- [x] `hermes-pardini-bff.service.ts` — paginação pedidos + expand exames; delta `computeHermesPardiniExamStartDate`
- [x] `sync-progress-store` — async PG-only; `createJob(trigger)`; testes com fake repo
- [x] `IntegrationLinkSyncService` — Unimed/Amil/Mater Dei/Hermes + `runScheduledBatch`
- [x] `scripts/run-scheduled-syncs.mjs`; loop opcional `SYNC_SCHEDULED_INTERVAL_MS`
- [x] Header fixo web + novelty `skipped*` (commit anterior na branch)

### To-Dos (sequência)
- [x] PDF laudo Hermes (`POST /pedidos/{id}/download`) — ver entrada 2026-08-12 sync-events + PDF
- [x] `packages/connect-worker` (runner apartado)
- [x] Export PDF resumido para consulta médica

### Momento atual da aplicação (snapshot)
- **Web:** header fixo; Carteira silent + novelty skipped*; Integrações manual + dock SSE.
- **API:** Hermes importa exames via BFF; `sync_jobs` só PG; batch scheduled via script ou env.
- **Roadmap P0 Connect:** incremental ✅; novelty skipped* ✅; Hermes BFF ✅; sync PG ✅; scheduler local ✅.

### Arquivos-chave
- `packages/api/src/infrastructure/scraper/hermes-pardini-bff.service.ts`
- `packages/api/src/application/integration-link/integration-link-sync.service.ts`
- `packages/api/src/infrastructure/scraper/sync-progress-store.ts`
- `packages/api/scripts/run-scheduled-syncs.mjs`
- `docs/SYNC_DELTA.md`, `docs/roadmap.json`, `AGENTS.md`

---

## [2026-08-12] - sync.completed SSE + laudo PDF Hermes

### Contexto
Fechar backlog P2 Connect: notificar UI quando sync termina (sem depender só de polling) e importar laudo PDF consolidado do Hermes Pardini após metadados de exames.

### Decisões
| Decisão | Opção | Motivo |
|---------|-------|--------|
| Evento terminal | Bus por `patientId` + SSE | Carteira e contexto do mesmo paciente; job stream já existente para dock |
| Hermes PDF | Um download por `pedidoId` | API `POST /pedidos/{id}/download` retorna PDF do pedido; `resultFileUrl` em todos exames do pedido |
| Persistência | GCS + `Document` + meta JSON em `notes` | Mesmo padrão Mater Dei; dedup por `pedidoId` + `documentId` |

### Realizado
- [x] `sync-completion.bus.ts` — `notifySyncJobTerminal` → `publishSyncCompletion` com `patientId`
- [x] `sync-progress-store` — eventos `completed`/`failed` no job stream
- [x] `GET /patients/:id/sync-completions/stream` — SSE heartbeat ~25s
- [x] Web: `patient-sync-stream.ts`, `usePatientSyncCompletions` — refresh Resumo clínico + Carteira
- [x] `downloadHermesPardiniPedidoPdf` + `hermes-pardini-exam-persist.ts` — laudo → GCS
- [x] Sync Hermes: passo `fetch-files`; novelty `filesDownloaded`
- [x] Roadmap `sched-events` → done; `hermes-pdf-laudo` → done

### Momento atual da aplicação (snapshot)
- **Web:** sync terminal push na Carteira e contexto; polling 30s como fallback.
- **API:** Hermes importa exames + PDF laudo; jobs terminam com evento por paciente.

### Arquivos-chave
- `packages/api/src/infrastructure/sync/sync-completion.bus.ts`
- `packages/api/src/infrastructure/scraper/hermes-pardini-exam-persist.ts`
- `packages/web/src/lib/patient-sync-stream.ts`
- `docs/SYNC_DELTA.md`, `docs/roadmap.json`, `AGENTS.md`

---

## [2026-08-12] - Neo4j épico fechado (lineage worker + path queries + timeline grafo)

### Contexto
Completar P1 grafo: projetar sync/import no Neo4j, expor leituras de caminho clínico e visualização de encadeamento na Linha do tempo.

### Realizado
- [x] `ImportLineageGraphProjector` — exames/consultas/autorizações + Doctor/Procedure + proveniência `IMPORTED_AS`
- [x] Hooks em `CanonicalBatchImporterService` e sync Mater Dei/Hermes
- [x] `neo4j-lineage.runner` + `packages/neo4j-lineage-worker` (loop, once, backfill)
- [x] `ClinicalGraphQueryService` — graph clinical-flow/paths + timeline/graph
- [x] Web: Linha do tempo → modo **Encadeamento**
- [x] Migration `025_neo4j_projection_state.sql`

### Arquivos-chave
- `packages/api/src/infrastructure/graph/import-lineage-graph.projector.ts`
- `packages/api/src/infrastructure/graph/clinical-graph-query.service.ts`
- `packages/neo4j-lineage-worker/`

---
