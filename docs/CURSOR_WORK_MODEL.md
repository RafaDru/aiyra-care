# Modelo de trabalho Cursor — resumo (AiyraCare)

> **Versão resumida** · spec completa no **Project Context** (aba Context do Project) ou store: `cursor-work-model-improvements-spec.md`  
> Charter inalterado: [`OPS_SOLO_OPERATOR_CHARTER.md`](./OPS_SOLO_OPERATOR_CHARTER.md)

## Papéis

| Quem | Faz |
|------|-----|
| **Rafael** | Produto, jurídico, arquitetura, política; AC-1 paste Automation; abertura beta pública |
| **Cloud Agent** | Implementação, PR tier 0–2, docs, merge se CI verde, pré-voo QA |
| **My Machines (`NotebookRafael`)** | Stack real (PG, Supabase local), Playwright J1, `qa:run-all --lane regression`, CH ops rotineiro |
| **Automations (Cursor UI)** | SRE/support/backend — prompt **espelha** arquivos em `docs/` |

## Lanes (Project `notes.md`)

| Tag | Escopo | DoD |
|-----|--------|-----|
| `#produto` | MVP beta, Anel A/B, landing, J1, go-live checklist | Tier ≥1: E2E real (CI `e2e-regression` **ou** notebook `QA_TEST_*` PASS) |
| `#ops` | CH, alertas, env, scrape gates, automations, dev-audit | `test:ops` / smoke ops quando aplicável |

**Proibido** na mesma PR: produto Anel B + refactor CH grande.

## Fluxo padrão

```
Queued → Cloud (branch cursor/<feat>-<suffix>) → PR → CI
  → merge agêntico se verde
  → notebook validate (tier ≥1 ou checklist manual)
  → Done no notes.md
```

Estados Project: **Queued** · **For Review** (PR ou ação humana) · **Done** (merged + validação da lane).

## Agentes e ferramentas

| Regra | Detalhe |
|-------|---------|
| Default implementador | Cloud VM, branch própria |
| `explore` | Kickoff de waves ≥3 pacotes ou onboarding+API |
| `ci-investigator` | Um subagent por check CI vermelho |
| `computerUse` | Só **My Machines** — não substitui notebook Windows |
| `cursor-subscriptions` | Pós-PR tier ≥1 — CI, não polling manual |

## Skills a criar (P1)

| Skill | Gatilho |
|-------|---------|
| `aiyracare-wave-closeout` | Fechar fila AC-n, PRs superseded, notes, HISTORICO |
| `aiyracare-mvp-go-live` | Pilares `MVP_GO_LIVE_CHECKLIST.md` |
| `aiyracare-qa-notebook` | Migrations, `QA_TEST_*`, `qa:run` / `qa:run-all` |

Manter: `aiyracare-feature-release` + reviews — tier 2–3 only.

## Contexto vivo (P0 hábito)

| Artefato | Uso |
|----------|-----|
| [`FOCO_ATUAL.md`](./FOCO_ATUAL.md) | Duas frentes MVP + Ops |
| [`project-context.json`](./project-context.json) / `GET /project/context` | 1× por sessão wave grande |
| [`AGENT_BOOTSTRAP.md`](./AGENT_BOOTSTRAP.md) | Índice pós-compactação |

Hooks: manter bootstrap, stop ritual QA/docs, RTK bypass QA — ver `.cursor/hooks.json`.

## Referências

- QA: [`testing/QA_PROCESS.md`](./testing/QA_PROCESS.md)
- Paralelo: [`PARALLEL_WORK.md`](./PARALLEL_WORK.md)
- Go-live: [`product/MVP_GO_LIVE_CHECKLIST.md`](./product/MVP_GO_LIVE_CHECKLIST.md)
- Workspace: [`CURSOR_WORKSPACE.md`](./CURSOR_WORKSPACE.md)
