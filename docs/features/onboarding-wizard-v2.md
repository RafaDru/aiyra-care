# Onboarding wizard v2 (perfil → família → conectores)

| Campo | Valor |
|-------|--------|
| **Relacionado** | [`auth-entry-onboarding`](./auth-entry-onboarding.md) · PR #160 |
| **Status** | `done` |

## Escopo

Wizard em `/onboarding` com passos:

1. **Perfil titular** (identidade + endereço/contato) → `POST /auth/complete-profile` → `needsProfile: false`
2. **Família(s)** — loop nome + membros (`care_circles`)
3. **Resumo Ava** — 1–3 frases opcionais (`account_profiles.bio`)

**Anel A (MVP):** gate `needsOnboardingSetup` — titular completo + ≥1 `care_circle` + ≥1 paciente antes do dashboard feliz. Conectores/convênio **fora** do wizard inicial (Integrações pós-início). Passo família: **Sou eu o paciente**, relação de cuidado no dependente (`patient_circle_links.care_relation`).

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
