# Foco atual — tracking vivo

> **Última atualização:** 2026-09-11  
> Documento de acompanhamento entre sessões — complementa `roadmap.json` e `HISTORICO.md`.  
> Atualizar a cada entrega relevante ou mudança de prioridade.

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

- **D1** Wizard «Levar na consulta» (reusa export + QR + link 48h)
- **D2** «+ Registro rápido» (5 tipos, &lt; 30s)
- **D3** Bloco «Hoje» na Carteira
- Programa de indicação bilateral — debate: [`discovery/referral-growth-loop.md`](./discovery/referral-growth-loop.md)
- Suites QA: `patient-clinical-export`, `family-quick-capture`, `patient-health-thread`

### 2 — Consolidação Ava parceira

**Entregue recentemente:**

- Dock global, conversas persistidas, lente de paciente, guardrails, pins G1
- CI: `AVA_TEST_MODE=1` + specs `ava-companion-smoke`, `ava-guardrail-smoke`

**Próximo (operacional):**

- G2: aceleradores + transparência de contexto (já parcial — `ava-context-transparency` done)
- G3: ações propostas executáveis com confirmação (`ava-proposed-action`)
- Expressão visual + narrativa (`AVA_EXPRESSIONS.md`)
- Não julgar qualidade LLM em QA — só comportamento determinístico (`AVA_QA_SCOPE.md`)

### 3 — Ambiente profissional da medicina

**Já existe:**

- Primitives org (`055`), export clínico PDF, share token 48h
- Discovery B2B documentado

**Próximo:**

- RBAC profissional (`b2b-platform-rbac`) — médico, admin clínica, read-only parceiro
- Pacote clínico: portal leve de compartilhamento (`b2b-segment-clinicians`)
- Console parceiro vs ops-console interno
- Revisões tier 2+: legal + medical antes de go-live B2B

---

## Entregas técnicas recentes (2026-09-11)

| Commit | Resumo |
|--------|--------|
| `6a84b3a` | E2E: compliance login, Select Ant Design, Fase 4 Ava (`AVA_TEST_MODE`) |
| `9259d64` | Ops: aba **Negócio** (`BusinessPanel`) |
| `e5c64a2` | `npm run ops:business-weekly` |
| `36fa56e` | Fix project `smoke` + dropdown Select (1ª iteração) |
| `56e56be` | Select force click + `FOCO_ATUAL.md` — **regression verde** |

---

## CI E2E — status

| Workflow | Run | Resultado | Notas |
|----------|-----|-----------|-------|
| E2E regression | [34636197555](https://github.com/RafaDru/aiyra-care/actions/runs/34636197555) | **PASS** | 6 specs (smoke + onboarding + core-patient + 2 Ava); fix `56e56be` |
| E2E regression | [34634939392](https://github.com/RafaDru/aiyra-care/actions/runs/34634939392) | FAIL | flake Select — corrigido em `56e56be` |
| E2E business-full | [34634817991](https://github.com/RafaDru/aiyra-care/actions/runs/34634817991) | FAIL | pré-fix Select; re-disparar após validação |

**Causa raiz (regression, resolvida):** Ant Design Select no CI — dropdown hidden na animação `ant-slide-up-appear`. Fix: `.ant-select-item-option` + `click({ force: true })` (`56e56be`).

**Meta:** 7 noites verdes no `business-full` antes de promover a gate obrigatório (`AUTOMATION_ROADMAP.md`).

---

## Ritual de atualização

Ao fechar uma sessão ou entrega:

1. Esta seção **Entregas técnicas** + tabela **CI**
2. `docs/HISTORICO.md` — decisões
3. `docs/roadmap.json` — `status` / `detail` dos itens tocados
4. Feature card em `docs/features/` se mudou produto

Ver também: [`AGENT_BOOTSTRAP.md`](./AGENT_BOOTSTRAP.md), [`testing/CI_LEARNINGS.md`](./testing/CI_LEARNINGS.md).
