# Sistema de documentação e tracking — AiyraCare

> **Última atualização:** 2026-09-03  
> **Objetivo:** qualquer pessoa (ou LLM/Ava) entender **para quê** existe cada parte do produto **sem ler código**, com rastreio de negócio e entrega alinhados.

## Resposta direta: GitHub Projects vs `.md`?

| Abordagem | Papel | Usar como fonte primária? |
|-----------|-------|---------------------------|
| **`docs/roadmap.json`** | Status de épicos/itens (done/planned), prioridade, badges de revisão | **Sim** — entrega |
| **`docs/features/*.md`** | Ficha por capacidade de produto (o quê, por quê, rotas, APIs, links) | **Sim** — significado |
| **Docs de domínio** (`DATA_HYGIENE.md`, `AVA_VISION.md`, …) | Profundidade técnica/regulatória de uma área | **Sim** — design |
| **`docs/project-context.json`** | Snapshot curado para `GET /project/context` e agentes | **Sim** — máquina |
| **`docs/help/*.md`** | FAQ / ajuda in-app / base Ava | **Sim** — usuário |
| **GitHub Projects / Issues** | Kanban, discussão, PRs, milestones | **Não** — espelho operacional |
| **`.md` por componente React** | — | **Não** — drift rápido, ruído |

**Conclusão:** não “tombamos” a documentação para fora do repo. O GitHub Projects **complementa** com workflow humano; o **repositório permanece a fonte de verdade semântica**. Cada issue/PR deve referenciar um `id` do roadmap (`family-access-model`, `hygiene-neo4j-candidate`, …) via label ou corpo.

---

## Camadas (3 tiers + histórico)

```
┌─────────────────────────────────────────────────────────────┐
│  Tier 0 — ENTREGA          docs/roadmap.json + UI /roadmap   │
├─────────────────────────────────────────────────────────────┤
│  Tier 1 — SIGNIFICADO      docs/features/<id>.md             │
│                            docs/features/index.json          │
├─────────────────────────────────────────────────────────────┤
│  Tier 2 — PROFUNDIDADE     docs/<DOMÍNIO>.md (já existentes) │
├─────────────────────────────────────────────────────────────┤
│  Tier 3 — AJUDA / AVA      docs/help/<tópico>.md             │
├─────────────────────────────────────────────────────────────┤
│  Histórico                 docs/HISTORICO.md (decisões datadas)│
│  Máquina                   docs/project-context.json         │
└─────────────────────────────────────────────────────────────┘
```

### Quando criar uma feature card?

Crie `docs/features/<roadmap-item-id>.md` quando:

- Há **valor de negócio** visível ao usuário, ou
- É **épico técnico** que outras features dependem (ex.: higienização, classificador), ou
- Agentes precisam de contexto sem abrir 10 arquivos.

**Não** crie por tela ou componente isolado — agrupe por **capacidade** (“Sincronizar Amil com filtro”, não `IntegrationsTab.tsx`).

### Template

Copie [`docs/features/_TEMPLATE.md`](./features/_TEMPLATE.md) e registre em [`docs/features/index.json`](./features/index.json).

---

## Fluxo de manutenção (obrigatório ao entregar)

1. Atualizar item em **`docs/roadmap.json`** (`status`, `detail`).
2. Criar ou atualizar **`docs/features/<id>.md`**.
3. Entrada em **`docs/features/index.json`**.
4. Se decisão arquitetural: linha em **`docs/HISTORICO.md`**.
5. Se domínio amplo mudou: doc de domínio + **`docs/project-context.json`**.
6. Se afeta usuário: tópico em **`docs/help/`** (opcional no MVP).
7. PR/issue: label `roadmap:<item-id>`.

---

## Sobrevivência à compactação de contexto

A compactação **apaga** instruções que existiam só no chat. O ritual permanece via:

| Mecanismo | Quando | Efeito |
|-----------|--------|--------|
| `.cursor/rules/agent-bootstrap.mdc` | Sempre (`alwaysApply`) | Regra curta no contexto do agente |
| `docs/AGENT_BOOTSTRAP.md` | Fonte canônica do índice | Lido por hooks e humanos |
| Hook `sessionStart` | Nova sessão Composer | `additional_context` com bootstrap completo |
| Hook `preCompact` + `postToolUse` | Após compactação | Flag → re-injeta bootstrap na **próxima** ferramenta |
| Hook `afterFileEdit` (doc-ritual) | Edição em `packages/` produto | Marca ritual pendente se docs não tocados |
| Hook `stop` | Fim do turno agente | `followup_message` se ritual pendente |

Estado efêmero (não commitar): `.cursor/state/*.json`

## GitHub Projects (uso recomendado)

| Campo no Project | Mapeia para |
|------------------|-------------|
| Coluna (Backlog / In progress / Done) | `status` no roadmap (manual sync ou automação futura) |
| Issue title | Título humano |
| Label `roadmap:xxx` | `items[].id` em `roadmap.json` |
| Link para PR | Entrega técnica |

O Project **não substitui** a feature card — evita perder o “por quê” quando a issue for fechada.

---

## Ava e economia de contexto

Ordem de leitura para agentes (já em `AGENTS.md`):

1. `GET /project/context` ou `docs/project-context.json`
2. `docs/features/index.json` → achar `id` relevante
3. `docs/features/<id>.md` da feature em questão
4. Doc de domínio linkado (`seeAlso`)
5. Código só se necessário

Futuro (roadmap `ava-help-knowledge-base`): expor `docs/help/*` via API read-only para RAG da Ava, com `helpTopic` nos aceleradores.

---

## Índice navegável

- Hub geral: [`docs/README.md`](./README.md)
- Features: [`docs/features/README.md`](./features/README.md)
- Ajuda: [`docs/help/README.md`](./help/README.md)
- Roadmap humano: [`docs/ROADMAP.md`](./ROADMAP.md)

---

## Relacionado

- [`DELIVERY_PIPELINE.md`](./DELIVERY_PIPELINE.md) — gates de promoção
- [`FEATURE_REVIEW_FRAMEWORK.md`](./FEATURE_REVIEW_FRAMEWORK.md) — tier 0–3 antes de merge
- [`CURSOR_AGENT_OPS.md`](./CURSOR_AGENT_OPS.md) — hooks e auditoria
