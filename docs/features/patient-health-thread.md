# Health thread — investigação e acompanhamento

| Campo | Valor |
|-------|--------|
| **ID** | `patient-health-thread` |
| **Épico** | `family-day-to-day` / acompanhamentos clínicos |
| **Status** | `done` |
| **Categoria** | negócio |
| **Prioridade** | P1 |

## Resumo

Painel **Em acompanhamento** no perfil do paciente (aba básica) permite criar **investigações**, planos de acompanhamento, hipóteses e episódios — com wizard multi-etapas e drawer de workflow clínico.

## Objetivo de negócio

- Organizar linhas de cuidado (sintoma → hipótese → exames → consulta) sem virar prontuário hospitalar.
- Dar visibilidade ao cuidador do que está «em aberto» antes da consulta.

## Comportamento (usuário)

1. No perfil do paciente (aba básica), painel **Em acompanhamento**
2. **Adicionar** → **Investigação** (ou plano, hipótese, episódio)
3. Wizard «Nova investigação»: título, contexto, hipótese, plano
4. Ao concluir: toast «Investigação aberta» + drawer do workflow
5. Item aparece na lista com tag de tipo e status

## Superfície técnica

| Tipo | Referência |
|------|------------|
| Rotas web | `/patients/:id` (aba básica) |
| API | `POST /health-threads/wizard/investigation`, `GET /health-threads`, `GET /health-threads/:id/detail` |
| UI | `HealthThreadsPanel.tsx`, `InvestigationWizardModal.tsx`, `HealthThreadDrawer.tsx` |

## Segurança / LGPD

- Acesso via `patient_memberships` / grants família.
- Conteúdo clínico não exposto em telemetria de produto.

## QA

- Suite: [`patient-health-thread`](../testing/suites/patient-health-thread.md)
- Comando: `npm run qa:run -- --suite patient-health-thread`
