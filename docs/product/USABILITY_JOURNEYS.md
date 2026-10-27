# Jornadas de usabilidade — por persona

> **Última atualização:** 2026-10-26  
> **Personas:** [`PERSONAS.md`](./PERSONAS.md)  
> **QA:** [`../testing/README.md`](../testing/README.md), [`../testing/BUSINESS_ACTION_MATRIX.md`](../testing/BUSINESS_ACTION_MATRIX.md)

Este documento descreve **como capacidades conversam no dia a dia** — não só CRUD isolado. Cada jornada lista pré-condições, telas, critérios de **fluidez** (subjetivos mas documentados) e ligação a suites `npm run qa:run -- --suite <id>`.

---

## Legenda de fluidez

| Nível | Significado para o tester |
|-------|---------------------------|
| **F1 — Sem dead-end** | Sempre há próximo passo óbvio (CTA, aba, link de ajuda); nunca tela em branco ou erro sem recuperação. |
| **F2 — Poucos cliques** | Meta ≤ 3 cliques do Início até a ação principal da jornada (exceto sync com portal). |
| **F3 — Contexto preservado** | Voltar/avançar não perde paciente selecionado; lente Ava alinhada ao filho certo. |
| **F4 — Feedback claro** | Loading, sucesso e falha de sync visíveis (modal/SSE/banner) — sem “sumiu e não sei se funcionou”. |

**PASS subjetivo de usabilidade:** F1–F4 atendidos **e** critérios objetivos da suite QA (quando existir) em ✅.

---

## MVP fluído — checklist mensurável

Cadeia mínima para **`persona-parent-guardian`** no **web** (Ambiente 1 local ou preview):

| # | Marco | Telas / rotas | Suite QA | Matriz |
|---|--------|---------------|----------|--------|
| 1 | Entrar na conta | `/home` → `/login` → `/` | `auth-entry-flow` | 🟡 |
| 2 | Onboarding titular + ≥1 família | `/onboarding` → `/` | `auth-entry-flow`, `onboarding-flow` | 🟡 |
| 3 | Criar perfil da criança | `/` → modal paciente → `/patients/:id` | `core-patient-crud` | 🟡 |
| 4 | Vincular convênio (UI) | `tab=integrations` → link criado | `integrations-link-sync` | 🟡 |
| 5 | Ver carteira (vazia ou pós-sync demo) | `tab=wallet` | `patient-wallet` | 🟡 |
| 6 | Registro do dia | Início ou paciente → registro rápido | `family-quick-capture`, `family-day-timeline` | ✅ |
| 7 | (Opcional P0+) Convidar co-responsável | `/settings/family` ou `/family` | `family-access-matrix`, `family-circles-crud` | 🟡 |

**Gap conhecido na cadeia:** aba **Convênios** (importar plano sem passar só por Integrações) — suite `patient-insurance` **⬜** ([`BUSINESS_ACTION_MATRIX.md`](../testing/BUSINESS_ACTION_MATRIX.md)). Até existir suite, a jornada 4→5 assume vínculo via **Integrações**.

**Rough edges honestos (out/2026):**

- Sync **real** de operadora/lab: fora do smoke (`integration-portal`); WAF e login browser.
- CRUD manual exames/meds/vacinas/documentos: suites **planejadas**, não gate business-full completo.
- Ava: dock operacional, mas suites `ava-companion-smoke` etc. ainda **⬜** na matriz.
- Mobile: família/ACL concentrada na web; suite `mobile-family-tx` 🟡 ([`suites/index.json`](../testing/suites/index.json)).
- Tour primeira visita web: épico `first-visit-guided-ux` **planned** (`PRODUCT_MATURITY_BOARD.json`).

---

## Jornadas — `persona-parent-guardian` (P0)

### J1 — «Primeira noite no app» (conta → filho no Início)

| | |
|--|--|
| **Objetivo** | Sair do zero com pelo menos um **perfil de criança** visível em «Quem você cuida». |
| **Pré-condições** | Conta nova ou `npm run qa:reset-onboarding-user`; API `:3010`, web `:5173`. |
| **Persona fixture** | `qa-onboarding` / fluxo wizard em `auth-entry-flow`. |

| Passo | Tela / ação | Fluidez | Suite |
|-------|-------------|---------|-------|
| 1 | `/home` → **Criar conta** ou login QA | F1: modo signup/login claro | `auth-entry-flow` A/B |
| 2 | Compliance + wizard: perfil titular (CEP, celular) | F4: erros de validação inline | `auth-entry-flow` C |
| 3 | Nome do 1º círculo + **Pular pessoas** (ou adicionar criança no wizard) | F2: permitir pular conectores | `onboarding-flow` |
| 4 | Conectores SUS/convênio/lab — **Pular** até dashboard | F1: cada passo tem Pular | `auth-entry-flow` C |
| 5 | Dashboard **Quem você cuida** — **Adicionar pessoa** | F2: CTA no header (não só menu) | `dashboard-people-grouping`, `core-patient-crud` |
| 6 | Cadastro menor: nome, nascimento, consentimento guardião | F4: checkbox consentimento menor | `core-patient-crud` |
| 7 | Abrir perfil da criança — aba padrão (Carteira ou Hoje) | F3: URL `/patients/:id` estável | `patient-wallet` (smoke aba) |

