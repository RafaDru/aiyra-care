# Anel B — progressive profiling (pós gate MVP)

| Campo | Valor |
|-------|--------|
| **Status** | `in_progress` (slice 3) |
| **Épico** | `institutional-landing` / onboarding |
| **Gate** | [`ONBOARDING_MVP_GATE.md`](../product/ONBOARDING_MVP_GATE.md) |

## Escopo (não bloqueia Início)

Coleta **depois** do Anel A (conta + família + 1 pessoa):

- Integrações convênio / lab / hospital (UI Integrações, não wizard inicial)
- ConecteSUS / Caderneta (gov.br)
- Co-responsável (convite família)
- Billing / assinatura
- Telemetria `progressive_profile_*` via propriedades em `onboarding_step` (futuro: evento dedicado)

## Relação com AC-6 / wizard v2

Fases 2–3 do wizard v2 (conectores no fluxo guiado) foram **substituídas** pela decisão MVP: conectores **fora** do Anel A ([#177](https://github.com/RafaDru/aiyra-care/pull/177)). AC-6 = implementar Anel B como **progressive profiling** no produto (empty states, CTAs, não reintroduzir gate).

## Shipped (slice 1 — out/2026)

| Superfície | Comportamento |
|------------|----------------|
| Banner pós-onboarding | CTAs Integrações + hub família (co-responsável) |
| Carteira vazia | CTA primário → aba Integrações do paciente |
| Componentes | `ProgressiveProfileIntegrationsLink`, `useSelfPatientId` |

## Shipped (slice 2 — AC-27)

| Superfície | Comportamento |
|------------|----------------|
| Aba **Convênios** | Empty sem links de operadora → CTA `[data-testid=coverage-empty-integrations-cta]` |
| **Início** | Alert dismissível titular sem links → `[data-testid=dashboard-progressive-profile-cta]` |
| Telemetria | `progressive_profile_cta_click` (`step`, `surface`) na allowlist API |

## Shipped (slice 3 — AC-43)

| Superfície | Comportamento |
|------------|----------------|
| **Início** — grid pacientes | Dependentes sem links → hint + CTA `[data-testid=dashboard-patient-card-integrations-cta]` no card (titular continua no alert global) |
| Telemetria | `surface=dashboard_patient_card` |

## Backlog

1. Não reabrir passo obrigatório de convênio no `/onboarding`.
2. ~~Empty states por paciente no grid do Início (além do titular).~~ → slice 3
3. Co-responsável / billing CTAs dedicados (backlog)

## QA

- [`patient-wallet`](../testing/suites/patient-wallet.md) — Carteira + Convênios empty CTAs; card Início (dependente)
- Regressão J1 inalterada; estender `onboarding-flow` só se critério Anel A mudar.

```bash
npm run qa:run -- --suite patient-wallet
```
