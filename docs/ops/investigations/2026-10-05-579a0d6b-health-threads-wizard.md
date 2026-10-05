# Investigação — defeito DEF-000003 / `579a0d6b-247b-4310-a228-e4881a92546f`

| Campo | Valor |
|-------|--------|
| `referenceCode` | DEF-000003 |
| `defectId` | `579a0d6b-247b-4310-a228-e4881a92546f` |
| **Fingerprint** | `db4b512b6e881cb0` (`api:health-threads\|api\|http_400`) |
| **Rota API** | `POST /health-threads/wizard/investigation` |
| **Apps** | Web |
| **Tier** | 0 (`defect-fix-tier0`) |

## Hipótese

O wizard «Nova investigação» envia campos opcionais (`reason`, `workingHypothesis`) como `null` quando o Ant Design Form limpa TextAreas vazios. O schema Zod usava `.optional()` (aceita `undefined`, rejeita `null`) → **HTTP 400** com `error.flatten()` antes de `startInvestigation`.

Fingerprint genérico `api:health-threads|api|http_400` bate com qualquer 4xx na feature; o título CH aponta para o wizard de investigação.

## Correção

1. **`health-thread.schema.ts`** — `investigationWizardSchema` e `taskWizardSchema`: opcionais com `.nullish()`; `title` com `.trim().min(1)`.
2. **`InvestigationWizardModal.tsx`** — normalizar strings opcionais antes do POST (omitir vazios/null).

## Verificação

- `cd packages/api && npx vitest run tests/health-thread-wizard.schema.test.ts`
- Repro: payload com `reason: null` → 201 após fix.

## Rastreio

- Incidente ops: `ab113d26-4cec-416d-98e2-0135d028c472`
- Branch: `cursor/defect-579a0d6b-health-threads-wizard-null`
