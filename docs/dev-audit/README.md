# Auditoria de desenvolvimento (Cursor hooks)

> **Última atualização:** 2026-10-29

Registro lastrável de sessões, edições e comandos shell disparados por agentes/IDE — **somente na máquina local** (ou VM de dev). Não versionar os arquivos `.jsonl`.

## Origem

Hooks em `.cursor/hooks.json` (pré/pós) — ver `docs/DELIVERY_PIPELINE.md` e `docs/CURSOR_AGENT_OPS.md`.

## Estrutura

| Pasta | Evento | Conteúdo |
|-------|--------|----------|
| `sessions/` | `sessionStart` | Início de sessão agente (+ bootstrap injetado) |
| `compaction/` | `preCompact` | Compactação de contexto (uso %, trigger) |
| `doc-ritual/` | `afterFileEdit` / `stop` | Ritual de docs pendente ou follow-up |
| `qa-ritual/` | hooks QA | Toque em suite doc / execução / stop follow-up |
| `edits/` | `afterFileEdit` | Arquivo editado + ferramenta |
| `shell/` | `beforeShellExecution` | Comando terminal (antes de executar) |
| `tools/` | `preToolUse` | Ferramentas Write/StrReplace/Delete |
| `rtk/` | `pre-tool-shell-rtk` | Reescrita RTK / bypass QA |

Arquivos gerados: `YYYY-MM-DD.jsonl` (uma linha JSON por evento). Pastas vazias usam `.gitkeep`; **não commitar** `*.jsonl` (entrada em `.gitignore`).

## Rotação (sugestão)

- **Semanal:** apagar ou arquivar localmente JSONL com mais de ~30 dias (por pasta ou `find docs/dev-audit -name '*.jsonl' -mtime +30`).
- Antes de limpar, opcional: rodar o bridge (abaixo) se quiser correlacionar com telemetria no PG.

## Bridge staging (`dev-audit:bridge`)

Correlaciona estes logs **locais** com `product_events` no PostgreSQL (preview/staging):

```powershell
npm run dev-audit:bridge
# ou com janela customizada:
$env:DEV_AUDIT_BRIDGE_HOURS='48'; npm run dev-audit:bridge
```

Saída: `packages/api/scripts/output/dev-audit-bridge-last.json`

API ops (header `x-internal-ops-key`): `GET /ops/dev-audit-bridge?hours=24`

Sem PHI — apenas metadados (paths, nomes de eventos, contagens por hora). Ver também `docs/ops/TELEMETRY.md`.

## Política

- **Não commitar** arquivos `docs/dev-audit/**/*.jsonl` — ruído em PRs e diffs irrelevantes para o produto.
- **Não** incluir PHI, tokens, corpo de prompts ou conteúdo de arquivos nos eventos.
- Somente metadados: timestamp, path, nome da ferramenta, comando shell (truncado nos hooks).

## Guard-rails ativos

- Bloqueio de edição em `.env` e padrões de credenciais (`preToolUse`).
- Bloqueio de `git push --force`, `reset --hard`, `rm -rf` (`beforeShellExecution`).
- Pedido de confirmação para `git commit`, `git push`, `npm publish`.
