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

Fluxo B2C de entrada: landing → login/signup com modo na URL → wizard de onboarding (perfil titular → loop **família(s)** com nome + membros + «adicionar outra família») → dashboard **Quem você cuida** (Início) com agrupamento por círculo/faixa etária.

**Spec:** [`ONBOARDING_FAMILY_NAME_STEP.md`](./ONBOARDING_FAMILY_NAME_STEP.md) (aprovada 2026-10-08).

## Comportamento

1. **Login** (`?mode=login`): título «Bem-vindo de volta»; após auth → compliance (se pendente) → dashboard ou onboarding se `needsProfile`
2. **Signup** (`?mode=signup`): título «Crie sua conta»; copy de confirmação por e-mail (informativo); após signup → `/onboarding`
3. **Onboarding passo 1:** perfil titular (identidade → endereço ViaCEP + celular obrigatório; nome social opcional) → `POST /auth/complete-profile`
4. **Onboarding passo 2 (loop):** para cada família — nome (`POST /care-circles`; 1º círculo vincula titular) → membros (`POST /patients` + `POST /care-circles/:id/patients`) → **Adicionar outra família** ou **Ir para o início**; gestão contínua em `/family`

**Famílias + conectores (opcionais após perfil):** `POST /auth/complete-profile` define `needsProfile: false` e libera o dashboard (`RequireCompliance` só força `/onboarding` enquanto `needsProfile`). O usuário **pode** continuar em `/onboarding` para criar círculos e percorrer conectores (SUS, convênios, labs, hospitais — deep link/modal, sem scraper embutido), mas não é obrigatório para entrar no app.

**Higiene de sessão (wizard v2):** estado em `sessionStorage` via `onboarding-wizard-storage.ts` (`aiyracare.onboarding_wizard_step`, `aiyracare.onboarding_family_wizard`, `aiyracare.onboarding_just_completed`, `aiyracare.onboarding_wizard_owner_sub`). Limpeza no logout e quando o Supabase `user.id` do sync não coincide com o owner gravado; ver [`onboarding-wizard-v2.md`](./onboarding-wizard-v2.md) e [`onboarding-session-hygiene-spec.md`](./onboarding-session-hygiene-spec.md). Recarga reconcilia família com `GET /care-circles`.

**Pós-onboarding:** banner leve no dashboard (`PostOnboardingWelcomeBanner`, flag `aiyracare.onboarding_just_completed` em session até dismiss) — distinto do drawer `first-visit-guided-ux`, que aguarda o banner ou abre via «Ver primeiros passos».

## Telemetria

`onboarding_step` — `step_1_viewed`, `profile_complete`, `step_3_family_name_viewed`, `family_circle_created`, `family_member_added`, `family_members_skipped`, `another_family_started`, `onboarding_families_complete`, `step_2_viewed` (membros), `dependent_added`, `dependents_skipped`, `dependents_complete`, `dashboard_welcome_viewed`, `dashboard_welcome_dismissed`

## Superfície técnica

| Tipo | Referência |
|------|------------|
| Rotas | `/home`, `/login`, `/onboarding` |
| UI | `landing.tsx`, `login.tsx`, `onboarding.tsx`, `features/onboarding/*`, `AuthWizardShell.tsx`, `PostOnboardingWelcomeBanner.tsx` |
| i18n | `auth.*`, `onboarding.*`, `patient.title`, `nav.dashboard` |

## Gap conhecido

| Gap | Notas |
|-----|--------|
| Confirmação de e-mail Supabase | Copy informativa na UI; fluxo não bloqueia se `email_confirm` desabilitado no projeto |
| Wizard `sessionStorage` entre contas (resolvido 2026-10-09) | Higiene em `AuthContext` + owner sub — spec `onboarding-session-hygiene-spec.md` |

## QA

Spec refresh: [`WEB_ONBOARDING_REFRESH_2026-10`](./WEB_ONBOARDING_REFRESH_2026-10.md)

Suites: [`auth-entry-flow`](../testing/suites/auth-entry-flow.md) · [`onboarding-flow`](../testing/suites/onboarding-flow.md) · [`dashboard-people-grouping`](../testing/suites/dashboard-people-grouping.md)

```powershell
npm run qa:run -- --suite auth-entry-flow
npm run qa:run -- --suite onboarding-flow
```
