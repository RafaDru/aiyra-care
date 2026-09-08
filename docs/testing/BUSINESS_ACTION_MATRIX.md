# Matriz de ações de negócio — teste completo via UI

> **Última atualização:** 2026-09-08  
> **Definição de “teste completo”:** para cada **ação acionável** na interface, o tester executa o fluxo na tela — preferencialmente **Create → Read → Update → Delete** (CRUD) ou o ciclo equivalente (ex.: convite → aceite → revogar).

## O que entra vs fora (agora)

| Entra no teste completo | Fora (lane separada ou backlog) |
|-------------------------|----------------------------------|
| CRUD via UI de entidades do produto | Qualidade / correção de resposta **LLM** (Ava clínica, OCR) |
| Sync manual com modal + progresso (sem validar portal) | Login real em portal com **WAF** (Unimed/Amil) |
| Ava: abrir dock, enviar mensagem, conversa, pin, arquivar | Interpretação de **documento** com LLM (upload → laudo) |
| Export clínico / share link (criar + abrir) | Pentest, performance load |
| Compliance gate (aceitar termos) | B2B orgs (só API hoje) |

Hub Ava: [`AVA_QA_SCOPE.md`](./AVA_QA_SCOPE.md).

---

## Convenções do tester

| Regra | Detalhe |
|-------|---------|
| Prefixo massa | `QA-` em nomes criados (paciente, exame manual, thread…) |
| Cleanup | Ao final da suite, remover tudo que criou (`QA-*`) |
| Evidência | Resumo PASS/FAIL; screenshot só em falha |
| Uma suite = um domínio | Paralelo entre domínios — ver [`PARALLEL_QA_MODEL.md`](./PARALLEL_QA_MODEL.md) |

---

## Matriz por domínio

Legenda cobertura: ✅ suite existe · 🟡 parcial · ⬜ planejada · 🚫 fora de escopo UI

### Conta e acesso

| Ação UI | CRUD | Suite | Cobertura |
|---------|------|-------|-----------|
| Login / logout | — | `regression-smoke` | ✅ |
| Onboarding + perfil titular (`self`) | C | `onboarding-flow` | 🟡 |
| Compliance gate (aceite termos) | C | `onboarding-flow` | 🟡 |
| Dashboard listar pacientes | R | `core-patient-crud` | 🟡 |
| Criar / editar / excluir paciente | CRUD | `core-patient-crud` | 🟡 |
| Configurações conta | RU | `settings-account` | ⬜ |
| Aceitar termos / compliance | C | `onboarding-flow` | 🟡 |
| Família: convite, círculo, grants, profile share | CRUD | `family-access-matrix` | 🟡 |

### Perfil do paciente — abas

| Ação UI | CRUD | Suite | Cobertura |
|---------|------|-------|-----------|
| **Carteira** — visualizar plano / sync silencioso | R | `patient-wallet` | ⬜ |
| **Exames** — adicionar manual, editar, excluir | CRUD | `patient-exams-crud` | ⬜ |
| **Exames** — marcadores / dashboard | R | `patient-exam-markers` | ⬜ |
| **Documentos** — upload, visualizar, excluir | CRU(D) | `patient-documents-crud` | ⬜ |
| **Medicamentos** — adicionar, editar, desativar | CRUD | `patient-medications-crud` | ⬜ |
| **Vacinas** — registrar, editar, excluir | CRUD | `patient-vaccines-crud` | ⬜ |
| **Medidas / crescimento** — lançar, editar | CRU | `patient-measurements-crud` | ⬜ |
| **Timeline** — filtrar, agrupar | R | `patient-timeline` | ⬜ |
| **Linha do tempo / Encadeamento** (Neo4j) | R | `patient-graph-paths` | ⬜ |
| **Investigação / health thread** — wizard criar | C | `patient-health-thread` | ⬜ |
| **Integrações** — vincular plano, sincronizar (modal) | CRU | `integrations-link-sync` | 🟡 |
| **Convênios** — importar / vincular | C | `patient-insurance` | ⬜ |
| **Higienização** — resolver duplicata | RU | `hygiene-dedup-ui` | 🟡 |
| **Export clínico** — gerar + link compartilhado | C | `patient-clinical-export` | ⬜ |
| **Quem tem acesso** — grant / revogar | CRD | `family-access-matrix` | 🟡 |

### Ava (trilho próprio)

| Ação UI | CRUD | Suite | Cobertura |
|---------|------|-------|-----------|
| Abrir dock global | — | `ava-companion-smoke` | ⬜ |
| Selecionar lente de paciente | U | `ava-companion-smoke` | ⬜ |
| Nova conversa + mensagem simples | C | `ava-companion-smoke` | ⬜ |
| Resposta recebida (smoke, não qualidade) | R | `ava-companion-smoke` | ⬜ |
| Pin de entidade (acelerador) | C | `ava-entity-pin` | ⬜ |
| Arquivar / excluir conversa | D | `ava-conversation-crud` | ⬜ |
| Guardrail off-topic (bloqueio sem LLM) | R | `ava-guardrail-smoke` | ⬜ |
| Anexo imagem no chat | C | `ava-attachment-smoke` | ⬜ |
| **Fora:** qualidade clínica da resposta | — | — | 🚫 |

Ver [`AVA_QA_SCOPE.md`](./AVA_QA_SCOPE.md).

### Plataforma e ops

| Ação UI | CRUD | Suite | Cobertura |
|---------|------|-------|-----------|
| Reportar problema | C | `support-user-report` | 🟡 |
| Roadmap `/roadmap` | R | `regression-smoke` | ✅ |
| Ops console (interno) | R | `ops-health` | 🟡 |

### Portais externos (lane `integration-portal`)

| Portal | Ação | Suite |
|--------|------|-------|
| Amil | Sync com filtro período | `amil-sync-options` |
| Unimed | Sync manual | `unimed-sync-manual` ⬜ |
| Fleury / Pardini | OAuth + pedidos | `fleury-sync-manual` ⬜ |
| ConecteSUS | Import guiado | `sus-conectesus-import` ⬜ |

---

## Regressão: dois níveis

| Nível | Quando | Suites |
|-------|--------|--------|
| **`regression` (gate `main`)** | Todo push `main` | Smoke + `core-patient-crud` + verificação PG família |
| **`business-full`** | Preview / release / pedido “teste completo” | **Todas** as suites ✅/🟡 da matriz acima, em paralelo por domínio |

```powershell
# Gate rápido main
npm run qa:run-all -- --lane regression

# Teste completo de negócio (várias horas — paralelizar)
npm run qa:run-all -- --lane business-full
```

---

## Ritual ao entregar feature nova

1. Identificar linhas novas nesta matriz.
2. Criar/atualizar suite com **cada ação** CRUD.
3. Registrar em [`suites/index.json`](./suites/index.json) com `domain` + `businessActions[]`.
4. Se domínio Ava → seguir [`AVA_QA_SCOPE.md`](./AVA_QA_SCOPE.md).

---

## Roadmap de cobertura

Meta: todas as linhas ⬜ → 🟡 (suite manual) → ✅ (Playwright).

Épico: `qa-e2e-platform` + `qa-business-full-coverage` (a criar no roadmap).
