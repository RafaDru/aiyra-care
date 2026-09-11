# CI — aprendizados (build API + E2E)

> **Última atualização:** 2026-09-11

## O que aconteceu

O workflow **E2E regression** e o job **`api`** do CI falhavam no passo **Build API** (`npm run build` → `tsc`), não nos secrets Supabase nem nos testes Playwright.

Localmente o backend sobe com `npm run dev` (tsx, sem checagem completa de tipos). O CI exige compilação TypeScript estrita — **51 erros** acumulados que o dev diário não expunha.

## Lições

| Sintoma | Causa | Prevenção |
|---------|-------|-----------|
| App funciona local, CI quebra no build | `dev` ≠ `build` | Rodar `cd packages/api && npm run build` antes de push em `main` |
| E2E regression para em "Build API" | Mesmo gate do job `api` | Corrigir build primeiro; Playwright só roda depois |
| E2E regression para em "Wait for API" | `node dist/index.js` importa `@aiyra-care/connect` como `.ts` | `connect` deve gerar `dist/` antes do `tsc` da API (`api` build já encadeia) |
| `api.log` só `{"level":50,...}` sem mensagem | `logMethod` sanitizava `Error` → `{}`; `app.log.error(err)` perdia stack | Preservar `Error` no hook; `console.error` no catch de startup |
| API morre no CI sem `GROQ_API_KEY` | `groq-llm.adapter.ts` fazia `new Groq()` no import (via Ava → scraper agent) | Inicialização lazy como em `llm-chat.providers.ts`; Groq só ao chamar LLM |
| Fase 3 business-full no CI | Mesma stack da Fase 2; 11 specs ~15 min com build Vite | `ci-e2e-business-full.yml` nightly; não gate PR até 7 noites verdes |
| Login E2E timeout em `/login` | Primeiro login sem `legal_document_acceptances` → `/compliance/accept`; Select Ant Design sem `title` | `acceptComplianceIfPresent` no helper auth; `getByRole('option')` para Sexo |
| Fase 4 Ava no CI | LLM real indisponível sem API keys | `AVA_TEST_MODE=1` na API + specs `ava-companion-smoke` / `ava-guardrail-smoke` |
| Erros em mappers Connect / Ava / suporte | Tipos desatualizados vs domínio | PR que mexe em `@aiyra-care/connect` ou repositórios: build obrigatório |
| Imports duplicados (`PatientPgRepository`, `VaccinePgRepository`) | merge/copy-paste | `tsc` pega imediatamente |

## Checklist rápido antes de push

```powershell
cd packages/api && npm run build
cd packages/api && npm run test:critical
```

Opcional (com stack local + secrets): `npm run test:e2e:regression`

## Correção aplicada (2026-09-08)

- ~51 ajustes de tipo em `packages/api` (Connect, Ava, hygiene, support-report, scrapers, Fastify logger, etc.)
- `npm run build` e `npm run test:critical` verdes localmente

---

## Compactação de contexto — quando quebrar em agentes

> **Pendente de medição** — ritual proposto abaixo; dados ainda não consolidados.

### O que já existe no repo

| Artefato | Função |
|----------|--------|
| Hook `preCompact` | Grava em `docs/dev-audit/` evento `compaction` com `contextUsagePercent`, `messageCount`, `messagesToCompact` |
| `docs/AGENT_BOOTSTRAP.md` | Índice curto re-injetado após compactar |
| Rules `agent-bootstrap.mdc` | Lembra ordem docs → context → feature → roadmap |

### Sinais de que a sessão está “grande”

- Resumo automático no chat (compactação) no meio de uma tarefa longa
- Agente “esquece” decisões de 10–20 mensagens atrás (ex.: nomes de secrets, escopo Fase 2 vs 3)
- Muitos arquivos tocados em domínios **diferentes** na mesma sessão (ex.: CI + ops-console + E2E + API build)

### Heurística para **novo agente** (proposta)

| Situação | Ação |
|----------|------|
| Tarefa única e focada (ex.: só CI workflow) | Manter 1 agente |
| Nova fase/epic após entrega (ex.: Fase 3 nightly) | **Novo chat** com link para `AUTOMATION_ROADMAP.md` + último commit |
| Build debt + feature em paralelo | **2 agentes**: um só `packages/api` build; outro só web/E2E |
| Após compactação + tarefa ainda >30% incompleta | Novo agente com handoff: objetivo, arquivos-chave, o que já passou |

### Próximo passo (medir “tamanho”)

1. Script ou query em `docs/dev-audit/tools/*.jsonl` agregando `contextUsagePercent` no `preCompact`
2. Correlacionar com: linhas de diff, número de tool calls, falhas por “contexto perdido”
3. Definir limiar documentado (ex.: >70% usage ou >2 compactações por tarefa → split obrigatório)

Ver também: [`docs/CURSOR_AGENT_OPS.md`](../CURSOR_AGENT_OPS.md), [`docs/DOCUMENTATION_SYSTEM.md`](../DOCUMENTATION_SYSTEM.md#sobrevivência-à-compactação-de-contexto).