**Critérios PASS:** titular + criança listados; nenhum loop infinito no wizard; `POST /auth/complete-profile` sucesso.  
**Gap:** cenário **multi-família** no onboarding (passo D em `auth-entry-flow.md`) — manual / futuro E2E.

---

### J2 — «Carteirinha e plano» (integração → Carteira)

| | |
|--|--|
| **Objetivo** | Entender onde está o plano e o que fazer na **primeira** sincronização. |
| **Pré-condições** | Paciente `QA-*` criado; compliance OK. |
| **Nota** | Não exige login real Unimed/Amil na suite padrão. |

| Passo | Tela / ação | Fluidez | Suite |
|-------|-------------|---------|-------|
| 1 | Perfil criança → aba **Integrações** | F1: lista de portais reconhecíveis (logo) | `integrations-link-sync` |
| 2 | **Vincular** operadora (wizard credenciais ou demo) | F4: modal de progresso com `jobId` | `integrations-link-sync` |
| 3 | Primeira sync: modal **Sincronizar** (não silent) | F4: SSE/modal até terminal | `integrations-link-sync` |
| 4 | Aba **Carteira** | F1: empty state com hint → Integrações **ou** grid carteirinha | `patient-wallet` |
| 5 | Reabrir Carteira com `sessionReady` | F4: silent sync sem modal intrusivo | `patient-wallet` |
| 6 | (Opcional) Banner stale >6h | F4: CTA ou tag «desatualizado» | `patient-wallet` |

**Critérios PASS:** sem erro 500; estados empty/preenchido coerentes; CTA para primeira sync quando sem sessão.  
**Gaps:** `patient-insurance` ⬜; portais `unimed-sync-manual`, `fleury-sync-manual` ⬜; ConecteSUS `sus-conectesus-import` ⬜.

---

### J3 — «Dia a dia de cuidado» (manhã → registro → Hoje)

| | |
|--|--|
| **Objetivo** | Simular rotina: registrar algo rápido e ver na timeline do dia. |
| **Pré-condições** | Conta com perfil `self` ou criança; hint discovery não dismissado (J3 passo 1). |

| Passo | Tela / ação | Fluidez | Suite |
|-------|-------------|---------|-------|
| 1 | Início — card **Dia a dia da família** | F2: atalhos visíveis | `family-day-to-day-discovery` |
| 2 | **Registrar agora** → drawer registro rápido | F3: escolher paciente no drawer | `family-quick-capture` |
| 3 | Salvar nota/medida/med (um tipo) | F4: confirmação sem sair do contexto | `family-quick-capture` |
| 4 | Perfil paciente → **Carteira** bloco **Hoje** | F3: evento aparece no dia | `family-day-timeline` |
| 5 | **Preparar consulta** (modal export resumido) | F1: fecha e volta ao Início | `family-day-to-day-discovery` |

**Critérios PASS:** registro visível em Hoje; card discovery dismiss persiste após reload.  
**Gap:** qualidade clínica do conteúdo — fora de escopo ([`AVA_QA_SCOPE.md`](../testing/AVA_QA_SCOPE.md)).

---

### J4 — «Pediatra na sexta» (contexto + export)

| | |
|--|--|
| **Objetivo** | Montar pacote para consulta (timeline + export/link). |
| **Pré-condições** | Paciente com algum dado (registro rápido ou demo). |

| Passo | Tela / ação | Fluidez | Suite |
|-------|-------------|---------|-------|
| 1 | Perfil → revisar **Linha do tempo** / filtros | F1: empty state útil | `patient-timeline` ⬜ |
| 2 | Export clínico ou share | F4: progresso geração + link copiável | `patient-clinical-export` ✅ |
| 3 | (Opcional) Ava — lente na criança, pergunta operacional | F3: lente correta | `ava-companion-smoke` ⬜ |
| 4 | Entregar link ao `persona-physician-solo` (fora do app) | — | manual |

**Critérios PASS:** export completa sem LLM inventando dados; link abre leitura.  
**Gap:** timeline suite ⬜; Ava smoke ⬜.

---

### J5 — «Convidar a mãe/pai» (co-responsável)

| | |
|--|--|
| **Objetivo** | Segunda conta vê **só** os filhos compartilhados. |
| **Pré-condições** | Seed `npm run seed:qa-family-matrix` + link persona (ver fixture). |

| Passo | Tela / ação | Fluidez | Suite |
|-------|-------------|---------|-------|
| 1 | Titular → **Família** (`/family` ou settings) | F1: convite e círculos no mesmo hub | `family-circles-crud` |
| 2 | Enviar convite e-mail | F4: estado pendente visível | `family-access-matrix` 🟡 |
| 3 | Co-responsável aceita `/invite/accept` | F1: landing clara | `family-access-matrix` |
| 4 | Dashboard co-responsável | F3: só pacientes grantados | `family-access-matrix` |
| 5 | Revogar grant | F4: paciente some do Início | `family-access-matrix` |

