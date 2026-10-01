# Primeira visita — guia leve e empty states acolhedores

| Campo | Valor |
|-------|--------|
| **ID** | `first-visit-guided-ux` |
| **Épico** | `dev-delivery-pipeline` |
| **Status** | `in_progress` |
| **Categoria** | negócio |
| **Prioridade** | P2 |

## Resumo (1 parágrafo)

Humaniza o primeiro contato após onboarding: disclaimer de apoio familiar com tom mais acolhedor (médico, não pediatra), empty state de apoio familiar orientado a primeiros passos (em vez de copy de alertas clínicos), e drawer de guia «Primeiros passos» com 4 etapas (família → cadastro → registro rápido → Ava).

## Objetivo de negócio

- Reduzir fricção e ansiedade na primeira navegação autenticada.
- Reforçar princípio Ava-first sem bloquear o fluxo (dismissível).
- Diferenciar conta nova (sem histórico clínico) de retorno com prontuário.

## Comportamento (usuário)

1. **Disclaimer** — painel Apoio familiar mostra texto i18n acolhedor; API mantém equivalente para Ava.
2. **Sem alertas (primeira vez)** — paciente sem medidas/medicações/alergias: mensagem de boas-vindas com sugestões (cadastrar familiar, registro rápido, plano).
3. **Sem alertas (retorno)** — com histórico clínico: mensagem anterior sobre continuar registrando para a consulta.
4. **Guia Primeiros passos** — drawer lateral após login (exceto login/onboarding/compliance); dismissível; persiste `first_visit_tour_completed` em localStorage + `product_events`.

## Superfície técnica

| Tipo | Referência |
|------|------------|
| Rotas web | `/`, layout autenticado |
| API | `GET /patients/:id/family-support/insights` (`hasClinicalHistory`) |
| Telemetria | `first_visit_tour_completed` |
| UI principal | `FirstVisitTourDrawer`, `FamilySupportPanel` |

## Fora de escopo

- Tour guiado por spotlight/overlay em elementos DOM.
- Sincronização cross-device do flag de tour via API dedicada.

## QA (obrigatório ao entregar)

| Campo | Valor |
|-------|--------|
| **Suite** | `docs/testing/suites/onboarding-flow.md` (cenário D) |
| **Comando manual** | `npm run qa:run -- --suite onboarding-flow` |
| **Automação** | `packages/web/e2e/onboarding.spec.ts` (drawer visível) |

## Ver também

- [`docs/testing/suites/onboarding-flow.md`](../testing/suites/onboarding-flow.md)
- [`docs/AVA_VISION.md`](../AVA_VISION.md)
