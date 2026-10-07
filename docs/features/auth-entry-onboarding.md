# Entrada auth e onboarding guiado

| Campo | Valor |
|-------|--------|
| **ID** | `auth-entry-onboarding` |
| **Épico** | `institutional-landing` |
| **Status** | `done` |
| **Refresh** | [`WEB_ONBOARDING_REFRESH_2026-10`](./WEB_ONBOARDING_REFRESH_2026-10.md) (2026-10) |
| **Categoria** | negócio |
| **Prioridade** | P1 |

## Resumo

Fluxo B2C de entrada: landing → login/signup com modo na URL → wizard de onboarding em 2 passos (perfil titular + dependentes opcionais) → dashboard «Sua família».

## Comportamento

1. **Login** (`?mode=login`): título «Bem-vindo de volta»; após auth → compliance (se pendente) → dashboard ou onboarding se `needsProfile`
2. **Signup** (`?mode=signup`): título «Crie sua conta»; copy de confirmação por e-mail (informativo); após signup → `/onboarding`
3. **Onboarding passo 1:** perfil titular (CPF obrigatório; CNS opcional)
4. **Onboarding passo 2:** adicionar dependentes via `POST /patients` ou pular

**Nota (passo 2):** após `POST /auth/complete-profile`, o wizard permanece em `/onboarding` até «Pular» ou «Ir para o início». O passo ativo persiste em `sessionStorage` via `onboarding-wizard-storage.ts` (`aiyracare.onboarding_wizard_step`), gravado **antes** da API, para não redirecionar ao dashboard antes do passo de família (corrida com `refreshSync` / `needsProfile`). Redirect bloqueado também durante `submitting`.

**Pós-onboarding:** banner leve no dashboard (`PostOnboardingWelcomeBanner`, flag `aiyracare.onboarding_just_completed` em session até dismiss) — distinto do drawer `first-visit-guided-ux`, que aguarda o banner ou abre via «Ver primeiros passos».

## Telemetria

`onboarding_step` — `step_1_viewed`, `profile_complete`, `step_2_viewed`, `dependent_added`, `dependents_skipped`, `dependents_complete`, `dashboard_welcome_viewed`, `dashboard_welcome_dismissed`

## Superfície técnica

| Tipo | Referência |
|------|------------|
| Rotas | `/home`, `/login`, `/onboarding` |
| UI | `landing.tsx`, `login.tsx`, `onboarding.tsx`, `OnboardingLayout.tsx`, `PostOnboardingWelcomeBanner.tsx` |
| i18n | `auth.*`, `onboarding.*`, `patient.title`, `nav.dashboard` |

## Gap conhecido

Confirmação de e-mail Supabase: copy informativa na UI; fluxo não bloqueia se `email_confirm` desabilitado no projeto.

## QA

Spec refresh: [`WEB_ONBOARDING_REFRESH_2026-10`](./WEB_ONBOARDING_REFRESH_2026-10.md)

Suite dedicada: [`auth-entry-flow`](../testing/suites/auth-entry-flow.md)

```powershell
npm run qa:run -- --suite auth-entry-flow
```
