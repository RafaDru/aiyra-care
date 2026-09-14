# Export clínico — «Levar na consulta»

| Campo | Valor |
|-------|--------|
| **ID** | `patient-clinical-export` |
| **Épico** | `family-day-to-day` |
| **Status** | `done` |
| **Categoria** | negócio |
| **Prioridade** | P1 |

## Resumo

Wizard **Levar na consulta** no perfil do paciente gera um link temporário (48h), QR Code, PDF/impressão e atalho WhatsApp com o resumo clínico consolidado — para o cuidador levar na consulta sem instalar app no celular do médico.

## Objetivo de negócio

- Reduzir fricção na passagem de informação família → médico
- Reutilizar export clínico existente (resumido vs completo)
- Medir adoção via telemetria sem PHI

## Comportamento (usuário)

1. No perfil do paciente (aba básica / contexto clínico), clica **Levar na consulta**
2. Escolhe **Para consulta** (resumo) ou **Completo**
3. O sistema gera link seguro (48h) automaticamente
4. Pode **copiar link**, mostrar **QR Code**, **imprimir/PDF** ou **enviar no WhatsApp**
5. O médico abre o link público (`/clinical-export/:token`) — sem login

## Superfície técnica

| Tipo | Referência |
|------|------------|
| Rotas web | `/patients/:id` (CTA), `/clinical-export/:token` (público) |
| API | `GET /patients/:id/clinical-export`, `POST /patients/:id/clinical-export/shares`, `GET /clinical-export/share/:token` |
| UI | `ConsultVisitWizardModal.tsx`, `ClinicalExportSharePage.tsx`, `PatientContextPanel.tsx` |
| Bus | `clinical-export-bus.ts` — `requestConsultVisitOpen` |
| Telemetria | `consult_visit_share_created`, `consult_visit_link_copied`, `consult_visit_print`, `consult_visit_whatsapp` |

## Modos de export

| Modo | Conteúdo |
|------|----------|
| `summary` | Alertas, medicamentos, pendências, eventos recentes — recomendado para consulta |
| `full` | Inclui exames, laudos, autorizações e demais seções do export completo |

## Segurança / LGPD

- Token opaco, TTL configurável (default 48h)
- Rota pública só via token; sem listagem
- Disclaimer no rodapé do documento — não substitui prontuário oficial
- Telemetria sem texto clínico (`mode` + `patientId` no evento)

## QA

- Suite: [`patient-clinical-export`](../testing/suites/patient-clinical-export.md)
- Comando: `npm run qa:run -- --suite patient-clinical-export`

## Fora de escopo (D1)

- CTA no dashboard (D1 perfil apenas)
- Portal médico autenticado (épico B2B)
- Registro rápido de eventos (D2)
