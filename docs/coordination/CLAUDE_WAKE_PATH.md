# Acionamento Cursor → Claude Code via GitHub (sem depender de pull local)

> **2026-09-18** — fecha a lacuna descoberta na `TASK-20260918-02`: quando a fila muda só no
> GitHub (PR mergeada, commit direto, automação Cursor cloud), o `fs.watch` local desta sessão
> não vê nada até alguém dar `git pull` neste checkout, ou até a sessão reabrir (`SessionStart`).
> Este caminho é **aditivo** — não substitui `fs.watch` nem `SessionStart`, é um terceiro gatilho
> redundante que funciona mesmo sem ninguém tocar a máquina local.

## Fluxo

```text
Cursor push/merge em docs/coordination/BACKEND_TASK_QUEUE.md (main)
    └─► GitHub Actions (.github/workflows/queue-to-claude-routine.yml)
          └─► POST /v1/claude_code/routines/{id}/fire (Claude Code Routine)
                └─► Routine (cloud) lê o payload (conteúdo da fila)
                      └─► SendMessage → sessão local "Desenvolvimento Backend"
                            └─► Claude Code local processa a tarefa normalmente
```

## Por que não dá para automatizar 100% via API

A criação de uma Routine só existe hoje pela UI (`claude.ai/code/routines`) — não há API pública
de criação (confirmado por engenharia reversa do endpoint interno, sem schema documentado). O
disparo (`/fire`) é público e documentado, mas exige um token por-routine gerado uma única vez na
UI. Por isso o setup abaixo tem 2 passos manuais que só o Rafael pode fazer.

## Setup único (Rafael)

1. Criar uma Routine em https://claude.ai/code/routines, repositório `RafaDru/aiyra-care`, com
   este prompt:

   > Você foi acionado via webhook porque `docs/coordination/BACKEND_TASK_QUEUE.md` mudou no
   > repositório RafaDru/aiyra-care. O campo `text` desta chamada contém o conteúdo atual do
   > arquivo. NÃO clone o repositório, NÃO edite nada, NÃO abra PR — sua única função é: 1) ler o
   > `text` recebido e identificar linhas da tabela com status `queued`; 2) usar a ferramenta
   > `SendMessage` para enviar uma mensagem para a sessão chamada `Desenvolvimento Backend`
   > relatando o(s) ID(s) de tarefa `queued` encontrados e um resumo da coluna Spec/Notas; 3) parar
   > imediatamente depois de enviar a mensagem. Se não houver nenhuma linha `queued`, apenas
   > finalize sem enviar mensagem nenhuma.

2. Na mesma Routine, em **Select a trigger → Add another trigger → API**, clicar **Generate
   token** (formato `sk-ant-oat01-...`, só aparece uma vez).
3. GitHub → Settings → Secrets and variables → Actions → adicionar:
   - `CLAUDE_ROUTINE_ID` — o id da routine (da URL `claude.ai/code/routines/<id>`).
   - `CLAUDE_ROUTINE_FIRE_TOKEN` — o token gerado no passo 2.

Sem esses dois secrets configurados, o workflow roda e sai silenciosamente (não quebra CI).

## Validação prevista (smoke cycle 3)

Enfileirar uma tarefa **só pelo GitHub** (push/PR/API do Cursor, sem ninguém tocar o checkout
local) e confirmar que a sessão `Desenvolvimento Backend` recebe a mensagem em segundos — sem
precisar de `git pull` nem reabertura de sessão.

## Referências

- `.github/workflows/queue-to-claude-routine.yml`
- `docs/coordination/CURSOR_RETURN_PATH.md` (mesmo padrão, direção oposta)
- `docs/CLAUDE_CODE_PARTNERSHIP.md`
