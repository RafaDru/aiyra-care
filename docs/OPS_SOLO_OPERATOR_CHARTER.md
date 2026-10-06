# Carta do operador solo — AiyraCare

**Status:** canônico · **Vigência:** 2026-10-06 (Rafael Drummond)  
**Audiência:** humanos, agentes Cursor, automations, reviewers internos

Este documento tem precedência sobre runbooks que ainda digam «Rafael faz merge», «aprova PR» ou «checklist no notebook para o operador».

---

## 1. Contexto do projeto

| Fato | Implicação para agentes |
|------|-------------------------|
| **Um único humano** (Rafael) no projeto | Não há time de engenharia, SRE ou QA humano de plantão |
| **Sem receita** que sustente operação full-time | Priorizar automação e custo de atenção zero no humano |
| **Viabilidade via produção agêntica** | O produto existe porque ferramentas como agentes de código permitem implementação **em larga escala e estruturada** — preservar esse modelo na documentação e nas decisões (não «voltar» a fluxos que exijam humano em cada PR) |

---

## 2. Papel do humano (Rafael)

**Somente:**

- Decisões **estratégicas** de produto
- Decisões **arquiteturais** ou **técnicas** quando há **escolha de direção** (trade-off, política, escopo)

**Explicitamente fora do escopo humano:**

- Merge de PRs (GitHub ou equivalente)
- Abrir/revisar PRs linha a linha
- Análise de diff ou code review manual
- Checklists operacionais no notebook (pull, migração, restart, webhook, `qa:run`) — **agentes e automations**
- Triagem diária no CH, reenfileirar correção, marcar estados operacionais rotineiros

O humano **não** é gate de entrega técnica. Ele é gate de **intenção** e **política**.

---

## 3. Papel agêntico (obrigatório)

Toda **atividade técnica executável** deve ser feita por:

- Agentes Cursor (cloud, notebook worker, Project)
- Cursor Automations (triagem, correção, revisão PR)
- CI + scripts do monorepo (`test:critical`, `qa:run`, `promotion:gates`)

Inclui, sem exceção rotineira:

| Atividade | Responsável |
|-----------|-------------|
| Implementação, testes, docs de entrega | Agente |
| Commit, push, abrir/atualizar PR | Agente |
| Rebase, fix CI, responder review bot | Agente |
| **Merge em `main`** quando gates passarem | **Agente** (não pedir ao Rafael) |
| Notebook: pull, migrações, restart serviços, configurar webhook quando documentado | Agente (notebook worker / cloud com acesso) |
| CH: fluxo INC→DEF→correção→review→fechamento | Automations + agentes; humano só se §2 |

**Proibido** nas mensagens e runbooks para o Rafael: «faça merge», «revise a PR», «rode no notebook os passos 1–9», «aprove G3» como tarefa humana — traduzir em trabalho agêntico ou automation.

---

## 4. CH e «G3»

- **GitHub merge:** sempre agêntico após CI + revisão Agent 3 + política do repositório (sem automerge silencioso em produção sem testes — ver `CH_DEFECT_PIPELINE_DECISIONS.md`).
- **«Aprovar para merge» no CH (UI):** passo operacional a ser **automatizado** (callback, automation ou agente) quando `recommendation=approve` e política CI satisfeita — não depender de clique humano. Até existir automation dedicada, **agente com acesso ops** executa a ação via API CH, não o Rafael.

O humano mantém veto apenas por **decisão estratégica** explícita (ex.: «pausar merges desta semana»), não por revisão de código.

---

## 5. O que pedir ao humano

Formular como **decisão**, não como análise:

- «Allowlist de telemetria: todas as rotas ou faseada?»
- «Gate G3 hard (`CH_G3_REQUIRE_REVIEW_APPROVE=1`) em prod solo?»
- «Prioridade: ops CH vs feature X?»

Não formular:

- «Confirma o merge?»
- «Pode rodar mig 086?»
- «Revisa o diff da #114?»

---

## 6. Referências

- [`docs/ops-agentic-operating-model.md`](./ops-agentic-operating-model.md) — CH e notebook
- [`docs/ops/CH_AUTONOMOUS_OPS_STACK.md`](./ops/CH_AUTONOMOUS_OPS_STACK.md) — pipeline ops
- [`docs/DELIVERY_PIPELINE.md`](./DELIVERY_PIPELINE.md) — gates antes de merge agêntico
- Project store: `preferences.md` + `principles/solo-operator-agentic.md`
- Regra Cursor: `.cursor/rules/solo-operator-agentic.mdc`
