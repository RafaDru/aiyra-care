# Web onboarding refresh (2026-10)

| Campo | Valor |
|-------|--------|
| **ID** | `web-onboarding-refresh-2026-10` |
| **Épico** | `institutional-landing` |
| **Status** | `done` |
| **Categoria** | negócio |
| **Prioridade** | P1 |
| **Relacionado** | [`auth-entry-onboarding`](./auth-entry-onboarding.md) · [`first-visit-guided-ux`](./first-visit-guided-ux.md) (adiado até após este ship) |

## Resumo

Refresh focado do wizard web de onboarding B2C (cuidador familiar): copy mais clara, progresso visível, layout alinhado aos tokens Aiyra, correção de corrida no passo 2 e banner leve de boas-vindas no dashboard após concluir ou pular dependentes. **Não** substitui o épico `first-visit-guided-ux` (drawer «Primeiros passos» / spotlight).

## Auditoria do fluxo atual (pré-refresh)

| Etapa | Rota / componente | Comportamento |
|-------|-------------------|---------------|
| Landing | `/home` · `landing.tsx` | CTAs Entrar / Criar conta |
| Auth | `/login?mode=login\|signup` · `login.tsx` | Signup → compliance (se pendente) → `/onboarding` se `needsProfile` |
| Wizard passo 1 | `/onboarding` · `onboarding.tsx` | `POST /auth/complete-profile` — titular 18+ |
| Wizard passo 2 | mesmo | `POST /patients` opcional ou pular |
| Pós-onboarding | `/` · `dashboard.tsx` | «Sua família» |

**Layout:** `OnboardingLayout.tsx` — fundo `--brand-bg`, logo, card central.

**Corrida conhecida:** após `complete-profile`, `needsProfile` vira `false` antes do React aplicar `setCurrentStep(1)`. Mitigação: `sessionStorage` `aiyracare.onboarding_wizard_step` gravado **antes** da API; redirect ao dashboard só se passo 0, sem flag e não em `submitting`.

## UX alvo (B2C cuidador familiar)

1. Linguagem de **titular / cuidador**, não clínica hospitalar.
2. **Passo N de 2** + hints nos Steps («Titular da conta» / «Opcional»).
3. Validação i18n pt-BR + en (CPF, maioridade, placeholders).
4. Primeira chegada ao dashboard: **banner informativo** dismissível (sessionStorage one-shot) — sem expandir `FirstVisitTourDrawer`.

## Escopo

### Dentro

- Copy e i18n `onboarding.*`
- `OnboardingLayout` (tagline, card, tokens)
- `onboarding-wizard-storage.ts` (chaves session)
- `PostOnboardingWelcomeBanner` no dashboard
- Telemetria `onboarding_step`: eventos existentes + `dashboard_welcome_viewed` / `dashboard_welcome_dismissed`
- Docs + suite `auth-entry-flow`

### Fora

- `FirstVisitTourDrawer` / tour spotlight (`first-visit-guided-ux`)
- Onboarding mobile Expo
- Mudanças de auth Supabase / confirmação de e-mail
- Landing marketing v2 além de links no funil

## Telemetria (`onboarding_step`)

| `step` | Quando |
|--------|--------|
| `step_1_viewed` | Render passo perfil |
| `profile_complete` | `complete-profile` OK |
| `step_2_viewed` | Entrada no passo família |
| `dependent_added` | Paciente criado no wizard |
| `dependents_skipped` | «Pular por agora» |
| `dependents_complete` | «Ir para o início» com ≥1 dependente |
| `dashboard_welcome_viewed` | Banner pós-onboarding exibido |
| `dashboard_welcome_dismissed` | Fechar / «Entendi» no banner |
| `dashboard_welcome_tour_cta` | «Ver primeiros passos» — abre `FirstVisitTourDrawer` |

## Superfície técnica

| Tipo | Referência |
|------|------------|
| UI | `packages/web/src/pages/onboarding.tsx`, `OnboardingLayout.tsx`, `PostOnboardingWelcomeBanner.tsx` |
| Storage | `packages/web/src/lib/onboarding-wizard-storage.ts` |
| Testes | `packages/web/tests/onboarding-wizard-storage.test.ts`, `e2e/suites/auth-entry-flow.spec.ts` |

## QA

Suite: [`auth-entry-flow`](../testing/suites/auth-entry-flow.md)

```bash
npm run qa:run -- --suite auth-entry-flow
```

## Próximo épico (bloqueado por este ship)

[`first-visit-guided-ux`](./first-visit-guided-ux.md) — guia «Primeiros passos», empty states acolhedores e polish do drawer; **somente após** este refresh estável em `main`.
