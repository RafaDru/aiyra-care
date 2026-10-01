# Foco atual — tracking vivo

> **Última atualização:** 2026-09-16  
> Documento de acompanhamento entre sessões — complementa `roadmap.json` e `HISTORICO.md`.  
> Atualizar a cada entrega relevante ou mudança de prioridade.

---

## Trabalhos em paralelo (set/2026)

Apenas **duas** frentes ativas — não abrir terceira lane sem fechar ou pausar uma delas.

| Frente | Escopo | Onde acompanhar |
|--------|--------|-----------------|
| **Produto** | Épico `family-day-to-day` fechado (D1–D5); Ava G4; referral billing (pós-jurídico) | Esta seção + `docs/features/` + suites QA |
| **Ops** | investigationId, Automations Dev/SRE, Tier 1 opt-in, tray/console | `docs/ops/INVESTIGATION_CORRELATION.md`, `AUTOMATIONS_LANES.md` |
| **Tooling** | Cursor Projects + My Machines (`NotebookRafael`, autostart login) | `docs/CURSOR_WORKSPACE.md` |

**Ops — estado atual:** Fase 1–2 + **investigationId**; Tier 1 opt-in (`OPS_INVESTIGATOR_TIER1`). WIP ops em paralelo — commits separados do produto.

**Produto — em `main` (set/15):** D1–D5 + dossiê jurídico + Ava G3 + RBAC 067 + suites QA alinhadas.

**Tooling — configurado (set/16):** worker local para Projects; ver `scripts/cursor-worker-*.ps1`.

---

## Prioridades do produto (Rafael — set/2026)

| # | Frente | Intenção | Épicos / docs |
|---|--------|----------|----------------|
| 1 | **Dia a dia da família** | Registrar eventos do cotidiano (sintoma, medida, medicação, consulta, lembrete) com mínimo esforço | `agenda-calendario`, health threads (`acompanhamento`), `MEASUREMENTS.md`, `CareReminderBanner` |
| 2 | **Ava parceira** | Consolidar Ava como companheira contínua — não só chat, mas contexto, proatividade e confiança | `ava-companion-platform`, `AVA_OPERATIONAL.md` (G2–G4), `AVA_PATIENT_LENS.md`, `AVA_EXPRESSIONS.md` |
| 3 | **Ambiente do profissional** | Preparar superfície médica/clínica sem comprometer o núcleo família | `b2b-partner-platform`, `B2B_PARTNERS.md`, org/RBAC (055), export/share clínico |

### 1 — Dia a dia (família registrando eventos)

**Já existe (base):**

- Agenda + `scheduled_events` (CRUD, ICS, Google/Outlook OAuth)
- Acompanhamentos (`health_threads`, kind `acompanhamento`)
- Medidas, medicações, vacinas, exames (CRUD + sync)
- Lembretes (`CareReminderBanner`, notificações)

**Discovery (2026-09-11):** [`discovery/day-to-day-clinician-access.md`](./discovery/day-to-day-clinician-access.md) — captura rápida + «Levar na consulta» (link/QR/PDF) + tiers de extrato.

**Gaps → MVP proposto:**

- **D1** Wizard «Levar na consulta» — **entregue** (link + QR + PDF + rota pública)
- **D2** «+ Registro rápido» (5 tipos) — **entregue** (header global + sheet)
- **D3** Bloco «Hoje» na Carteira + dashboard — **entregue** (`WalletTodayPanel`)
- **D4** E-mail ao médico + código referral no link — **entregue** (MVP atribuição; sem billing)
- **D5** Portal médico leve (página pública) — **entregue**
- Programa de indicação bilateral (descontos) — debate: [`discovery/referral-growth-loop.md`](./discovery/referral-growth-loop.md)
- Suites QA dia a dia: `patient-clinical-export`, `family-quick-capture`, `family-day-timeline`, `patient-health-thread`, `patient-wallet` — **todas com spec**
- Referral billing bilateral — **fora do MVP** (atribuição D4 ok; descontos aguardam jurídico)

### 2 — Consolidação Ava parceira

**Entregue recentemente:**

- Dock global, conversas persistidas, lente de paciente, guardrails, pins G1
- CI: `AVA_TEST_MODE=1` + specs `ava-companion-smoke`, `ava-guardrail-smoke`

**Próximo (operacional):**

- **G4:** tool calling mutável amplo (`agent-runtime` — parcial)
- Expressão visual + narrativa (`AVA_EXPRESSIONS.md`)
- Não julgar qualidade LLM em QA — só comportamento determinístico (`AVA_QA_SCOPE.md`)
- Estabilizar flake Ava no `business-full` (composer idle + retries) — draft `cursor/ava-smoke-stabilize-cde2`

### 3 — Ambiente profissional da medicina

**Já existe:**

- Primitives org (`055`), export clínico PDF, share token 48h
- Discovery B2B documentado

**Próximo:**

- Escopos RBAC por paciente na org (clínico vê pacientes da clínica)
- Referral com billing (após parecer jurídico formal)
- Console parceiro vs ops-console interno
- Revisões tier 2+: legal + medical antes de go-live B2B

---

## Entregas técnicas recentes (2026-09-15/16)

| Commit / entrega | Resumo |
|------------------|--------|
| `aa43ba7` | D4 e-mail/referral + D5 portal médico + dossiê jurídico PDF + suite `patient-health-thread` |
| `90f357b` | Ava G3 confirmação de ações + RBAC org audit (067) |
| *(local, set/16)* | Cursor My Machines `NotebookRafael` + autostart Windows + scripts `cursor-worker-*` |

---

## CI E2E — status

| Workflow | Run | Resultado | Notas |
|----------|-----|-----------|-------|
| E2E regression | [34857415954](https://github.com/RafaDru/aiyra-care/actions/runs/34857415954) | **PASS** | smoke + onboarding + core-patient + 2 Ava |
| E2E business-full | [34857416100](https://github.com/RafaDru/aiyra-care/actions/runs/34857416100) | **PASS** | 11 passed, 2 flaky Ava (`ava-companion-smoke`, `ava-guardrail-smoke`) |
| E2E business-full | [34634817991](https://github.com/RafaDru/aiyra-care/actions/runs/34634817991) | FAIL | pré-fix Select — histórico |

**Meta:** 7 semanas verdes no `business-full` (agendado **sexta 06:00 BRT**) antes de gate em PR (`AUTOMATION_ROADMAP.md`). **Progresso: 1/7** (run `34857416100`, quando era diário).

---

## Ritual de atualização

Ao fechar uma sessão ou entrega:

1. Esta seção **Entregas técnicas** + tabela **CI**
2. `docs/HISTORICO.md` — decisões
3. `docs/roadmap.json` — `status` / `detail` dos itens tocados
4. Feature card em `docs/features/` se mudou produto

Ver também: [`AGENT_BOOTSTRAP.md`](./AGENT_BOOTSTRAP.md), [`testing/CI_LEARNINGS.md`](./testing/CI_LEARNINGS.md).
