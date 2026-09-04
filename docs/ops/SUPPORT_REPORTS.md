# Runbook — Reportar problema (`support_reports`)

> Migration **061** · épico `run-support-user-reports` · feature [`support-user-reports`](../features/support-user-reports.md)

## O que é

Chamado iniciado pelo usuário no app (botão no header). Diferente de `client_errors` (automático): há **intenção** + **consentimento** + descrição opcional.

| Campo | Significado |
|-------|-------------|
| `category` | `technical_bug` \| `incorrect_data` \| `ux_confusion` \| `other` |
| `consent_technical` | Anexa bundle: `product_events`, `client_errors`, último sync fail |
| `consent_profile_access` | `profile_access_until` = +7 dias — equipe pode consultar perfil **para este chamado** |
| `expires_at` | +30 dias — retenção do chamado |
| `diagnostic_context` | JSONB — **sem PHI** se só técnico |

Telemetria paralela: `product_events.support_report_submitted` com `properties.kind` = categoria.

---

## Fluxo ops (hoje — MVP)

```text
Usuário → POST /support/reports → PG support_reports (open)
                ↓
        support_report_submitted (product_events)
                ↓
        [manual] SELECT no PG ou futura fila no console :3013
```

**Ainda não há:** webhook, painel no console, status `triaged` automático.

---

## Queries úteis

```sql
-- Fila aberta (mais recentes)
SELECT id, category, route, description,
       consent_technical, consent_profile_access,
       profile_access_until, created_at
FROM support_reports
WHERE status = 'open'
ORDER BY created_at DESC
LIMIT 20;

-- Chamados de uma conta (suporte com ID do usuário)
SELECT id, status, category, route, created_at, expires_at
FROM support_reports
WHERE account_id = '<uuid>'
ORDER BY created_at DESC;

-- Volume por categoria (7d)
SELECT category, COUNT(*) AS n
FROM support_reports
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY 1;

-- Correlacionar com erros na mesma hora (mesma conta)
SELECT sr.id, sr.route, sr.created_at,
       ce.fingerprint, ce.error_code
FROM support_reports sr
LEFT JOIN client_errors ce
  ON ce.account_id = sr.account_id
 AND ce.created_at BETWEEN sr.created_at - INTERVAL '15 minutes'
                       AND sr.created_at + INTERVAL '5 minutes'
WHERE sr.id = '<report-uuid>';
```

### Inspecionar bundle (só ambiente autorizado)

```sql
SELECT diagnostic_context
FROM support_reports
WHERE id = '<uuid>';
```

Conteúdo esperado com `consent_technical`:

- `recentProductEvents` — allowlist
- `recentClientErrors` — fingerprints
- `lastSyncFailure` — job id, portal, error truncado
- `client` — locale, viewport, theme

**Não deve conter:** mensagens Ava, valores de exame, senhas.

---

## Triagem sugerida

| Categoria | Primeiro olhar | Fila |
|-----------|----------------|------|
| `technical_bug` | `client_errors` fingerprint + rota | Engenharia |
| `incorrect_data` | Higiene / dedup / sync source | Produto + dados |
| `ux_confusion` | `product_events` funil da rota | Produto / design |
| `other` | Descrição livre do usuário | Triagem manual |

### Severidade rápida

| Sinal | Ação |
|-------|------|
| Mesmo fingerprint >5 usuários / 24h | Incidente — ver [`RUNBOOK_ALERTS.md`](./RUNBOOK_ALERTS.md) |
| 1 usuário, rota isolada | Bug local / edge case |
| `incorrect_data` + sync recente | Checar `sync_jobs` + portal |

---

## LGPD — acesso do operador

1. **Descrição livre** do usuário pode conter dado de saúde — tratar como sensível; não colar em Slack.
2. **Bundle técnico** — legítimo interesse / suporte contratual; minimizado.
3. **`consent_profile_access`** — só então abrir perfil no app ou queries clínicas auditadas; registrar quem acessou (futuro: audit log).
4. Após `expires_at` — chamado elegível a purge (job futuro).

Atualizar [`DATA_PROCESSING_MAP.md`](../legal/DATA_PROCESSING_MAP.md) se mudar retenção ou finalidade.

---

## API (referência)

| Método | Rota | Quem |
|--------|------|------|
| POST | `/support/reports` | Usuário autenticado |
| GET | `/support/reports` | Própria conta |
| GET | `/support/reports/:id` | Própria conta |

**Futuro ops:**

| Método | Rota | Quem |
|--------|------|------|
| GET | `/ops/support-reports?status=open` | `x-internal-ops-key` |
| PATCH | `/ops/support-reports/:id` | `triaged` / `resolved` |

---

## Backlog (sessão Aiyra: Ops)

- [ ] Painel **Suporte** no `packages/ops-console` (lista open + link bundle)
- [ ] `SUPPORT_REPORT_WEBHOOK_URL` — payload sem PHI (id, category, route, fingerprint top)
- [ ] Job purge `expires_at < NOW()`
- [ ] Agrupamento automático por fingerprint + `app_version`
- [ ] Agente investigador (Tier 0–1) — ver hub [`README.md`](./README.md)

---

## Teste em preview

Checklist: [`PREVIEW_LOCAL_TEST_GUIDE.md`](../infra/PREVIEW_LOCAL_TEST_GUIDE.md) — item «Reportar problema».

```powershell
npm run up:preview
# App :5174 → Reportar problema → conferir PG preview
```
