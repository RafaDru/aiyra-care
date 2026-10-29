# Checklist go-live — MVP B2C família

> **Última atualização:** 2026-10-29  
> **Sequência wave (agentic):** [`GO_LIVE_BETA_WAVE.md`](../infra/GO_LIVE_BETA_WAVE.md)
> **Persona:** [`persona-parent-guardian`](./PERSONAS.md)  
> **Onboarding gate:** [`ONBOARDING_MVP_GATE.md`](./ONBOARDING_MVP_GATE.md)  
> **Jornadas:** [`USABILITY_JOURNEYS.md`](./USABILITY_JOURNEYS.md)

Lista de pilares para abrir **beta público** (domínio + famílias externas), sem substituir aprovação jurídica/contábil. Marque no PR de release ou em ritual pré-preview.

---

## Pilar 1 — Site institucional

Épico roadmap: [`institutional-landing`](../roadmap.json) (buscar `"id": "institutional-landing"`).

| # | Item | Status |
|---|------|--------|
| 1.1 | Rota pública `/home` sem auth | [x] eng ([#176](https://github.com/RafaDru/aiyra-care/pull/176)) |
| 1.2 | Hero + CTAs cadastro/login com tracking (`landing_cta_click`) | [x] eng ([#176](https://github.com/RafaDru/aiyra-care/pull/176)) |
| 1.3 | Copy alinhada a personas P0 (família, não B2B clínica) | [ ] revisão conteúdo |
| 1.4 | Links legais (termos/privacidade) apontando para documentos versionados | [x] eng ([#176](https://github.com/RafaDru/aiyra-care/pull/176) footer) |
| 1.5 | Feature card [`landing-marketing`](../features/landing-marketing.md) revisada para tier de conteúdo | [ ] |
| 1.6 | `LEGAL_ENTITY_NAME`, `LEGAL_CNPJ`, `LEGAL_PRIVACY_EMAIL` na API (footer e documentos legais) | [ ] **CNPJ/env** — secrets host; ver [`GO_LIVE_BETA_WAVE.md`](../infra/GO_LIVE_BETA_WAVE.md) §A |
| 1.7 | Opcional build web: `VITE_LEGAL_ENTITY_NAME`, `VITE_LEGAL_CNPJ`, `VITE_PUBLIC_SITE_URL` (SEO canonical/OG) | [ ] **env build** — placeholder em `.env.example`; domínio em §B |
| 1.8 | Termos, privacidade e cookies publicados (`seed-legal-documents`) | [ ] **ops** — agente executa seed no host; conteúdo `[ ]` **jurídico** |
| 1.9 | Preços na landing sem valores vinculantes até billing público | [ ] |
| 1.10 | Suite QA [`auth-entry-flow`](../testing/suites/auth-entry-flow.md) | [ ] |

**Referência técnica:** [`auth-entry-onboarding`](../features/auth-entry-onboarding.md) (funil landing → login).

---

## Pilar 2 — Gate de onboarding (Anel A)

Spec: [`ONBOARDING_MVP_GATE.md`](./ONBOARDING_MVP_GATE.md).

| # | Item | Status |
|---|------|--------|
| 2.1 | Conta: CPF, nome, e-mail, telefone, endereço no `complete-profile` | [ ] |
| 2.2 | ≥1 `care_circle` + ≥1 pessoa + `self` + relação de cuidado | [ ] |
| | *Escopo Anel A eng:* convênio/SUS/pagamento fora do 1º onboarding ([#177](https://github.com/RafaDru/aiyra-care/pull/177)) — ver 2.3–2.4 | |
| 2.3 | Convênio e SUS **fora** do 1º onboarding (sem passo / sem «não tenho») | [x] eng ([#177](https://github.com/RafaDru/aiyra-care/pull/177)) |
| 2.4 | Pagamento **fora** do gate | [x] eng |
| 2.5 | Jornada **J1** — suites `auth-entry-flow`, `onboarding-flow`, `core-patient-crud`, `dashboard-people-grouping` verdes | [ ] |
| 2.6 | Regressão lane `regression` ou `business-full` conforme [`QA_PROCESS.md`](../testing/QA_PROCESS.md) | [ ] |

---

## Pilar 3 — Ambiente PJ / legal

| # | Item | Status |
|---|------|--------|
| 3.1 | CNPJ e dados fiscais operacionais (Contabilizei / emissor NFS-e) | [ ] **Rafael** + contador |
| 3.2 | Documentos em `docs/legal/` publicados via API compliance | [ ] **jurídico** + seed host (§A wave) |
| 3.3 | `COMPLIANCE_GATE_ENABLED=1` em ambiente beta/prod | [ ] **jurídico** antes de ligar |
| 3.4 | Mapa de tratamento e bases LGPD revisados | [ ] **jurídico** |
| 3.5 | Fila [`HUMAN_REVIEW_QUEUE.md`](../HUMAN_REVIEW_QUEUE.md) sem bloqueio P0 jurídico | [ ] **jurídico** |
| 3.6 | Beta/prod: `DEPLOYMENT_TIER=production` + gate scrape privado ([`connect-showcase-not-production`](../principles/connect-showcase-not-production.md)) | [x] eng ([#178](https://github.com/RafaDru/aiyra-care/pull/178)) |

**Canon:** [`LEGAL_COMPLIANCE.md`](../LEGAL_COMPLIANCE.md) · épico `legal-lgpd-compliance` no [`roadmap.json`](../roadmap.json).

---

## Pilar 4 — Domínio e presença pública

| # | Item | Status |
|---|------|--------|
| 4.1 | Registro **www.aiyra-care.com.br** e/ou **www.aiyracare.com.br** (decisão 2026-10-26 em [`HISTORICO.md`](../HISTORICO.md)) | [ ] **DNS** — Rafael registro; §B wave |
| 4.2 | DNS → host beta (Cloud Run / CDN) com TLS válido | [ ] **DNS/TLS** |
| 4.3 | `API_PUBLIC_URL` e callbacks Supabase/OAuth atualizados para o domínio | [ ] **DNS** — agente secrets + Supabase |
| 4.4 | E-mail transacional (confirmação, convites família) no domínio ou SPF/DKIM documentado | [ ] |

---

## Pilar 5 — Beta (deploy e operação)

| # | Item | Status |
|---|------|--------|
| 5.1 | `npm run promotion:gates` verde no Ambiente 1 | [ ] |
| 5.2 | Preview validado — [`PREVIEW_LOCAL_TEST_GUIDE.md`](../infra/PREVIEW_LOCAL_TEST_GUIDE.md) | [ ] |
| 5.3 | Deploy beta executado conforme runbook | [ ] |
| 5.4 | `npm run preview:post-deploy` (migrations + smoke) | [ ] |
| 5.5 | Ops: métricas/alertas (`OPS_METRICS_KEY`, webhook) no ambiente beta | [ ] |
| 5.6 | Plano de rollback exercitado ou documentado | [ ] |
| 5.7 | Lista fechada de beta testers ou feature flag documentada | [ ] |

**Runbook:** [`DEPLOY_BETA_RUNBOOK.md`](../infra/DEPLOY_BETA_RUNBOOK.md) · GCP: [`GCP_PREVIEW_RUNBOOK.md`](../infra/GCP_PREVIEW_RUNBOOK.md) · pipeline [`DELIVERY_PIPELINE.md`](../DELIVERY_PIPELINE.md).

---

## Sinal verde consolidado

Marcar go-live beta apenas quando:

- [ ] Pilares **1–5** sem item crítico em aberto (exceções com data e dono no [`HISTORICO.md`](../HISTORICO.md))
- [ ] J1–J3 smoke documentado em [`USABILITY_JOURNEYS.md`](./USABILITY_JOURNEYS.md) (mínimo pré-domínio)
- [ ] Rafael — decisão estratégica de abertura (charter [`OPS_SOLO_OPERATOR_CHARTER.md`](../OPS_SOLO_OPERATOR_CHARTER.md): humano só em decisão, execução agentica)

---

## Referências rápidas

| Tema | Documento |
|------|-----------|
| Personas e prioridade MVP | [`PERSONAS.md`](./PERSONAS.md) |
| Jornadas + suites | [`USABILITY_JOURNEYS.md`](./USABILITY_JOURNEYS.md) |
| Gate Anel A/B | [`ONBOARDING_MVP_GATE.md`](./ONBOARDING_MVP_GATE.md) |
| Anel B (backlog) | [`anel-b-progressive-profiling`](../features/anel-b-progressive-profiling.md) — slice 1 CTAs shipped |
| Legal / LGPD | [`LEGAL_COMPLIANCE.md`](../LEGAL_COMPLIANCE.md) |
| Deploy beta | [`DEPLOY_BETA_RUNBOOK.md`](../infra/DEPLOY_BETA_RUNBOOK.md) |
| Wave sequência A→D | [`GO_LIVE_BETA_WAVE.md`](../infra/GO_LIVE_BETA_WAVE.md) |
| Landing / marketing | Roadmap `institutional-landing` · [`landing-marketing`](../features/landing-marketing.md) |
