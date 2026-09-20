# Estratégia financeira — Rodada 1 (AiyraCare)

> **Atualizado:** 2026-09-18  
> **Escopo:** gestão, contábil e fiscal **pré-CNPJ** · Stripe **test** · gates humanos (`human-review-gates`)  
> **Audiência:** Rafael + operação; insumo para contador/advogado — **não substitui** parecer profissional.

| Campo | Valor |
|-------|--------|
| **Roadmap** | `human-review-gates` · `billing-monetizacao` · `legal-lgpd-compliance` |
| **Par marketing** | [`marketing-strategy-round1.md`](./marketing-strategy-round1.md) — preços, promoções e limites de campanha |
| **Analytics receita** | [`biz-analytics-lgpd-guardrails.md`](./biz-analytics-lgpd-guardrails.md) §4.8 |

---

## Avisos

- Este documento é **orientação operacional** para alinhar produto, Stripe e Contabilizei. **Não é consultoria jurídica nem contábil.**
- Decisões de enquadramento tributário, CNAE, regime (Simples/Lucro), alíquotas e obrigações acessórias exigem **contador** 🧑‍⚖️ e, quando couber, **advogado** 🧑‍⚖️.
- Impostos na §8 são **visão high-level** para planejamento — validar com contador antes de qualquer cobrança live.

---

## 1. Estado atual (snapshot)

### 1.1 Produto e billing (tech)

| Área | Status | Evidência |
|------|--------|-----------|
| Modelo de créditos + entitlements | ✅ Entregue | Épico `billing-monetizacao` (`done`) |
| Checkout pacotes + assinatura família | ✅ Sandbox test | `docs/BILLING.md` |
| Webhook → créditos / plano família | ✅ | `POST /billing/webhook` |
| Customer Portal | ✅ Test | `/settings/plan` |
| Export fiscal operador | ✅ | `GET /billing/export/contabilizei` + `export-billing-contabilizei.mjs` |
| Stripe **live** | ⬜ Planejado | `bill-stripe-production` → `hr-stripe-live` |
| NFS-e automatizada no app | ⬜ Fora do MVP | Processo manual em `docs/legal/FISCAL_NFSE.md` |

**Ofertas atuais (sandbox test, 2026-08-17):**

| Oferta | Preço | Lookup |
|--------|-------|--------|
| Plano grátis | R$ 0 | franquia default **10** créditos LLM/mês (`BILLING_FREE_MONTHLY_FREE`) |
| Plano família (mensal) | **R$ 19,90** | `family_monthly` · franquia **40** créditos/mês (`BILLING_FAMILY_MONTHLY_FREE`) |
| Pacote 10 interpretações | **R$ 29,00** | one-time `pack_10` |
| Pacote 30 interpretações | **R$ 69,00** | one-time `pack_30` |

### 1.2 Regulação e gates humanos

Épico **`human-review-gates`** (P0, `in_progress`) — tecnologia pronta; go-live **B2C público com cobrança** bloqueado até:

| Gate | ID | Responsável |
|------|-----|-------------|
| Textos legais v1.0 | `hr-legal-texts` | Advogado |
| NFS-e + Contabilizei | `hr-fiscal-nfse` | Contador |
| Stripe live + razão social/CNPJ na UI | `hr-stripe-live` | Contador + advogado |
| DPO e-mail real | `hr-dpo-channel` | Advogado/DPO |
| Compliance + tier 3 go-live | `hr-security-go-live` | Segurança (pentest opcional) |

Fila resumida: `docs/HUMAN_REVIEW_QUEUE.md`.

### 1.3 Contexto negócio (HISTORICO)

- **2026-09-02:** CNPJ em **regularização**; cobrança live **adiada**; prioridade em ambientes, massas sintéticas e discovery B2B (`docs/HISTORICO.md`).
- **2026-08-13:** Stripe — tarifa por transação (+ **0,7%** Billing em assinaturas); payout via **PJ + Contabilizei**; gateways BR com subadquirente; credenciamento direto só com volume.
- **MVP uso diário:** preview local estável **sem** exigir Stripe live, CNPJ ou landing pública (`docs/mvp-finish-plan.md` no Project store).

### 1.4 O que já pode ser feito sem CNPJ

- Desenvolver e testar fluxos em **Stripe test** (`sk_test_`, webhooks via CLI/tunnel).
- Export CSV mensal para **simular** conciliação (`export-billing-contabilizei.mjs`).
- Medir funil billing em ops (**agregado**, sem PII): `biz-analytics-lgpd-guardrails.md` §4.8.
- Controlar **custo variável** (LLM/OCR) com quotas e orçamento interno (`docs/LLM_USAGE.md`).

