# Auditoria de desenvolvimento (Cursor hooks)

> **Última atualização:** 2026-09-03

Registro lastrável de sessões, edições e comandos shell disparados por agentes/IDE.

## Origem

Hooks em `.cursor/hooks.json` (pré/pós) — ver `docs/DELIVERY_PIPELINE.md` e `docs/CURSOR_AGENT_OPS.md`.

## Estrutura

| Pasta | Evento | Conteúdo |
|-------|--------|----------|
| `sessions/` | `sessionStart` | Início de sessão agente |
| `edits/` | `afterFileEdit` | Arquivo editado + ferramenta |
| `shell/` | `beforeShellExecution` | Comando terminal (antes de executar) |
| `tools/` | `preToolUse` | Ferramentas Write/StrReplace/Delete |

Arquivos: `YYYY-MM-DD.jsonl` (uma linha JSON por evento).

## Bridge staging (`run-dev-audit-bridge`)

Correlaciona estes logs com `product_events` no PostgreSQL (preview/staging):

```powershell
npm run dev-audit:bridge
# ou com janela customizada:
$env:DEV_AUDIT_BRIDGE_HOURS='48'; npm run dev-audit:bridge
```

Saída: `packages/api/scripts/output/dev-audit-bridge-last.json`

API ops (header `x-internal-ops-key`): `GET /ops/dev-audit-bridge?hours=24`

Sem PHI — apenas metadados (paths, nomes de eventos, contagens por hora).

## Política

- **Não** incluir PHI, tokens, corpo de prompts ou conteúdo de arquivos.
- Somente metadados: timestamp, path, nome da ferramenta, comando shell.
- Commits podem incluir estas linhas — são metadados de processo, não dados clínicos.

## Guard-rails ativos

- Bloqueio de edição em `.env` e padrões de credenciais (`preToolUse`).
- Bloqueio de `git push --force`, `reset --hard`, `rm -rf` (`beforeShellExecution`).
- Pedido de confirmação para `git commit`, `git push`, `npm publish`.
