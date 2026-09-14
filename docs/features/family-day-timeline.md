# Bloco «Hoje» na Carteira

| Campo | Valor |
|-------|--------|
| **ID** | `family-day-timeline` |
| **Épico** | `family-day-to-day` |
| **Status** | `done` |
| **Categoria** | negócio |
| **Prioridade** | P1 |

## Resumo

Na aba **Carteira** do paciente, o bloco **Hoje** mostra agenda do dia, lembretes pendentes e registros recentes (medidas/medicações), com atalhos para **Registro rápido** e **Levar na consulta**.

## Comportamento (usuário)

1. Abre perfil → aba **Carteira**
2. Vê card **Hoje** com data e lista cronológica (até 12 itens)
3. Pode marcar item de agenda como feito ou adiar lembrete 30 min
4. CTAs: **Registro rápido** (sheet global) e **Levar na consulta** (wizard em qualquer aba)

## Superfície técnica

| Tipo | Referência |
|------|------------|
| UI | `WalletTodayPanel.tsx`, `WalletCardsTab.tsx` |
| Wizard consulta (global no perfil) | `PatientConsultVisitHost.tsx` |
| API | `GET /scheduled-events`, `GET /care-reminders/pending`, `GET /measurements/timeline` |

## QA

- Suite: [`family-day-timeline`](../testing/suites/family-day-timeline.md)
- Comando: `npm run qa:run -- --suite family-day-timeline`
