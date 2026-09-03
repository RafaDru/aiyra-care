# Operação agêntica no Cursor — guard-rails LLM-agnósticos

> **Última atualização:** 2026-08-24  
> Objetivo: operação efetiva com **troca de modelo** (Composer, Claude, Gemini, etc.) sem perder segurança de código e processo.

## O que é estável (não depende do LLM)

| Camada | Artefato | Função |
|--------|----------|--------|
| Contexto fixo | `AGENTS.md`, `docs/PROJETO.md`, `docs/project-context.json` | Stack, comandos, arquitetura |
| Documentação | `docs/DOCUMENTATION_SYSTEM.md`, `docs/features/` | Tracking negócio + feature cards |
| Skills | `.cursor/skills/aiyracare-*` | Procedimentos de revisão tiered |
| Hooks | `.cursor/hooks.json` + scripts Node | Auditoria + bloqueio determinístico |
| Rules | `AGENTS.md` (workspace rules) | Políticas de commit, PR, serviços |
| CI | `.github/workflows/ci.yml` | Build + testes críticos |
| Framework | `docs/FEATURE_REVIEW_FRAMEWORK.md` | Tier 0–3 antes de merge |

O modelo **interpreta** skills; hooks e CI **executam** independentemente do modelo.

## Hooks implementados

| Evento | Script | Comportamento |
|--------|--------|---------------|
| `sessionStart` | `session-start.mjs` | Log + **`additional_context`** com `docs/AGENT_BOOTSTRAP.md` |
| `preCompact` | `pre-compact.mjs` | Log compactação; flag para re-injetar bootstrap |
| `postToolUse` | `post-tool-bootstrap.mjs` | Após compact, re-injeta bootstrap na próxima ferramenta |
| `beforeShellExecution` | `before-shell.mjs` | Audita; bloqueia destrutivos; pede confirmação em commit/push |
| `afterFileEdit` | `after-file-edit.mjs` | Log path + ferramenta |
| `afterFileEdit` | `after-file-edit-doc-ritual.mjs` | Marca ritual docs se produto sem `docs/features` |
| `preToolUse` | `pre-tool-guard.mjs` | Bloqueia Write/Delete em `.env` e credenciais |
| `stop` | `stop-doc-ritual.mjs` | `followup_message` se ritual docs pendente (`loop_limit: 2`) |

Regra always-on: `.cursor/rules/agent-bootstrap.mdc` — índice curto que sobrevive à compactação.

Configuração: `.cursor/hooks.json`. Debug: aba **Hooks** no Cursor.

## Skills obrigatórias por tipo de mudança

Invocar no chat antes de merge (tier ≥ 2):

- `aiyracare-feature-release` — classifica tier e lista reviews
- `aiyracare-review-security` — auth, rotas, credenciais
- `aiyracare-review-legal` — LGPD, menores, scraping
- `aiyracare-review-medical` — clínico, OCR/LLM, export
- `aiyracare-review-business-domain` — hexagonal, naming

## Troca de LLM — checklist

1. **Não** remover `AGENTS.md` nem hooks — são o contrato do repo.
2. Manter skills em `.cursor/skills/` (portáveis entre modelos no Cursor).
3. Evitar instruções só no chat; preferir docs versionados.
4. `test:critical` antes de push — evidência objetiva.
5. Subagents (`security-review`, `bugbot`) para tier 3 — modelo pode variar; prompt fixo no skill.

## O que o Cursor ainda não substitui

- Revisão jurídica/médica humana (go-live B2C)
- Pentest tier 3
- Deploy e runbooks de produção
- E2E web automatizado (backlog)

## Próximos endurecimentos (roadmap)

- `beforeSubmitPrompt` — detecção de secrets no prompt (opcional)
- Hook `subagentStart` — limitar subagents em paths sensíveis
- CI: E2E smoke + migration dry-run
- Integrar `docs/dev-audit/` com `product_events` em staging (sem PHI) — **done** · `npm run dev-audit:bridge` · `GET /ops/dev-audit-bridge`
