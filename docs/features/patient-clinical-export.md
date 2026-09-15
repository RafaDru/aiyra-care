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
4. Pode **copiar link**, mostrar **QR Code**, **imprimir/PDF**, **enviar no WhatsApp** ou **enviar por e-mail ao médico**
5. O link inclui código de indicação (`?ref=`) para atribuição futura (MVP sem billing)
6. O médico abre o link público (`/clinical-export/:token`) — **portal do médico** sem login (D5)

## Superfície técnica

| Tipo | Referência |
|------|------------|
| Rotas web | `/patients/:id` (CTA), `/clinical-export/:token` (público) |
| API | `GET /patients/:id/clinical-export`, `POST /patients/:id/clinical-export/shares`, `POST .../shares/email`, `GET /clinical-export/share/:token` |
| Migration | `066_referral_clinical_export.sql` — `app_accounts.referral_code`, metadados no share |
| UI | `ConsultVisitWizardModal.tsx`, `ClinicalExportSharePage.tsx` (portal médico), `ClinicianShareFeedback.tsx` |
| Bus | `clinical-export-bus.ts` — `requestConsultVisitOpen` |
| Telemetria | `consult_visit_*`, `referral_link_*`, `consult_visit_email_sent`, `clinician_share_*` (público) |

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

## Portal do médico (D5)

- Cabeçalho «Portal do médico» + cartão do paciente + disclaimer
- Feedback «foi útil?» (telemetria pública, sem login)
- CTA «Conhecer o AiyraCare» → landing

## Fora de escopo

- Programa de indicação com billing/descontos (`referral-growth-loop`)
- Conta profissional autenticada / RBAC clínica (`b2b-platform-rbac`)
