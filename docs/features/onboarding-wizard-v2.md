# Onboarding wizard v2 (perfil → família → conectores)

| Campo | Valor |
|-------|--------|
| **Relacionado** | [`auth-entry-onboarding`](./auth-entry-onboarding.md) · PR #160 |
| **Status** | `done` |

## Escopo

Wizard em `/onboarding` com passos:

1. **Perfil titular** (identidade + endereço/contato) → `POST /auth/complete-profile` → `needsProfile: false`
2. **Família(s)** — loop nome + membros (`care_circles`)
3. **Conectores** — passos opcionais (deep links; sem scraper embutido)

Após o passo 1, **família e conectores são opcionais**: o usuário pode ir ao dashboard sem concluir 2–3. O gate de rota (`RequireCompliance`) só exige `/onboarding` enquanto `needsProfile`.

## Estado no browser (`sessionStorage`)

| Chave | Uso |
|-------|-----|
| `aiyracare.onboarding_wizard_step` | `0` / `families` / `connectors` |
| `aiyracare.onboarding_family_wizard` | Sub-wizard família (fase, círculo ativo, nomes) |
| `aiyracare.onboarding_just_completed` | Banner pós-onboarding no dashboard |
| `aiyracare.onboarding_wizard_owner_sub` | Supabase `user.id` dono do estado (higiene entre contas) |

Implementação: `packages/web/src/lib/onboarding-wizard-storage.ts` · UI: `features/onboarding/OnboardingWizard.tsx`

## Higiene de sessão (2026-10-09)

- `clearOnboardingWizardStorage()` no logout (`signOut` + `SIGNED_OUT`)
- Após `auth/sync` OK: se `authUserId` ≠ owner gravado, limpar chaves
- `persistOnboardingWizardOwnerSub` ao abrir `/onboarding` e ao avançar passos família/conectores

Spec: [`onboarding-session-hygiene-spec.md`](./onboarding-session-hygiene-spec.md)

## QA

Suites: [`onboarding-flow`](../testing/suites/onboarding-flow.md) · [`auth-entry-flow`](../testing/suites/auth-entry-flow.md)
