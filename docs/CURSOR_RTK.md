# RTK no AiyraCare — compressão de saída sem perder qualidade

> **Última atualização:** 2026-10-02  
> [RTK](https://github.com/rtk-ai/rtk) reescreve comandos de shell (`git status` → `rtk git status`) para reduzir tokens na saída. No monorepo usamos um modelo **conservador**: RTK ligado por padrão, com **bypass** onde a saída integral é parte do Definition of Done ou do debug.

## Onde está configurado

| Artefato | Função |
|----------|--------|
| `.cursor/hooks/pre-tool-shell-rtk.mjs` | Hook `preToolUse` (matcher `Shell`) — reescrita via `rtk rewrite` |
| `.cursor/hooks/lib/rtk-bypass.mjs` | Lista de comandos **sem** RTK |
| `scripts/install-rtk.sh` | Binário em `.local/bin/rtk` (Linux musl; Cloud/local) |
| `.cursor/hooks/before-shell.mjs` | Inalterado — auditoria, deny/ask, ritual QA |

Ordem: `pre-tool-guard` (Write) → `pre-tool-shell-rtk` (Shell). Política destrutiva e `qa:run` continuam no `beforeShellExecution`.

## Instalação

**Linux (Cloud Agent / CI / WSL):**

```bash
bash scripts/install-rtk.sh
```

**macOS (My Machines / Rafael):** `cargo install rtk` ou release GitHub; garantir `rtk >= 0.23` no `PATH`. O hook usa `.local/bin/rtk` se existir, senão `rtk` do sistema.

**Cloud Environment:** acrescente ao `install` do `.cursor/environment.json` (quando existir no Portal):

```bash
bash scripts/install-rtk.sh
```

Agentes que bootam de snapshot sem RTK ainda funcionam — o hook faz passthrough silencioso.

## Modelo «ideal» (sem perda de qualidade)

### RTK **ligado** (economia segura)

- `git log`, `git diff`, `npm ls`, logs repetitivos, probes HTTP, `rg`/`grep` grandes, etc.
- Investigação exploratória onde um resumo estruturado basta.

### RTK **desligado** (bypass automático)

Definido em `rtk-bypass.mjs`:

- Suites QA: `qa:run`, `qa:run-all`, `qa-suite.mjs`
- E2E: `playwright`, `test:e2e`
- Testes unitários/integração: `vitest`, `npm run test`, `test:critical`, `test:ops`
- Build/typecheck: `npm run build`, `tsc`
- Gates: `promotion:gates`, `OPS_SMOKE_FULL=1`
- Logs de environment build (Cursor cloud)

### Bypass manual (debug / root cause)

Prefixe o comando ou exporte no shell:

```bash
AIYRA_NO_RTK=1 npm run something
```

Agentes: em falhas obscuras, **não** confiar em saída comprimida — usar `AIYRA_NO_RTK=1` e reler stdout integral.

## Auditoria

Reescritas e bypasses em `docs/dev-audit/rtk/YYYY-MM-DD.jsonl`.

## My Machines vs Cloud

| Ambiente | RTK |
|----------|-----|
| **My Machines** | Instalar localmente (`install-rtk.sh` ou cargo); hooks do repo aplicam. |
| **Cloud Agent** | Mesmos hooks; precisa `install-rtk.sh` no environment build ou rodar uma vez no agente. |

## Referência upstream

Script oficial (delegamos à mesma API `rtk rewrite`):  
https://github.com/rtk-ai/rtk/blob/master/hooks/cursor/rtk-rewrite.sh
