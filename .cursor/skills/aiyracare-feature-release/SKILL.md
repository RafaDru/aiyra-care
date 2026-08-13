---
name: aiyracare-feature-release
description: Classify AiyraCare feature tier (0-3) and list which parallel reviews to run (legal, medical, security, business). Use when shipping a feature, before merge, or when user asks for release review checklist.
---

# AiyraCare — Feature release orchestrator

Read `docs/FEATURE_REVIEW_FRAMEWORK.md` for full policy.

## Steps

1. Summarize the change (user-facing + technical).
2. Assign **tier** 0–3 using framework table.
3. List **required reviews**: legal, medical, security, business (yes/no).
4. Invoke other skills by name if tier ≥ 1 (business), tier ≥ 2 (+ legal, security), tier 3 (all + human).
5. Output unified summary with worst verdict across reviews.

## Tier quick reference

- **0:** typo/CSS/i18n only → reviews optional
- **1:** UI/CRUD sem novo dado sensível → business (+ legal if health copy)
- **2:** sync, upload, billing, compliance, new API → legal + security + business; medical if clinical surface
- **3:** IA clínica, share público, RAG, delete account → all four + human before prod

## Output template

```markdown
## Feature release — {title}
- **Tier:** N
- **Reviews required:** legal | medical | security | business
- **Overall:** PASS | CONCERNS | BLOCK
- **Next:** (merge / fix / human sign-off)
```
