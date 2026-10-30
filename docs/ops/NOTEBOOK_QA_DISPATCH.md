# Dispatch notebook QA — Project coordinator

> **2026-10-30** — `Task` + `selfHostedWorkerId` **não** roteia para My Machines; filho nasce em Cloud (`usePrivateWorker: false`). Evidência: [Notebook J1 beta QA](bc-4c651059-5bd1-55b3-b02a-827b5c512568).

## Opção A — REST v1 (automação externa)

```http
POST https://api.cursor.com/v1/agents
```

```json
{
  "prompt": { "text": "Execute ritual em docs/product/BETA_PREP_WITHOUT_BRAND_LOCK.md + skill aiyracare-qa-notebook no checkout local." },
  "repos": [{ "url": "https://github.com/RafaDru/aiyra-care", "startingRef": "main" }],
  "env": { "type": "machine", "name": "NotebookRafael" }
}
```

Worker CLI: `agent worker start --name "NotebookRafael"` no notebook.

## Opção B — Project `CreateAgent` (coordenador)

Quando a tool estiver disponível no coordinator:

```json
{
  "machine": {
    "type": "self_hosted_worker",
    "worker_id": "<workerId de cursor-cloud list-self-hosted-workers>"
  }
}
```

Usar **`workerId`** `84e4c857-0352-4fe2-85a7-fca87edf7cf8` (NotebookRafael), **não** `machineId`.

**Não usar:** `Task` com `selfHostedWorkerId` (ignorado nesta build).

## Opção C — Chat manual (Rafael)

Cursor → novo agent → ambiente **My Machines** → **NotebookRafael** → colar ritual de [`BETA_PREP_WITHOUT_BRAND_LOCK.md`](../product/BETA_PREP_WITHOUT_BRAND_LOCK.md) § Ritual notebook.

## Verificação

Filho deve reportar `usePrivateWorker: true` (cursor-cloud `run-info`) e shell Windows em `C:\Users\rafae\workspace\aiyra-care`.

## Referências

- [`CURSOR_WORKSPACE.md`](../CURSOR_WORKSPACE.md)
- [`aiyracare-qa-notebook`](../../.cursor/skills/aiyracare-qa-notebook/SKILL.md)
- Cursor: [My Machines](https://cursor.com/docs/cloud-agent/self-hosted/my-machines)