### 1.5 O que **não** fazer antes do checklist §3

- Ativar `sk_live_` ou cobrar cartão real de clientes finais.
- Prometer descontos/referral com impacto fiscal sem desenho contábil (ver marketing § promo limits).
- Emitir NFS-e “de verdade” sem CNPJ ativo e orientação municipal.

---

## 2. CNPJ · NFS-e · Contabilizei — checklist acionável

### 2.1 CNPJ e estrutura PJ 🧑‍⚖️

| # | Ação | Owner | Notas |
|---|------|-------|-------|
| C1 | Confirmar **status** da regularização (abertura vs alteração) | Rafael + contador | Bloqueia live |
| C2 | Definir **razão social** e nome fantasia para UI (`LEGAL_ENTITY_NAME`) | Rafael + advogado | `hr-stripe-live` |
| C3 | Escolher **CNAE** para SaaS / licenciamento de software / serviços de TI | Contador | Impacta ISS e Simples |
| C4 | Regime tributário (**Simples** vs Lucro) e anexo | Contador | Projeção com receita B2C §7 |
| C5 | Conta PJ bancária alinhada à **Contabilizei** | Rafael | Payout Stripe |
| C6 | Publicar CNPJ na app quando aprovado (`LEGAL_CNPJ` + textos legais revisados) | Produto + advogado | `legal-lawyer-review` |

### 2.2 Stripe (conta PJ)

| # | Ação | Owner |
|---|------|-------|
| S1 | Completar onboarding Stripe **Brasil** com dados da PJ | Rafael |
| S2 | Vincular conta bancária PJ (mesma da Contabilizei) | Rafael |
| S3 | Criar **Products/Prices live** espelhando sandbox (ou migrar lookup keys) | Rafael + eng |
| S4 | Webhook produção `https://<api>/billing/webhook` + `whsec_` em secrets | Eng |
| S5 | Ativar Customer Portal live; return URL produção | Eng |
| S6 | Testar 1 cobrança real mínima + estorno em homologação fiscal | Rafael + contador |

### 2.3 NFS-e 🧑‍⚖️

Processo detalhado: repositório `docs/legal/FISCAL_NFSE.md`.

| # | Ação | Owner |
|---|------|-------|
| N1 | Credenciais NFS-e **município** (BH ou domicílio fiscal) | Contador |
| N2 | Modelo de **discriminação** do serviço (assinatura vs pacote avulso) | Contador |
| N3 | Regra: **uma nota por receita** (recorrente na competência; avulso na data do pagamento) | Contador |
| N4 | Tomador: e-mail `app_accounts` + nome `account_profiles` quando houver | Operação |
| N5 | Referência cruzada: `stripe_session_id` / `stripe_payment_intent_id` + `amount_cents` | Operação / export CSV |
| N6 | Primeira nota **piloto** após primeira venda live | Contador |

### 2.4 Contabilizei — rotina mensal

| # | Ação | Frequência |
|---|------|------------|
| B1 | Rodar `node packages/api/scripts/export-billing-contabilizei.mjs [YYYY-MM]` | Mensal (D+1 após fechamento) |
| B2 | Importar extrato/payout **Stripe** na Contabilizei | Semanal ou mensal (definir com contador) |
| B3 | Conciliar: **bruto** − taxa Stripe = **líquido** na conta | Mensal |
| B4 | Registrar ISS e demais guias conforme regime | Contador |
| B5 | Arquivar CSV export + comprovantes Stripe (retenção fiscal) | Contador |

**Campos do export:** pacotes `billing_purchases` (`completed`); assinaturas via `account_entitlements` + eventos webhook.

---

## 3. Stripe test vs live

| Dimensão | Test (hoje) | Live (pós-gates) |
|----------|-------------|------------------|
| Chaves | `sk_test_` / `whsec_` local | `sk_live_` em secret manager GCP |
| Cartões | 4242… | Cartões reais; PCI só no Stripe |
| Payout | Simulado | Conta PJ; D+ conforme Stripe BR |
| NFS-e | Opcional simulação | Obrigatório por receita (processo §2.3) |
| UI plano | Checkout funcional em dev/preview | Mesmo código; prices live |
| Métricas negócio | Eventos `billing_checkout_*` em PG de **preview** separado | Instância prod — não misturar KPIs |

**Ritual técnico antes de live:** checklist `hr-stripe-live` + `docs/BILLING.md` + smoke `GET /billing/me` após webhook.

**Referral / cupons:** fora do MVP (`mvp-finish-plan.md`); qualquer promoção futura deve respeitar limites de margem e registro contábil — ver [`marketing-strategy-round1.md`](./marketing-strategy-round1.md).

---

## 4. Conciliação receita (Stripe ↔ app ↔ contabilidade)

