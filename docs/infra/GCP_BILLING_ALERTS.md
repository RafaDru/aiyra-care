# GCP — alertas de custo (billing budgets)

> Projeto de produção: **`openhealth-503119`** (ver `scripts/setup-env.ps1`).

## Objetivo

Receber e-mail quando gastos de infra (GCS, Compute, APIs de IA) ultrapassam limites mensais — antes de surpresa na fatura.

## Checklist no Console (≈15 min)

1. [Google Cloud Console](https://console.cloud.google.com/) → projeto **openhealth-503119**
2. **Billing** → **Budgets & alerts** → **Create budget**
3. Sugestão de budgets separados (ou um agregado com thresholds):

| Budget | Foco | Threshold sugerido |
|--------|------|-------------------|
| **Infra total** | Todo o projeto | 50% / 90% / 100% do orçamento mensal |
| **Storage** | Cloud Storage (documentos, laudos) | R$ fixo conforme uso esperado |
| **Vertex / Vision / Speech** | OCR e LLM pagos | Alinhar com `OCR_ALLOW_PAID` e uso real |

4. **Alert recipients** — e-mail do responsável técnico/financeiro
5. (Opcional) **Pub/Sub** + Cloud Function para Slack — fora do escopo do app

## gcloud (alternativa CLI)

Requer `gcloud` autenticado e billing account ID:

```bash
# Listar billing accounts
gcloud billing accounts list

# Exemplo: criar budget (ajuste BILLING_ACCOUNT e AMOUNT)
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="OpenHealth monthly cap" \
  --budget-amount=500USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

## Relação com o produto

| Controle | Onde |
|----------|------|
| Franquia OCR/manuscrito por conta | `handwriting_credit_accounts`, `OCR_ALLOW_PAID` |
| Telemetria de custo em eventos | `handwriting_credit_events` (provider, tier, `estimatedCostCents`) |
| Billing Stripe (receita) | `docs/BILLING.md` — separado de custo GCP |

## Roadmap

Item `bill-gcp-infra` — operacional no GCP; não há código no monorepo além deste guia.

Relacionado: `docs/GO_LIVE_TECHNICAL_READINESS.md`, `docs/legal/FISCAL_NFSE.md`.
