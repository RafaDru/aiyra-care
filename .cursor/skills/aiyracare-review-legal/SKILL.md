---
name: aiyracare-review-legal
description: Legal and LGPD review for AiyraCare changes (Brazil). Use for terms, privacy, minors, billing, scraping, health data, new integrations, or when feature-release requests legal review.
---

# AiyraCare — Legal / LGPD review

**Not legal advice.** Flag issues for human lawyer (go-live público).

## Context files

- `docs/LEGAL_COMPLIANCE.md` (incl. DocuSign vs click-wrap §11)
- `docs/legal/` — versioned terms and privacy
- `docs/ACCOUNT_AND_PLAN.md` — billing/subscription

## Checklist

- [ ] New personal/sensitive data? Base legal + policy update?
- [ ] Minors / guardian consent?
- [ ] Terms or privacy text changed? Version bump + re-accept?
- [ ] Third-party credentials (portals)? User authorization in terms?
- [ ] Billing/subscription? CDC cancel/refund copy?
- [ ] International transfer (LLM/cloud)? Disclosed in privacy?
- [ ] Public export/share links? TTL + warning?
- [ ] B2B contract needed? (DocuSign) vs B2C click-wrap OK?

## Output

Verdict PASS | CONCERNS | BLOCK + bullets + `human required: yes/no`.
