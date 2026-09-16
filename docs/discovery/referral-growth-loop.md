# Discovery — programa de indicação bilateral (paciente ↔ médico)

> **Status:** debate de negócio (não implementado)  
> **Última atualização:** 2026-09-11  
> **Termo:** *referral program* / **programa de indicação** (o “boca a boca” estruturado com incentivo)

Registrado a pedido do Rafael para debate de plano e precificação.

---

## Ideia central

Criar um **loop de crescimento** em que:

1. **Paciente (cuidador)** compartilha extrato/link com o médico e, se o médico aderir a um plano pago AiyraCare (lado profissional), o **paciente ganha desconto** no plano familiar.
2. **Médico** que assina pode **indicar pacientes**; por cada paciente que converte para plano pago, o **médico ganha desconto** (ou crédito) no próprio plano.

**Hipótese:** o extrato “impressionante” na consulta + incentivo econômico aumenta conversão dos dois lados.

---

## Mecânica de atribuição (rascunho)

| Evento | Atribuição |
|--------|------------|
| Paciente gera link/QR de consulta | URL com `?ref=PATIENT_CODE` ou código curto |
| Médico abre link | Cookie/session anônima + log (sem PHI) |
| Médico cria conta profissional | `referral_code` do paciente na signup |
| Paciente assina com código do médico | `referred_by_clinician_id` |

Anti-fraude mínimo:

- Mesmo CPF/conta não pode auto-indicar.
- Teto de desconto (% máximo na fatura).
- Revisão manual em indicações massivas (ops).

---

## Modelos de desconto (debate)

### Opção 1 — Enquanto ativo (*pay-as-they-stay*)

Desconto vale **somente enquanto** o indicado permanece cliente pagante.

| Prós | Contras |
|------|---------|
| Alinha receita recorrente | Família pode perceber como “instável” |
| Menor risco fiscal de subsídio permanente | Mais lógica de billing |

### Opção 2 — Vitalício (*lifetime benefit*)

Desconto fixo permanente após N conversões qualificadas.

| Prós | Contras |
|------|---------|
| Marketing forte («seu desconto é para sempre») | Erosão de margem; difícil reverter |
| Simples de comunicar | Precisa teto ou cap em R$ |

### Opção 3 — Janela temporária (*time-boxed*)

Ex.: 12 meses de 20% após cada conversão qualificada.

| Prós | Contras |
|------|---------|
| Equilíbrio margem vs incentivo | Copy mais complexa |
| Comum em SaaS B2B | Renovação exige novo programa |

### Opção 4 — Créditos em vez de desconto

Créditos para **interpretação OCR / Ava / export premium** — não desconto na assinatura.

| Prós | Contras |
|------|---------|
| Protege margem do plano base | Menos tangível para médico |
| Já alinha `billing_purchases` | Pode confundir usuário free |

**Recomendação inicial para debate:** **Opção 1** no lançamento (menor risco) + comunicar upgrade para Opção 3 como “benefício de fundador” em piloto.

---

## Lado paciente — regras exemplo (não final)

- Cada **médico qualificado** (conta profissional paga) indicado pelo paciente: **−X%** no plano familiar (teto Y%).
- Qualificação: médico completa onboarding profissional + 1º mês pago.
- Máximo Z médicos contando por conta familiar.

## Lado médico — regras exemplo (não final)

- Cada **família qualificada** (plano pago 30d+): **−X%** no plano profissional ou crédito equivalente.
- Dashboard: «N famílias ativas indicadas» + economia acumulada.

---

## Dependências técnicas

| Peça | Existe? |
|------|---------|
| Stripe Billing / `account_entitlements` | Parcial |
| Org + RBAC médico | Org 055; RBAC planned |
| Link export com parâmetro | Fácil extensão |
| Tabela `referrals` / `referral_events` | **Não** — migration futura |
| Termos legais programa indicação | **Não** — advogado |

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| CFM / ética médica (inducement) | Parecer consultor; benefício ligado a ferramenta, não prescrição |
| LGPD (rastrear médico) | Dados mínimos; base legal contrato + legítimo interesse |
| Fiscal (desconto = subsídio?) | Contador — nota fiscal e classificação |
| Fraude auto-referral | Validação CRM/conta; limites |

---

## Métricas

- `referral_link_created` / `referral_link_opened` / `referral_signup_completed`
- CAC efetivo por canal médico vs orgânico
- LTV indicado vs não indicado

---

## Decisões pendentes (para Rafael)

- [ ] Opção de desconto (1–4) ou híbrido?
- [ ] Desconto **simétrico** (mesmo % paciente e médico) ou assimétrico?
- [ ] Plano profissional existe no pricing antes do loop, ou loop só no B2C primeiro?
- [ ] Vitalício é requisito de marketing ou negociável?

Quando fechado: atualizar `roadmap.json` item `referral-growth-loop`, termos em `docs/legal/`, feature card tier 2+ com revisão **legal + fiscal**.
