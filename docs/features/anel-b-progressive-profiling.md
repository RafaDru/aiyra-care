# Anel B — progressive profiling (pós gate MVP)

| Campo | Valor |
|-------|--------|
| **Status** | `in_progress` |
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

## Backlog

1. Empty states adicionais (Convênios, dashboard com perfis sem links).
2. Não reabrir passo obrigatório de convênio no `/onboarding`.
3. Eventos `progressive_profile_*` dedicados na allowlist API (opcional).

## QA

- [`patient-wallet`](../testing/suites/patient-wallet.md) — empty com `[data-testid=wallet-empty-integrations-cta]`
- Regressão J1 inalterada; estender `onboarding-flow` só se critério Anel A mudar.

```bash
npm run qa:run -- --suite patient-wallet
```
