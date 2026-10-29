# Cursor Cloud Agent — snapshot de ambiente para E2E/QA

> **Última atualização:** 2026-10-29  
> **Epic:** P0-5 — ambiente reprodutível na VM Cloud **sem secrets no git**  
> **Relacionado:** [`docs/CURSOR_WORK_MODEL.md`](../CURSOR_WORK_MODEL.md) · [`docs/CURSOR_RTK.md`](../CURSOR_RTK.md) · [`docs/testing/AUTH_TESTING.md`](../testing/AUTH_TESTING.md)

## Objetivo

Permitir que **Cloud Agents** subam rápido com:

| Camada | O que fica no snapshot / build | O que **não** vai para o repositório |
|--------|--------------------------------|--------------------------------------|
| **Base + `install`** | Node 22 toolchain, `npm ci` no monorepo, Playwright browsers (se necessário), **RTK opcional** ([`scripts/install-rtk.sh`](../../scripts/install-rtk.sh)) | — |
| **`start` (cada boot)** | PostgreSQL local (`aiyracare`), API `:3010`, web `:5173` (ou script Linux equivalente ao ritual notebook) | — |
| **Credenciais** | — | `QA_TEST_*`, Supabase, `CRYPTO_KEY`, etc. → **Cursor Environment secrets** (Portal) |

