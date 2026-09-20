# Volta automatizada — Claude Code → Cursor (sem Rafael)

> **2026-09-18** — Rafael opera só via agentes; a volta não pode depender de merge manual na UI.

## Fluxo alvo

```text
Claude termina backend
    ├─► Atualiza fila → review (+ PR draft)
    ├─► (opcional) POST webhook handoff — mesmo payload do GitHub Action
    └─► GitHub: PR task/* → Actions dispara webhook
              └─► Cursor Automation «Backend handoff»
                    └─► Cloud agent: revisar PR, CI, contrato, merge tier-0, fila done
```

## Gatilhos (redundantes — qualquer um aciona)

| # | Gatilho | Quem configura |
|---|---------|----------------|
| 1 | `pull_request` → `main`, head `task/**` ou título `[TASK-*` | GitHub Actions (`.github/workflows/backend-task-handoff.yml`) |
| 2 | `push` → `main`, path `docs/coordination/BACKEND_TASK_QUEUE.md` com linha `review` | Mesmo workflow (job `queue-watch`) |
| 3 | POST `backend_task_handoff` | Claude CLI / script local (mesma URL/key dos secrets GH) |

Rafael **não** precisa abrir PR, Project ou Claude — só secrets uma vez no GitHub.

## Payload (`type: backend_task_handoff`)

```json
{
  "type": "backend_task_handoff",
  "taskId": "TASK-20260918-01",
  "prUrl": "https://github.com/RafaDru/aiyra-care/pull/32",
  "prNumber": 32,
  "branch": "task/20260918-01-coordination-queue-smoke",
  "queueStatus": "review",
  "trigger": "github_actions|claude_cli|queue_push",
  "repo": "RafaDru/aiyra-care",
  "submittedAt": "ISO-8601"
}
```

## O que o agente Cursor faz (playbook)

1. Ler fila + PR + diff (só `packages/api`, `packages/connect*`, workers, migrations).
2. Confirmar CI verde no PR.
3. **Tier smoke / test-only / docs:** merge squash (bot com permissão) ou marcar pronto + merge se policy exigir.
4. **Mudança de contrato ou web:** não mergear — abrir/atualizar trabalho Cursor em `packages/web` ou enfileirar follow-up na fila como `queued` para si.
5. Atualizar fila `done` + link PR merged (commit em `main` ou comentário no PR).
6. **Não** pedir input ao Rafael salvo `blocked` legal/segurança.

## Secrets GitHub (repo)

| Secret | Uso |
|--------|-----|
| `CURSOR_BACKEND_HANDOFF_WEBHOOK_URL` | URL da Automation «AiCare - Backend handoff» |
| `CURSOR_BACKEND_HANDOFF_WEBHOOK_KEY` | Bearer `crsr_...` |

Mesmos valores no ambiente Claude (`.env` local) para o CLI na volta.

## Setup único (Rafael uma vez)

A UI do Cursor **não** tem «Import JSON» — crie a Automation manualmente:

1. **Cursor → Automations → New automation**
2. **Nome:** `AiCare - Backend handoff (Claude→Cursor)` (ou `AiCare - Backend handoff`)
3. **Trigger:** **Webhook**
4. **Repository:** `RafaDru/aiyra-care` · branch **`main`**
5. **Prompt:** copie o bloco `instructions:` de `.cursor/automations/backend-task-cursor-handoff.yaml`  
   (espelho legível; o arquivo `backend-task-cursor-handoff.workflow.json` é **só referência**)
6. **Salvar** → copie a **URL do webhook** e o **auth header** (`crsr_...`)
7. **GitHub** → Settings → Secrets and variables → Actions:
   - `CURSOR_BACKEND_HANDOFF_WEBHOOK_URL` = URL do passo 6
   - `CURSOR_BACKEND_HANDOFF_WEBHOOK_KEY` = token `crsr_...` (Bearer, sem prefixo `Bearer `)
8. **Claude / `.env` local:** mesmos valores para POST redundante na volta (ver `docs/CLAUDE_CODE_PARTNERSHIP.md`)

Detalhes e outras lanes: `.cursor/automations/README.md`

## Project coordinator (este chat)

Opcional: subscription `subscribe_github_pr` scope `repo` para visibilidade. A **execução** da volta fica na Automation + Actions (não depende deste chat estar aberto).

## Referências

- `docs/ops/automations/backend-task-cursor-handoff.prompt.md`
- `.github/workflows/backend-task-handoff.yml`
