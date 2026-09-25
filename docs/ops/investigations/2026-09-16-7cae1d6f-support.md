# Investigação — 2d4920f7-9a06-456f-98ab-a64637ba2f36

- **investigationId:** 7cae1d6f-cc86-4b3a-84d5-3a9d1c94ef91
- **Categoria:** technical_bug
- **Rota:** `/`
- **Fingerprint:** `036967be53b57d23` → `ui|ui_boundary|error` (SHA-256 truncado de `feature|errorKind|errorCode`)
- **Tier:** 0 (rascunho automático)
- **Gatilho:** auto
- **Ambiente:** integration (`environment.deploymentTier`)
- **API:** http://127.0.0.1:3010 (`environment.apiPublicUrl`)
- **reportId:** 2d4920f7-9a06-456f-98ab-a64637ba2f36
- **Notas ops:** *(nenhuma no payload)*

## Decodificação do fingerprint

| Campo | Valor |
|-------|--------|
| `feature` | `ui` (fixo em `reportUiBoundaryError`) |
| `error_kind` | `ui_boundary` |
| `error_code` | `Error` (nome da exceção JS, ex. `error.name`) |

Referências:

- `packages/web/src/lib/client-error-fingerprint.ts` — `computeClientErrorFingerprint`
- `packages/web/src/lib/client-errors.ts` — `reportUiBoundaryError` usa `feature: 'ui'`, não `deriveFeatureFromRoute`
- `packages/web/src/components/errors/AppErrorBoundary.tsx` — `componentDidCatch` → telemetria

A rota `/` mapeia para **`Dashboard`** (`packages/web/src/pages/dashboard.tsx` via `App.tsx`), mas o fingerprint **não** reflete `dashboard` — só `ui`, o que dificulta a matriz Saúde por feature no console.

## Hipóteses

1. **Exceção de render no dashboard (principal)** — O usuário estava em `/` (lista de perfis). Falhas de API em `load()` viram `loadError` (Alert) e **não** disparam error boundary. O fingerprint indica falha capturada pelo **`AppErrorBoundary` raiz** (`main.tsx`): algum filho lançou durante render/commit (ex.: bloco «Hoje» — `DashboardDayToDaySection` → `WalletTodayPanel` / `useAvaPatientLens`; cards com dados atípicos; ou chrome global em `AppLayout` — Ava, círculos de cuidado, banner degradado).
2. **Granularidade de telemetria insuficiente para triagem remota** — `properties.component` no PG (primeira linha do `componentStack`) identificaria o componente, mas o agente não acessa PG. Vários chamados integration na mesma rota com o **mesmo** fingerprint sugerem causa **sistêmica** (regressão ou dependência compartilhada), não dado clínico de um perfil.
3. **Confusão improvável com API/network** — Fingerprints `api:*` e `network` usam outros prefixes; categoria `technical_bug` está **adequada** (falha de UI não tratada localmente).

## Evidências no repo

| Artefato | Observação |
|----------|------------|
| `App.tsx` L42 | `Route path="/"` → `<Dashboard />` |
| `AppErrorBoundary.tsx` L26–28 | Reporta `ui_boundary` com `error.name \|\| 'Error'` |
| `dashboard.tsx` | Lista pacientes + modais; erros de fetch tratados sem boundary |
| `DashboardDayToDaySection.tsx` | Monta `WalletTodayPanel` quando há pacientes — candidato a repro |
| `docs/ops/TELEMETRY.md` | Dimensões `client_errors`; correlacionar com `support_reports` via SQL do runbook |
| `docs/ops/SUPPORT_REPORTS.md` | Triagem `technical_bug` → fingerprint + rota |

## Próximo passo humano

1. No host **integration**, abrir o console (link abaixo) e o detalhe do chamado `2d4920f7…`.
2. Com acesso PG autorizado, correlacionar erros na janela do reporte (**sem PHI**):

```sql
SELECT ce.fingerprint, ce.feature, ce.error_kind, ce.error_code,
       ce.properties->>'component' AS component_hint,
       ce.created_at
FROM support_reports sr
JOIN client_errors ce
  ON ce.account_id = sr.account_id
 AND ce.fingerprint = '036967be53b57d23'
 AND ce.created_at BETWEEN sr.created_at - INTERVAL '15 minutes'
                       AND sr.created_at + INTERVAL '5 minutes'
WHERE sr.id = '2d4920f7-9a06-456f-98ab-a64637ba2f36';
```

3. Reproduzir em http://localhost:5173/ (ou stack integration) com DevTools → ver stack no overlay do boundary; confirmar componente em `properties.component`.
4. Se `component_hint` apontar para `WalletTodayPanel` / Ava / círculos — abrir issue de engenharia com stack; considerar **Tier 1** só se fix local &lt; 200 linhas (ex.: guard de render ou enriquecer fingerprint com rota).
5. Avaliar melhoria ops (backlog): passar `deriveFeatureFromRoute(window.location.pathname)` ou prop `feature="dashboard"` no boundary interno ao layout autenticado.

## Console

http://127.0.0.1:3013?tab=incidentes&investigationId=7cae1d6f-cc86-4b3a-84d5-3a9d1c94ef91&reportId=2d4920f7-9a06-456f-98ab-a64637ba2f36

## Remediação (resumo agente — Tier 0)

Fingerprint mapeado para React Error Boundary genérico na home (`/` → Dashboard). Categoria `technical_bug` confirmada. Próximo passo: SQL acima + repro local usando `properties.component` no PG; sem alteração de código neste run.
