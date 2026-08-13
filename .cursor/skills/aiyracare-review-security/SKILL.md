---
name: aiyracare-review-security
description: Security and LGPD-technical review for AiyraCare. Use for auth, new API routes, credentials, encryption, public endpoints, dependencies, share tokens, or compliance gate changes.
---

# AiyraCare — Security review

Cross-check LGPD technical measures + common vulnerabilities (not full pentest).

## Context

- `security.plugin.ts` — public paths whitelist
- `CRYPTO_KEY` — portal credentials
- Supabase JWT on all routes (prod)
- `docs/LEGAL_COMPLIANCE.md`, `docs/legal/INCIDENT_RESPONSE.md`

## Checklist

- [ ] New route: auth required? `patient-access` guard?
- [ ] Public route justified? Rate limit / no enumeration?
- [ ] Secrets in repo or logs?
- [ ] Share tokens: entropy, expiry, hash at rest?
- [ ] SQL/injection via raw queries?
- [ ] File upload: size, type, path traversal?
- [ ] Stripe webhook: signature verified?
- [ ] Compliance bypass without `COMPLIANCE_GATE`?
- [ ] Dependency known CVE? (note only)

## Output

Verdict PASS | CONCERNS | BLOCK + severity (critical/high/medium/low) + file refs.

For tier 3 or large diff, suggest running Cursor `security-review` subagent on branch diff.
