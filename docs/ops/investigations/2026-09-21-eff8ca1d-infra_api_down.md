# Investigação — infra_api_down

- **investigationId:** `eff8ca1d-2280-476f-b68e-f9b2897ac4ec`
- **Severidade:** critical
- **Categoria:** infra
- **Mensagem:** API health falhou (no response)
- **Tier:** 0 (rascunho automático)
- **Gatilho:** auto (`investigation.playbook`: `ops-alert-tier0`)
- **Ambiente:** `deploymentTier: preview` — sonda em `http://127.0.0.1:3020` (não inferir pela porta de integração `:3010`)
- **Notas ops:** `triage.humanRequired: true` — critical requer operador. Detalhes da sonda: `error: fetch failed`, `latencyMs: 2`, `checkedAt: 2026-09-21T12:31:22.401Z`.

## Hipóteses

1. **Processo da API preview parado ou crash** (principal) — `GET /health` em `API_PUBLIC_URL` (`:3020`) não aceita conexão; latência ~2 ms indica falha imediata de rede (`fetch failed`), típico de nada escutando na porta.
2. **Stack preview não subida após reboot/sessão** — Ambiente 2 depende de `npm run up:preview` (API `:3020`, web `:5174`, ops `:3023`); worker/console de ops pode estar ativo enquanto a API caiu.
3. **API encerrou por erro de boot** — migração PG, `DATABASE_URL` de `aiyracare_preview`, ou porta em uso; exige `api.log` no host preview.
4. **Menos provável: firewall/localhost** — improvável em `127.0.0.1` no mesmo host da sonda; considerar só se probe rodar em container distinto do processo API.

## Evidências no repo

| Verificação | Resultado |
|-------------|-----------|
| Mapeamento alerta | `packages/api/src/domain/ops/ops-alerts.ts` — `infra_api_down` quando `probe.api.ok === false`; mensagem usa `no response` se sem HTTP status |
| Sonda HTTP | `packages/api/src/application/ops/ops-probe.service.ts` — `fetch` em `${API_PUBLIC_URL}/health`, timeout 15s |
| Runbook | `docs/ops/RUNBOOK_ALERTS.md` § `infra_api_down` — `curl` health, `api.log`, `scripts/up.ps1` / reinício API |
| Preview local | `scripts/up-preview.ps1`, `scripts/preview-validate-local.mjs` — API `:3020`, console ops `:3023` |
| Payload webhook | `alertId: infra_api_down`, `environment.apiPublicUrl: http://127.0.0.1:3020`, `deploymentTier: preview` |
| VM agente (esta execução) | `curl :3020/health` → HTTP 000; `:3023` indisponível — **esperado**: agente não é o host da sonda preview |

## Próximo passo humano

1. No **host onde preview roda**, abrir [console](http://127.0.0.1:3023?tab=issues&investigationId=eff8ca1d-2280-476f-b68e-f9b2897ac4ec&alertId=infra_api_down) → aba Infra → confirmar probe.
2. `curl -sS http://127.0.0.1:3020/health` — deve retornar 200; se conexão recusada, subir ou reiniciar preview: `npm run up:preview` (Windows: `scripts/up-preview.ps1`).
3. Se health continua falhando após subir: revisar log da API preview no host, `DATABASE_URL` → `aiyracare_preview`, Postgres em `:5432`, disco/memória.
4. Se API sobe mas alerta persiste: validar `API_PUBLIC_URL` em `.env.preview` / processo worker ops alinhado com `:3020`.
5. Após recuperação: `npm run preview:validate` ou `npm run ops:triage` para limpar estado; registrar em `docs/HISTORICO.md` se mudança de config.

## Console

http://127.0.0.1:3023?tab=issues&investigationId=eff8ca1d-2280-476f-b68e-f9b2897ac4ec&alertId=infra_api_down

## Remediação (resumo agente)

Tier 0 — sem PR. Hipótese principal: API preview em `:3020` não está escutando (`fetch failed` em ~2 ms). Operador deve reiniciar stack preview e checar `api.log` + PG `aiyracare_preview` no host da sonda.
