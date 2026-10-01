# Discovery UI — dia a dia da família

| Campo | Valor |
|-------|--------|
| **ID** | `family-day-to-day-discovery` |
| **Épico** | `family-day-to-day` |
| **Status** | `done` |
| **Categoria** | negócio |
| **Prioridade** | P1 |

## Resumo

Card **Dia a dia da família** no dashboard (Início) apresenta os três fluxos do discovery [`day-to-day-clinician-access.md`](../discovery/day-to-day-clinician-access.md): registrar agora, bloco Hoje e preparar consulta. Dismissível por conta (`dismissedHints`).

## Comportamento (usuário)

1. No **Início**, com ou sem perfis cadastrados, vê o guia até fechar (×).
2. **Registrar agora** abre o sheet global (ou modal de novo perfil se a família está vazia).
3. **Ver o bloco Hoje** rola até `WalletTodayPanel` (quando há perfil na lente).
4. **Preparar consulta** abre o wizard «Levar na consulta».

## Superfície técnica

| Tipo | Referência |
|------|------------|
| UI | `DayToDayDiscoveryHub.tsx`, `DashboardDayToDaySection.tsx`, `dashboard.tsx` |
| Persistência | `dismissed-hints.ts` — id `day-to-day-discovery-hub` |
| Bus | `quick-capture-bus`, `clinical-export-bus`, `patient-create-bus` |

## QA

- Suite: [`family-day-to-day-discovery`](../testing/suites/family-day-to-day-discovery.md)
- Comando: `npm run qa:run -- --suite family-day-to-day-discovery`

## Relacionado

- D1–D5 do épico (`patient-clinical-export`, `family-quick-capture`, `family-day-timeline`)
