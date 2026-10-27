# Anel B — progressive profiling (pós gate MVP)

| Campo | Valor |
|-------|--------|
| **Status** | `planned` |
| **Épico** | `institutional-landing` / onboarding |
| **Gate** | [`ONBOARDING_MVP_GATE.md`](../product/ONBOARDING_MVP_GATE.md) |

## Escopo (não bloqueia Início)

Coleta **depois** do Anel A (conta + família + 1 pessoa):

- Integrações convênio / lab / hospital (UI Integrações, não wizard inicial)
- ConecteSUS / Caderneta (gov.br)
- Co-responsável (convite família)
- Billing / assinatura
- Telemetria `progressive_profile_*` (futuro)

## Relação com AC-6 / wizard v2

Fases 2–3 do wizard v2 (conectores no fluxo guiado) foram **substituídas** pela decisão MVP: conectores **fora** do Anel A ([#177](https://github.com/RafaDru/aiyra-care/pull/177)). AC-6 = implementar Anel B como **progressive profiling** no produto (empty states, CTAs, não reintroduzir gate).

## Próximo implementador

1. Empty states no dashboard / perfil paciente → «Vincular convênio» / SUS.
2. Não reabrir passo obrigatório de convênio no `/onboarding`.
3. Suite QA: estender `onboarding-flow` apenas se critério de aceite mudar.
