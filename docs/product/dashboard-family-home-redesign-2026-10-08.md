# Início centrado em pessoas — resumo (2026-10-08)

Proposta completa (Agent Store): `dashboard-family-home-redesign-proposal-2026-10-08.md` no Context do projeto.

## Problema

Redundância «Sua família» (nav + título + card hub no Início); CTA «Adicionar à família» muito forte para ação rara.

## Direção

- **Início:** grade de perfis com modos Por família / Por idade / A–Z (P1).
- **Sua família (`/family`):** único lugar para convites, círculos e compartilhamento.
- **Adicionar pessoa:** ação secundária no header do Início; modal com seleção de família (P1).

## Fases

| Fase | Entrega |
|------|---------|
| **P0** | Remove `DashboardFamilyShortcut`; CTA `patient.addPerson` (default button) |
| **P1** | Título «Quem você cuida», seletor de agrupamento, badge pendências na nav, «Sem família definida» — **shipped** (`dashboard-people-home`) |
| **P2** | Cores por família, telemetria, polish mobile |

## P0 neste PR

- `packages/web/src/pages/dashboard.tsx` — hub card removido; botão e modal «Adicionar pessoa».

Relacionado: onboarding `auth-entry-onboarding`, múltiplos `care_circles`, glossário em `/family`.
