---
name: aiyracare-review-business-domain
description: Business domain and hexagonal architecture review for AiyraCare. Use for new entities, tabs, integrations, naming, bounded contexts, roadmap alignment, or Connect vs Core boundaries.
---

# AiyraCare — Business domain review

Keep Postgres source of truth; Connect vs Core boundary clear.

## Context

- `docs/PROJETO.md`, `docs/CONNECT.md`, `AGENTS.md`
- `packages/api`: domain → application → infrastructure
- `packages/connect`: canonical batch, registry

## Checklist

- [ ] New concept maps to existing domain or needs new aggregate?
- [ ] Name aligns with user language (família, carteira, acompanhamento)?
- [ ] Integration: scraper in api infra vs `@open-health/connect` contract?
- [ ] Duplicate data vs `import_lineage` / canonical entity?
- [ ] UI tab vs backend module consistency?
- [ ] Roadmap epic/item id to update?
- [ ] i18n keys pt-BR + en?

## Output

Verdict PASS | CONCERNS | BLOCK + suggested domain placement + roadmap ids.