**Critérios PASS:** matriz João/Maria (Pedro/Lucas sim, escopo correto).  
**Gap:** 5 logins Supabase dedicados — épico `qa-e2e-family-matrix`; Mariana multi-círculo fase 3.

---

## Jornadas resumidas — outras personas

### `persona-self-care-adult` (P1)

| Jornada | Passos-chave | Suites |
|---------|--------------|--------|
| S1 — Conta solo | Onboarding com 1 círculo + só `self` | `auth-entry-flow`, `onboarding-flow` |
| S2 — Sync e carteira | Igual J2 sem cadastro de filho | `integrations-link-sync`, `patient-wallet` |
| S3 — Ava autocuidado | Lente em `self` | `ava-companion-smoke` ⬜ |

### `persona-third-party-caregiver` (P1)

| Jornada | Passos-chave | Suites |
|---------|--------------|--------|
| T1 — Acesso limitado | Convite → login → registro rápido em 1 paciente | `family-access-matrix`, `family-quick-capture` |
| T2 — Sem billing | Não vê Stripe/plano conta | manual — **gap** copy/UX |

### B2B — `persona-physician-solo` (P2)

| Jornada | Passos-chave | Suites |
|---------|--------------|--------|
| B1 — Receber contexto | Família gera export → médico abre link público/token | `patient-clinical-export` |

---

## Como agentes testam usabilidade

### Ritual por entrega de produto (tier ≥ 1)

1. **Identificar persona e jornada** afetada neste doc + [`PERSONAS.md`](./PERSONAS.md).
2. **Listar suites:** `npm run qa:list` — cruzar com [`suites/index.json`](../testing/suites/index.json).
3. **Executar suites da jornada:**
   ```bash
   npm run qa:run -- --suite <id>
   ```
   Preview: acrescentar `--preview`.
4. **Regressão rápida** antes de merge em `main`:
   ```bash
   npm run qa:run-all -- --lane regression
   ```
5. **Teste completo de negócio** (release / pedido Rafael «teste completo»):
   ```bash
   npm run qa:run-all -- --lane business-full
   ```
   Paralelizar por domínio — [`PARALLEL_QA_MODEL.md`](../testing/PARALLEL_QA_MODEL.md).

### Walkthrough e evidência

| Tipo | Quando | Como |
|------|--------|------|
| **Walkthrough gravado** | Mudança de fluxo P0 pai/mãe | Skill walkthrough-artifacts; foco J1–J3. |
| **Playwright** | Suite com `automation.status: done/partial` | `npm run test:e2e:regression` ou spec da suite. |
| **Computer-use manual** | Gap ⬜ ou critério F1–F4 subjetivo | Seguir tabela de passos deste doc; screenshot só em FAIL. |

### Critérios PASS/FAIL documentados

| Resultado | Condição |
|-----------|----------|
| **PASS objetivo** | Todos os passos ✅ da suite QA linkada. |
| **PASS usabilidade** | PASS objetivo **ou** (se suite ⬜) todos os passos manuais ✅ **e** F1–F4 marcados sim pelo tester. |
| **FAIL** | Qualquer passo ❌, dead-end (F1), ou regressão em `regression` lane. |
| **FAIL com gap** | Comportamento correto mas suite inexistente — abrir item em matriz + opcional épico `qa-business-full-coverage`; não marcar persona «fluída» no checklist MVP. |

### Cadência sugerida pós-merge

| Evento | Ação |
|--------|------|
| Merge em `main` (produto web) | `qa:run-all --lane regression` + suites das jornadas tocadas no PR |
| Semanal / pré-preview | J1→J3 em sequência (`auth-entry-flow` → `core-patient-crud` → `family-day-to-day-discovery`) |
| Antes de domínio **aiyracare.com.br** | Checklist MVP completo + `business-full` (horas; paralelo) |
| Após mudança família/ACL | `family-access-matrix` + `family-circles-crud` |
| Após mudança sync/carteira | `integrations-link-sync` + `patient-wallet` |

### Relatório no chat (Definition of Done)

Formato: `Jornada Jx — PASS/FAIL` + suites executadas + top gaps se FAIL parcial.

---

## Índice jornada → suite

| Jornada | Suites principais |
|---------|-------------------|
| J1 | `auth-entry-flow`, `onboarding-flow`, `core-patient-crud`, `dashboard-people-grouping` |
| J2 | `integrations-link-sync`, `patient-wallet` |
| J3 | `family-day-to-day-discovery`, `family-quick-capture`, `family-day-timeline` |
| J4 | `patient-clinical-export`, `patient-timeline` ⬜, `ava-companion-smoke` ⬜ |
| J5 | `family-access-matrix`, `family-circles-crud` |
