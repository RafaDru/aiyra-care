# Playbook — Regularização ambiente (`infra_api_down`)

**Automation:** Aiyra — Regularização ambiente · **Worker:** `machineHint` no payload (My Machines).

**Instructions para colar na UI:** [`docs/automations-aiyra-infra-env-regularization-instructions.md`](../../automations-aiyra-infra-env-regularization-instructions.md).

## Pré-requisitos do payload

- `type === 'ops_alert'`
- `alert_kind === 'infra_api_down'`
- `agentRole === 'infra_env_regularization'`
- `investigation.playbook === 'infra-env-regularization'`
- Executar no worker `machineHint` (não na VM cloud sem stack local).

## Passo 0 — HTTP (Automation, não LLM)

`POST` em `analysisQueue.triageStartedUrl` com header de callback (`x-investigator-callback-key` ou `OPS_METRICS_KEY`).

## 1. Verificação (sem remediação ainda)

| Serviço | URL / comando |
|---------|----------------|
| API | `GET {environment.apiPublicUrl}/health` |
| Web | `GET http://127.0.0.1:5173/` (ou preview `:5174`) |
| CH | `GET http://127.0.0.1:3013/health` |
| Resumo | `npm run env:status` na raiz do monorepo |

Registrar timestamps. Se API **não** OK, aguardar até **60s** (poll 10s) — cold start `tsx watch` é esperado após restart CH (ver auditoria infra).

## 2. Evidência

- `tail -n 80 api.log` na raiz do worktree (erros de bind PG, migração, `CRYPTO_KEY`, porta em uso).
- Opcional: `tail -n 40 web.log` se web down.

**Proibido:** credenciais, `DATABASE_URL`, PHI.

## 3. Remediação (uma tentativa)

Somente se API ainda **down** após 60s e CH `:3013` responde:

1. Preferir stack completo: `powershell -File scripts/up.ps1` (Windows notebook) — **não** mata ops-console.
2. Se CH já reiniciou web e só API falhou: `POST http://127.0.0.1:3013/api/stack/restart` com header ops (`x-internal-ops-key` = `OPS_METRICS_KEY` ou `OPS_CONSOLE_STACK_KEY` se configurado).

Aguardar até **45s** (`AIYRA_API_HEALTH_WAIT_SEC` / `AIYRA_STACK_HEALTH_WAIT_SEC`). **Não** repetir restart no mesmo disparo.

## 4. Re-sonda

- `POST http://127.0.0.1:3013/api/alerts/check` (atualiza probe + alertas), ou
- `npm run ops:probe` se script existir no package root.

## 5. Artefato

`docs/ops/investigations/YYYY-MM-DD-infra_api_down-env-reg.md`:

```markdown
# Regularização — infra_api_down

- **Resultado:** PASS | FAIL
- **machineHint:** …
- **investigationId:** …
- **Gatilho:** auto | manual

## Verificação inicial
…

## api.log (trecho)
…

## Remediação
… (nenhuma | up.ps1 | stack/restart)

## Pós-sonda
- API: ok/fail
- Web: ok/fail
- CH: ok/fail
- Alerta infra_api_down: cleared | still firing

## Próximo passo
…
```

## 6. Callback

```json
{
  "investigationId": "<analysisQueue.id>",
  "remediationSummary": "PASS: API/web/CH OK após up.ps1. Probe limpo." ,
  "analysisArtifactPath": "docs/ops/investigations/YYYY-MM-DD-infra_api_down-env-reg.md"
}
```

Se **FAIL:** `remediationSummary` descreve bloqueio (PG down, erro em api.log) e recomenda Tier 0 SRE / intervenção humana — **sem** segundo restart.

## Limites

- Sem commit de produto, sem merge, sem editar secrets.
- Máximo **1** ciclo de remediação por webhook.
- Falha persistente → documentar e callback FAIL; Rafael decide policy (P2 auto-restart).