```text
Cliente → Stripe Checkout/Portal → webhook → PG (purchases + entitlements)
                    │
                    ├─ Dashboard Stripe (bruto, taxas, reembolsos)
                    │
                    └─ Export AiyraCare CSV → Contabilizei → NFS-e → livro caixa
```

| Camada | Fonte da verdade | Uso financeiro |
|--------|------------------|----------------|
| **Receita reconhecida (produto)** | `billing_purchases`, `account_entitlements`, webhooks | Export mensal |
| **Caixa / liquidação** | Payout Stripe | Contabilizei |
| **Fiscal** | NFS-e emitida | Competência ISS 🧑‍⚖️ |
| **Analytics** | `metrics.business` billing (centavos agregados) | Funil; não substitui contabilidade |

**Reconciliação mínima mensal:**

1. Soma `amount_cents` export CSV = soma pagamentos **sucesso** Stripe (menos reembolsos).
2. Conferir contagem de assinaturas ativas: Stripe subscriptions vs `account_entitlements` plano família.
3. Divergência webhook: logs `stripe_webhook_rejected` (ops) — corrigir antes de fechar mês.

Operadores autorizados: `BILLING_EXPORT_ACCOUNT_IDS`.

---

## 5. Custos — LLM, OCR e infra

### 5.1 Custo variável (margem do produto)

| Item | Controle | Doc |
|------|----------|-----|
| Ava + manuscrito (cliente) | Créditos/tokens por conta; pacotes premium | `docs/LLM_USAGE.md` |
| Classificação operadora (interno) | Teto **R$ 100/mês** default (`LLM_INTERNAL_MONTHLY_BUDGET_CENTS`) | `llm-internal-cost-policy` |
| OCR pago (Google Vision) | `OCR_ALLOW_PAID=0` desliga fallback pago | billing `bill-ocr-paid-guard` |
| Telemetria custo/interpretação | `handwriting_credit_events.estimatedCostCents` | Ops / futuro unit economics |

**Regra de ouro:** preço de pacote (R$ 29 / R$ 69) deve cobrir **pior caso** de mix modelo (Pro/Vision) — revisar trimestralmente com `npm run llm:internal-usage:top` e amostra de eventos cliente.

### 5.2 Custo fixo / infra

| Item | Controle |
|------|----------|
| GCP `openhealth-503119` | Budgets 50/90/100% — `docs/infra/GCP_BILLING_ALERTS.md` |
| Supabase, Resend, domínios | Planos mensais; revisar ao subir preview GCP |
| Stripe | % + fixo por transação; +0,7% Billing em assinaturas (HISTORICO) |
| Contabilizei + contador | Fixo mensal PJ |

### 5.3 Indicadores internos sugeridos (pré-scale)

| KPI | Fonte | Meta inicial (orientativa) |
|-----|-------|----------------------------|
| Receita líquida Stripe / MRR | Stripe + export | Acompanhar após live |
| Custo LLM cliente / R$ receita | events + purchases | < 30–40% (ajustar com contador) |
| Custo infra / MRR | GCP billing | Alerta antes de 20% MRR |
| Conversão checkout | `metrics.business` §4.8 | Produto/marketing |

---

## 6. Cenário B2C — assinatura família + pacotes

### 6.1 Modelo atual (hipótese de go-live)

- **Free:** aquisição e hábito; franquia limitada (10 créditos/mês).
- **Família R$ 19,90/mês:** receita recorrente previsível; 40 créditos — alinhado a household multi-paciente.
- **Pacotes avulsos:** upsell esporádico (interpretações manuscrito / premium tier).

Referência de posicionamento e **limites de promoção** (desconto máximo, duração, referral): [`marketing-strategy-round1.md`](./marketing-strategy-round1.md).

### 6.2 Unit economics ilustrativo (não auditado)

Valores **aproximados** para conversa com contador — atualizar com taxas Stripe reais e custo médio por crédito.

| Linha | Família R$ 19,90/mês | Pacote R$ 29 (10 cr.) |
|-------|------------------------|------------------------|
| Receita bruta | R$ 19,90 | R$ 29,00 |
| Taxa Stripe (~) | ~R$ 1,0–1,5 + 0,7% Billing | ~% + fixo |
| Custo LLM médio (hipótese) | Depende de uso 40 cr. | Depende de mix Pro |
| Margem contrib. (antes ISS/IR) | Validar com uso real | Maior por transação |

**Assinatura:** priorizar retenção (portal cancelamento, valor percebido carteira/sync). **Pacotes:** margem por transação maior; útil para picos (consulta, laudos).

### 6.3 Política comercial alinhada a fiscal

