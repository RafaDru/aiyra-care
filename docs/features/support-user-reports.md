# Reportar problema (suporte com consentimento LGPD)

| Campo | Valor |
|-------|--------|
| **ID** | `support-user-reports` |
| **Épico** | `prod-run-intelligence` |
| **Status** | `in_progress` |
| **Categoria** | técnico |
| **Prioridade** | P1 |

## Resumo

Botão global **Reportar problema** permite ao cuidador abrir um chamado interno com consentimento granular. Por padrão captura só metadados (rota, erros recentes, eventos de produto); dados clínicos e captura de tela ficam para opt-in futuro.

## Objetivo de negócio

- Investigar bugs e relatos sem depender só de inferência em `client_errors`
- Respeitar LGPD: finalidade de suporte, minimização, TTL, transparência na UI

## Comportamento (usuário)

1. Em qualquer tela autenticada, clica **Reportar problema** no header
2. Escolhe categoria (erro técnico, dado incorreto, UX, outro)
3. Opcionalmente descreve o que viu
4. Marca consentimentos:
   - **Contexto técnico** (default on): erros/eventos recentes sem PHI
   - **Acesso ao perfil** (7 dias): equipe pode consultar o perfil para este chamado
5. Recebe confirmação com ID curto do chamado

## Superfície técnica

| Tipo | Referência |
|------|------------|
| Rotas web | Todas (botão em `AppLayout`) |
| API | `POST /support/reports`, `GET /support/reports`, `GET /support/reports/:id` |
| Tabelas PG | `support_reports` (migration **061**) |
| UI | `packages/web/src/components/support/SupportReportModal.tsx` |
| Telemetria | `support_report_submitted` em `product_events` |

## Bundle diagnóstico (com `consentTechnical`)

- Últimos 15 `product_events` (2h / mesma sessão)
- Últimos 10 `client_errors` (24h)
- Último `sync_jobs` failed do paciente em contexto (se `patientId` na rota)
- Contexto cliente allowlisted: locale, viewport, theme

**Não inclui:** mensagens Ava, OCR, valores de exame, credenciais.

## Retenção

| Campo | Valor |
|-------|--------|
| `expires_at` | +30 dias |
| `profile_access_until` | +7 dias se opt-in |

## Fora de escopo (MVP)

- Captura de screenshot na UI (API pronta)
- Fila no ops console `:3013`
- Webhook Slack / agente investigador / PR automático
- Criptografia KMS do bundle (JSON já sanitizado)

## Dependências

- `product_events` (049), `client_errors` (051)
- `docs/OBSERVABILITY.md`, `docs/legal/DATA_PROCESSING_MAP.md`

## Métricas / sucesso

- Volume de `support_report_submitted` por categoria
- Tempo médio open → resolved (fase 2)
- % relatórios com `consentTechnical` (esperado alto)

## Ver também

- [`docs/OBSERVABILITY.md`](../OBSERVABILITY.md)
- [`docs/ops/SUPPORT_REPORTS.md`](../ops/SUPPORT_REPORTS.md) — runbook ops (sessão **Aiyra: Ops**)
- [`docs/ops/TELEMETRY.md`](../ops/TELEMETRY.md)
- [`docs/OPERATION_MODEL.md`](../OPERATION_MODEL.md) Fase 3–5
- `docs/roadmap.json` → `run-support-user-reports`