O snapshot **não substitui** o Definition of Done E2E tier ≥1 no notebook ou CI — ver tabela [Notebook vs snapshot](#notebook-vs-snapshot-decisão-por-dod).

## Princípios

1. **Zero secrets commitados** — só nomes de variáveis em docs e `.env.example`; valores em [Environment settings](https://cursor.com/docs/cloud-agent/settings) do Project/Environment.
2. **`install` idempotente** — lockfiles do `main`; roda no build pod, entra no snapshot.
3. **`start` por boot** — daemons e dev servers; nunca no `install` (processos não sobrevivem ao snapshot).
4. **RTK opcional** — economia de tokens nos hooks; bypass automático em `qa:run` / Playwright ([`docs/CURSOR_RTK.md`](../CURSOR_RTK.md)).

## Ritual agente (ferramentas `cursor-cloud`)

Use o MCP **`cursor-cloud`** no agente de setup (ou Rafael no Portal). Ordem recomendada:

| Passo | Ferramenta | Propósito |
|-------|-----------|-----------|
| 0 | [`environment-info`](https://cursor.com/docs/cloud-agent/setup) (`cursor-cloud-environment-info`) | `environmentJsonPath`, build ativo, egress, repos ligados |
| 1 | Descoberta local | `AGENTS.md`, `scripts/up.ps1` (referência), `.env.example`, [`aiyracare-qa-notebook`](../../.cursor/skills/aiyracare-qa-notebook/SKILL.md) |
| 2 | Iterar `install` / `start` | Shell na VM até `3010/health` + migrações aplicáveis |
| 3 | `cursor-cloud-trigger-environment-build` | Build draft a partir do `environment.json` proposto |
| 4 | `cursor-cloud-environment-build-logs` | Falha de `install` → corrigir e retrigger |
| 5 | Subagente boot do build | Validar stack + smoke (`npm run test:critical` ou suite tier 0) |
| 6 | `cursor-cloud-take-environment-snapshot` + `cursor-cloud-check-environment-snapshot` | Disco congelado após validação local |
| 7 | `cursor-cloud-propose-environment-json` | Card **Save** no Portal (associa build/snapshot ao Environment) |

Documentação upstream: [Cloud Agent setup](https://cursor.com/docs/cloud-agent/setup) · schema [`environment.schema.json`](https://cursor.com/schemas/environment.schema.json).

### Fallback humano / My Machines

Se Cloud setup falhar (egress Supabase, Playwright pesado, CH `:3013`), seguir o skill **[`aiyracare-qa-notebook`](../../.cursor/skills/aiyracare-qa-notebook/SKILL.md)** — pull, migrações, `up.ps1`, `QA_TEST_*` em `.env.e2e.local`, `npm run qa:run` / `qa:run-all --lane regression` com `AIYRA_NO_RTK=1` em debug.

## Checklist — o que fixar no `environment.json`

Confirmar `environmentJsonPath` via `environment-info` antes de editar o arquivo certo (pode ser `.cursor/environment.json` ou path gravado no Environment).

### Base image

- [ ] Preferir **imagem default Cursor** (`ubuntu` + Node) até faltar pacote de SO.
- [ ] Se precisar PG no SO: Dockerfile em `.cursor/` com `postgresql`, `git`, `curl` — **não** copiar o monorepo inteiro para a imagem.

### Campo `install` (snapshot)

- [ ] `npm ci` na raiz do monorepo (workspaces `packages/*`).
- [ ] Playwright: `cd packages/web && npx playwright install --with-deps chromium` **somente** se suites E2E forem rodadas na Cloud (aumenta tempo de build).
- [ ] RTK (opcional): `bash scripts/install-rtk.sh` — ver [`docs/CURSOR_RTK.md`](../CURSOR_RTK.md).
- [ ] **Não** rodar migrações destrutivas nem `qa:create-test-user` no `install` (dependem de PG up + secrets).

### Campo `start` (cada agent boot)

- [ ] Subir PostgreSQL (`service postgresql start` ou equivalente) + `pg_isready`.
- [ ] Garantir database `aiyracare` e `DATABASE_URL=postgresql://postgres:postgres123@127.0.0.1:5432/aiyracare` (dev-only; **não** é secret — alinhado a [`AGENTS.md`](../../AGENTS.md)).
- [ ] Aplicar migrações pendentes (scripts `apply-migration-NNN.mjs` conforme [`FOCO_ATUAL.md`](../FOCO_ATUAL.md)).
- [ ] API + web em foreground ou tmux (`packages/api` `npm run dev`, `packages/web` `npm run dev`) — espelhar portas `3010` / `5173`.
- [ ] Script idempotente (skip se porta já escuta); logs em `/tmp/cursor/start-user/start-user.log`.

### Campos úteis

- [ ] `"user": "ubuntu"` se Dockerfile custom (usuário deve existir na imagem).
- [ ] `ports`: expor `3010`, `5173` se UI/browser na Cloud.
- [ ] `egressMode` / allowlist se MCP Supabase ou APIs externas no QA.
- [ ] **Não** usar `terminals` sem `start`; preferir tmux dentro de `start` ([env-setup skill](https://cursor.com/docs/cloud-agent/setup)).

### Exemplo esqueleto (sem secrets — ajustar após primeiro build verde)

```json
{
  "name": "AiyraCare integração (QA)",
  "user": "ubuntu",
  "install": "npm ci && bash scripts/install-rtk.sh",
  "start": "bash scripts/cloud-agent-start.sh"
}
```

> **`scripts/cloud-agent-start.sh`** — criar em PR follow-up quando o ritual Linux estiver estabilizado; até lá, inline mínimo no Portal durante setup agent-led.

## Secrets — Cursor Environment (Portal)

Configurar em **Settings → Cloud → Environment → Secrets** (nunca no git).

| Secret / env | Uso QA Cloud |
|--------------|----------------|
| `QA_TEST_EMAIL` / `QA_TEST_PASSWORD` | Playwright login — [`AUTH_TESTING.md`](../testing/AUTH_TESTING.md) |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Web auth |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE` | API + `npm run qa:create-test-user` |
| `CRYPTO_KEY` | Sync / credenciais integração (hex 64) |
| Demais de [`.env.example`](../../.env.example) | Conforme suite (LLM Ava, ops keys, etc.) |

Na VM, o agente materializa `.env` na raiz e/ou exporta vars antes de `qa:run` — **sem** escrever secrets em arquivos trackados. Para E2E, Playwright lê `process.env.QA_TEST_*` ([`packages/web/e2e/helpers/env.ts`](../../packages/web/e2e/helpers/env.ts)).

## Notebook vs snapshot — decisão por DoD

Alinhado a [`CURSOR_WORK_MODEL.md`](../CURSOR_WORK_MODEL.md) (lanes `#produto` / `#ops`).

| Situação | Preferir **My Machines (`NotebookRafael`)** | Preferir **Cloud snapshot** |
|----------|-----------------------------------------------|-------------------------------|
| **DoD tier ≥1** (E2E real pós-merge) | **Sim** — `qa:run` / `qa:run-all --lane regression` ou CI `e2e-regression` | **Não** sozinho — pré-voo Cloud não fecha DoD |
| **Implementação + PR tier 0–2** | Opcional | **Sim** — deps + PG já no boot |
| **Pré-voo `qa:run` antes do merge** | Se worker local livre | **Sim** — acelera feedback se secrets Portal OK |
| **CH ops `:3013`, automations Windows, scrape CDP** | **Sim** | Não (stack ops não é alvo do snapshot MVP) |
| **Tier 0** (docs, scripts ops sem produto) | Opcional | **Sim** — `test:critical` / `test:ops` na VM |
| **Debug flake E2E / migração** | **Sim** — `AIYRA_NO_RTK=1`, PG real, hooks locais | Snapshot só se reproduzir bug Linux puro |
| **Regressão gate `main`** | Notebook **ou** CI | Cloud snapshot **+** CI — não substitui notebook/CI |

**Regra curta:** snapshot = **velocidade e paridade Linux** para codar e pré-voo; notebook (ou CI verde) = **prova E2E** tier ≥1.

## Validação mínima pós-Save

1. Agente novo boota do build/snapshot (sem re-`npm ci` completo se build OK).
2. `curl -s http://127.0.0.1:3010/health` → OK.
3. Com secrets Portal: `npm run qa:run -- --suite <id>` em suite tier 1 **como pré-voo**; reportar PASS/FAIL no PR.
4. Após merge tier ≥1: ritual **[`aiyracare-qa-notebook`](../../.cursor/skills/aiyracare-qa-notebook/SKILL.md)** ou aguardar CI `e2e-regression`.

## Referências

- [`docs/testing/QA_PROCESS.md`](../testing/QA_PROCESS.md)
- [`docs/CURSOR_WORKSPACE.md`](../CURSOR_WORKSPACE.md)
- [`docs/infra/TWO_ENV_MODEL.md`](./TWO_ENV_MODEL.md) — Ambiente 1 integração local (Windows hoje; Cloud snapshot é camada **agente**, não Ambiente 2 Preview)
- [`docs/CURSOR_AGENT_OPS.md`](../CURSOR_AGENT_OPS.md)