- Preços em **BRL**; nota em reais; Stripe já em BRL na sandbox.
- Evitar “desconto permanente” não refletido em price ID Stripe (dupla escrituração).
- Cupons Stripe futuros: cadastrar política com contador (base de cálculo ISS, campanha com prazo).
- **Referral com billing:** fora do MVP — quando entrar, tratar como **redução de receita** ou marketing expense 🧑‍⚖️.

---

## 7. Impostos — visão high-level 🧑‍⚖️

> **Não é parecer fiscal.** Use como roteiro de perguntas ao contador.

| Tema | Pergunta típica | Notas AiyraCare |
|------|-----------------|-----------------|
| **ISS** | Município de incidência? Alíquota serviço software? | NFS-e por venda; SaaS B2C nacional |
| **Simples Nacional** | Anexo III vs V? Fator R? | Receita inicial baixa favorece simplicidade |
| **PIS/COFINS** | Incluso no Simples? | Se lucro real/presumido, outro desenho |
| **IRPJ/CSLL** | Dentro do Simples? | |
| **Retenções** | Aplicável B2C PF? | Em geral **não** para consumidor final |
| **CDC / nota** | Informações obrigatórias na nota? | Descrição clara do serviço digital |
| **LGPD** | Separado do fiscal | Não confundir base legal de dados com tributos |

**Momento de acionar contador:** antes da **primeira** cobrança live e ao cruzar **R$ 60k**/12 meses (limite micro — confirmar legislação vigente).

---

## 8. Timeline correlacionada — go-live, produto e marketing

Fases alinhadas a `docs/project-snapshot.md` (Project store) e `mvp-finish-plan.md`.

| Fase | Foco financeiro | Marketing / receita | Gates |
|------|-----------------|---------------------|-------|
| **A1 — Integração local** | Stripe test; export CSV de teste; custo LLM sob controle | Sem campanha paga; só piloto fechado | — |
| **A2 — Preview local estável** | Mesmo test; validar export em `aiyracare_preview` | Soft launch convidados; **sem** cobrança live | — |
| **Pré-go-live B2C** | Fechar checklist §2; contador valida NFS-e | Alinhar preço/promo com [`marketing-strategy-round1.md`](./marketing-strategy-round1.md) | `hr-legal-texts`, `hr-fiscal-nfse`, `hr-stripe-live` |
| **Go-live público** | Stripe live; rotina mensal Contabilizei | Landing, aquisição paga (limites de CAC vs §6.2) | `hr-security-go-live`, DPO real |
| **Pós-live 90 dias** | Revisar margem LLM; ajustar preços se necessário | Cortar promo que erode margem | Revisão contábil trimestral |

**Ordem recomendada (financeiro):**

1. CNPJ ativo + conta PJ  
2. Processo NFS-e ensaiado (nota teste)  
3. Stripe live + 1 cliente real interno  
4. Advogado publica textos + CNPJ na UI  
5. Abrir campanha marketing conforme doc de marketing  

**Não inverter:** marketing amplo **antes** de `hr-stripe-live` + NFS-e — risco de receita sem documento fiscal.

---

## 9. Próximas ações (Rafael — esta semana)

| Prioridade | Ação |
|------------|------|
| P0 | Status CNPJ com contador Contabilizei — desbloquear S1–S6 |
| P0 | Agendar 30 min “NFS-e piloto” com contador (checklist §2.3) |
| P1 | Espelhar prices live no Dashboard quando PJ estiver pronta |
| P1 | Definir dia fixo no mês para export + conciliação (§2.4) |
| P2 | Com marketing: teto de desconto e duração de campanha ([`marketing-strategy-round1.md`](./marketing-strategy-round1.md)) |
| P2 | Revisar `LLM_INTERNAL_MONTHLY_BUDGET_CENTS` vs uso real antes de escalar usuários |

---

## 10. Referências no repositório

| Documento | Uso |
|-----------|-----|
| `docs/BILLING.md` | Stripe env, produtos, webhooks |
| `docs/legal/FISCAL_NFSE.md` | NFS-e + Contabilizei |
| `docs/legal/LAWYER_REVIEW_CHECKLIST.md` | Textos + entidade legal |
| `docs/LLM_USAGE.md` | Custo cliente vs interno |
| `docs/infra/GCP_BILLING_ALERTS.md` | Infra |
| `docs/HUMAN_REVIEW_QUEUE.md` | Fila profissional |
| `docs/roadmap.json` | Épicos citados |
| `docs/HISTORICO.md` | Decisões Stripe/PJ/CNPJ |

---

## Histórico

| Data | Alteração |
|------|-----------|
| 2026-09-18 | Rodada 1 — estratégia financeira pré-CNPJ; cross-link marketing e analytics LGPD |
