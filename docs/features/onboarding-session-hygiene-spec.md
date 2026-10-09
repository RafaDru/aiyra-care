# Spec — higiene de sessão onboarding (passos 1–4)

**Data:** 2026-10-09 · **Base:** `main` @ `3f2fbae` · **Origem:** investigação open-session-no-auth (2026-10-09)

## Decisão de produto (passo 2)

- **Família + conectores permanecem opcionais** após `complete-profile` (`needsProfile: false` libera dashboard).
- O bug a corrigir é **vazamento de `sessionStorage` entre contas/tabs**, não forçar conclusão do wizard v2.
- Documentação (`auth-entry-onboarding.md`, wizard v2) alinhada a esse contrato.

## Passo 1 — Higiene wizard (commit 1)

- `clearOnboardingWizardStorage()` unificado: step legado, `onboarding_family_wizard`, `onboarding_just_completed`, chave `onboarding_wizard_owner_sub`.
- Chamar em `AuthContext.signOut` e handler `SIGNED_OUT`.
- Após `sync` OK: se `authUserId` ≠ `readOnboardingWizardOwnerSub()`, limpar storage.
- `persistOnboardingWizardOwnerSub(authUserId)` ao entrar em `/onboarding` ou no primeiro persist de passo.
- Testes unitários em `onboarding-wizard-storage.test.ts`.

## Passo 2 — Docs (commit 2)

- Atualizar `docs/features/auth-entry-onboarding.md` + `docs/features/onboarding-wizard-v2.md` (se existir) + gap em feature card.
- Registrar em `docs/HISTORICO.md` (1 parágrafo).

## Passo 3 — Login redirect (commit 3)

- `login.tsx`: com sessão hidratada, se `account?.needsProfile` → `navigate('/onboarding', { replace: true })` antes de `/`.

## Passo 4 — Ops telemetria (commit 4)

- `docs/OBSERVABILITY.md` ou `docs/ops/` — explicar KPI «Sessões» (`session_id` distinto) vs contas (`account_id`); nota `account_id IS NULL`.
- Comentário curto em `BusinessPanel.tsx` ou tooltip se já houver padrão.

## Validação

- `cd packages/web && npx vitest run onboarding-wizard-storage`
- `npm run test:critical` (root)
- `npm run qa:run -- --suite auth-entry-flow` se ambiente permitir; senão reportar skip.
- PR único, merges quando CI verde (solo operator).
