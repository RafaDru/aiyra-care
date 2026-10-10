# Início — grade de pessoas (dashboard)

| Campo | Valor |
|-------|--------|
| **ID** | `dashboard-people-home` |
| **Épico** | `family-day-to-day` |
| **Status** | `done` |
| **Categoria** | negócio |
| **Prioridade** | P1 |

## Resumo

O **Início** (`/`) lista perfis de saúde com agrupamento escolhível (família, idade, A–Z). Convites e círculos ficam só em **Sua família** (`/family`), com badge de pendências na sidebar.

Proposta: [`dashboard-family-home-redesign-2026-10-08.md`](../product/dashboard-family-home-redesign-2026-10-08.md).

## Comportamento

- Título `dashboard.peopleTitle` («Quem você cuida») + subtítulo curto.
- Default de agrupamento: **por idade** com 1 círculo; **por família** com ≥2; persistência `localStorage` `aiyracare.dashboard_group_mode`.
- Perfis sem círculo: grupo «Sem família definida» + link para `/family`.
- CTA **Adicionar pessoa** (secundário); modal com select de família quando ≥2 círculos; validação de nascimento alinhada ao onboarding (`patientBirthDateFormRules`).
- Tags de família (cor por círculo) nos modos idade e A–Z.

## Superfície técnica

| Tipo | Referência |
|------|------------|
| UI | `dashboard.tsx`, `DashboardPeopleToolbar.tsx`, `DashboardPatientCard.tsx` |
| Hooks | `useDashboardGroupMode.ts`, `useFamilyPendingCount.ts` |
| Nav | `AppLayout.tsx` — badge `/family` |
| i18n | `dashboard.*`, `family.circles.unassigned` |

## QA

Suite: [`dashboard-people-grouping`](../testing/suites/dashboard-people-grouping.md) · regressão entrada: [`auth-entry-flow`](../testing/suites/auth-entry-flow.md)

```powershell
npm run qa:run -- --suite dashboard-people-grouping
npm run qa:run -- --suite auth-entry-flow
```
