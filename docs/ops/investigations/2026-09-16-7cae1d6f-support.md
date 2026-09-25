# Investigação — 2d4920f7-9a06-456f-98ab-a64637ba2f36

- **investigationId:** `7cae1d6f-cc86-4b3a-84d5-3a9d1c94ef91` (`[inv:7cae1d6f]`)
- **Categoria:** `technical_bug`
- **Rota:** `/` (home autenticada)
- **Fingerprint:** `036967be53b57d23` → `ui|ui_boundary|error` (feature fixa `ui`, kind `ui_boundary`, código `Error`)
- **Tier:** 0 (rascunho automático — sem PR de produto)
- **Gatilho:** `auto` (submit do chamado)
- **Ambiente:** `integration` (`environment.deploymentTier`)
- **API:** `http://127.0.0.1:3010` (`environment.apiPublicUrl`)
- **Consentimento técnico:** sim (`consentTechnical: true`)
- **Notas ops:** *(nenhuma no payload)*

## Decodificação do fingerprint

O hash de 16 caracteres é `SHA-256` de `feature|errorKind|errorCode` (minúsculas), truncado — ver `packages/web/src/lib/client-error-fingerprint.ts`.

`reportUiBoundaryError` em `packages/web/src/lib/client-errors.ts` envia sempre `feature: 'ui'` (não deriva da rota `/` → `dashboard`), `errorKind: 'ui_boundary'` e `errorCode` = `error.name` sanitizado (aqui `Error`).

```bash
node -e "const c=require('crypto');console.log(c.createHash('sha256').update('ui|ui_boundary|error').digest('hex').slice(0,16))"
# 036967be53b57d23
```

## Mapeamento rota → UI

| Rota | Componente principal |
|------|----------------------|
| `/` | `packages/web/src/pages/dashboard.tsx` (`Dashboard`) |
| Layout | `AppLayout` → `ActiveCareCircleProvider`, `AvaGlobalDock`, telemetria de tela |
| Boundary global | `AppErrorBoundary` em `packages/web/src/main.tsx` (envolve todo o `App`) |

Falhas de **fetch** no Dashboard (`api.patients.list`, `api.careCircles.dashboard`) são capturadas em `load()` e viram `loadError` + `Alert` — **não** disparam o boundary. O fingerprint indica **exceção em render** (ou lifecycle) capturada por `componentDidCatch` → `AppErrorBoundary`.

## Hipóteses (ranqueadas)

1. **Erro de render no Dashboard ou filho direto** — Data de nascimento / `Form.useWatch` / `MaskedDatePicker`, agrupamento de pacientes por categoria, ou seção day-to-day (`DashboardDayToDaySection`, `DayToDayDiscoveryHub`) com estado inconsistente após resposta parcial da API.
2. **Erro em shell compartilhado na rota `/`** — `AvaGlobalDock`, `CareCircleGlobalSelector`, `RuntimeDegradedBanner` ou `FirstVisitTourDrawer` no `AppLayout` (mesmo fingerprint em outros chamados na mesma rota sugere padrão recorrente, não usuário isolado).
3. **StrictMode + efeito colateral** — boundary no root; double-invoke do React 19 pode expor race entre `AuthContext` / `ActiveCareCircleContext` e primeiro paint do Dashboard (menos provável que hipótese 1–2 sem `properties.component`).

## Evidências no repo

- `packages/web/src/components/errors/AppErrorBoundary.tsx` — telemetria via `reportUiBoundaryError`; `properties.component` = primeira linha útil de `componentStack`.
- `packages/web/src/lib/client-error-playbook.ts` — mensagem genérica feature `ui` / `ReactError`.
- `docs/ops/SUPPORT_REPORTS.md` — triagem `technical_bug`: correlacionar fingerprint + rota; mesmo FP em vários reports → tratar como bug de produto na home, não one-off.
- **Correlação histórica (memória automação):** mesmo fingerprint `036967be53b57d23` em reports `96a2e898`, `1b55aea2`, `07c77172`, `225ff8f1` (rota `/`, integration) — reforça hipótese 2 (shell) ou regressão estável no Dashboard.

## Próximo passo humano

1. No host **integration** (PG local), correlacionar chamado e erros (sem expor PHI na automação):

```sql
SELECT sr.id, sr.route, sr.category, sr.created_at,
       ce.fingerprint, ce.error_code, ce.feature, ce.properties
FROM support_reports sr
LEFT JOIN client_errors ce
  ON ce.account_id = sr.account_id
 AND ce.created_at BETWEEN sr.created_at - INTERVAL '15 minutes'
                       AND sr.created_at + INTERVAL '5 minutes'
WHERE sr.id = '2d4920f7-9a06-456f-98ab-a64637ba2f36';
```

2. Inspecionar `properties->>'component'` nos registros `client_errors` com fingerprint `036967be53b57d23` próximos ao horário do chamado — identifica o componente React que lançou.
3. Reproduzir em `http://localhost:5173/` com a mesma conta/círculo ativo; DevTools → filtrar erros antes do overlay do boundary.
4. Se o componente apontar para Ava ou círculo ativo, abrir issue de engenharia com stack; **Tier 1** só se o fix for trivial nos gates (`docs/ops/automations/TIER1_GATES.md`).

## Categoria (revisão agente)

- **Adequada:** `technical_bug` — boundary + fingerprint de `client_errors`, não confusão de UX nem dado incorreto isolado.
- **Sugestão:** manter categoria; escalar prioridade se SQL mostrar volume alto do mesmo FP em 24h (runbook SUPPORT_REPORTS → incidente).

## Console

http://127.0.0.1:3013?tab=incidentes&investigationId=7cae1d6f-cc86-4b3a-84d5-3a9d1c94ef91&reportId=2d4920f7-9a06-456f-98ab-a64637ba2f36

## Remediação (resumo agente)

Tier 0: investigação documentada; causa raiz depende de `properties.component` no PG. Sem alteração de código nesta execução.
