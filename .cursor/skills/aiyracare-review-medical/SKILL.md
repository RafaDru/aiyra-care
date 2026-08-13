---
name: aiyracare-review-medical
description: Medical and clinical-safety review for AiyraCare. Use for OCR/LLM interpretation, clinical export, patient context text, health threads, RAG, disclaimers, or pediatric UX that could affect care decisions.
---

# AiyraCare — Medical review

**Not medical advice.** Flag for clinician review before trusting AI in production.

## Product positioning

Organizador familiar — **not** official EMR, not diagnosis/treatment. Disclaimers in export and handwriting modals.

## Checklist

- [ ] Text implies diagnosis, prescription, or emergency triage?
- [ ] IA output shown without “revise com pediatra” equivalent?
- [ ] OCR/interpretation on meds/vaccines without human review path?
- [ ] Export/share could be mistaken for official prontuário?
- [ ] Pediatric dosing or urgency without guardrails?
- [ ] RAG/agent suggests treatment? → ANVISA SaMD risk (BLOCK tier 3)
- [ ] Imaging vs lab OCR policy consistent (`ocr-policy.ts`)?

## Output

Verdict PASS | CONCERNS | BLOCK + clinical risk bullets + suggest disclaimer/copy fixes.
