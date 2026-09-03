# Parceiros B2B — segmentos, valor e horizonte marketplace

> **Última atualização:** 2026-09-02  
> Épico roadmap: `b2b-partner-platform`. Mapa visual: [`ECOSYSTEM.md`](./ECOSYSTEM.md).

## Posicionamento

- **Núcleo permanece B2C família** — responsável organiza o cuidado dos filhos (e adultos na conta).
- **B2B** adiciona personas que **participam** do cuidado ou **entregam** dados/serviços — sem virar EMR hospitalar.
- **Numeração P0–P4** no roadmap **organiza ideias**; execução pode priorizar ambientes e produto família antes de B2B piloto.

---

## Segmentos

### 1. Médicos e clínicas

| Jobs-to-be-done | Hoje no app | Gap |
|-----------------|-------------|-----|
| Ver contexto antes/durante consulta | Export PDF, share 48h, resumo determinístico | Portal «só leitura» sem login Aiyra |
| Entender sequência consulta → exame | Timeline, `clinical_entity_links` | UX médico dedicada |
| Receber atualização após sync | Share manual | Notificação opt-in ao médico |

**Pacote roadmap:** `b2b-segment-clinicians`.

---

### 2. Laboratórios

| Jobs-to-be-done | Hoje | Gap |
|-----------------|------|-----|
| Entregar laudo ao paciente/família | Sync **outbound** (Hermes/Fleury, Mater Dei) | **Inbound** API/webhook lab → `Exam` pipeline |
| Estruturar marcadores | `exam_result_items`, parsers | Contrato canônico Connect inbound |

**Pacote roadmap:** `b2b-segment-labs` + `exam-artifact-pipeline`.

---

### 3. Operadoras / planos

| Jobs-to-be-done | Hoje | Gap |
|-----------------|------|-----|
| Beneficiário vê carteira e autorizações | Sync Unimed/Amil | — |
| Gestor corporativo vê carteira do grupo | — | Produto B2B regulado; **discovery legal primeiro** |

**Pacote roadmap:** `b2b-segment-plans` — badge jurídico + regulatório.

---

### 4. Farmácias e drogarias (adesão)

| Jobs-to-be-done | Hoje | Gap |
|-----------------|------|-----|
| Lembrete de medicação | Meds no prontuário, agenda | Push/lembrete adesão |
| Catálogo e reposição | `medication-catalog` (P4) | Integração catálogo |

**Pacote roadmap:** `b2b-segment-pharma` — gate médico em qualquer «recomendação».

---

### 5. Marketplace farmácias / drogarias (horizonte)

**Persona adicional** — não prioridade imediata; **alavanca financeira** no médio/longo prazo.

| Princípio | Detalhe |
|-----------|---------|
| **Sem patrocínio editorial** (inicial) | Lista neutra de farmácias/drogarias; sem destaque pago de SKU |
| **Valor para família** | Reposição, adesão, conveniência com medicação já no app |
| **Valor para farmácia** | Canal qualificado (famílias com contexto de uso) |
| **Receita Aiyra** | Comissão transação, fee parceiro ou assinatura rede — **a definir** |
| **Regulatório** | Propaganda medicamento, ANVISA; não substituir farmacêutico |

**Roadmap:** `b2b-marketplace-pharmacy` (épico `business-ecosystem`).

Diferença vs **adesão (§4):** adesão = saúde/continuidade; marketplace = **transação/comércio** com regras de neutralidade.

---

## Primitives de plataforma (antes de piloto)

| Primitive | Descrição | Status |
|-----------|-----------|--------|
| `organizations` + `organization_members` | Migration **055** — clínica, lab, farmácia, plano | ✅ schema |
| `Organization` entity | `packages/api/src/domain/organization/` | ✅ domínio |
| RBAC + API parceiro | `GET/POST/PATCH/DELETE /organizations` + members (admin/clinician/read_only) | ✅ API mínima |
| Console parceiro | Dashboard imports | backlog |

---

## Piloto sugerido (quando CNPJ + B2B mínimo)

1. **1 clínica pediátrica** — share/export + feedback UX médico.
2. **1 laboratório** — inbound de 1 laudo estruturado/dia em staging.

Métricas: tempo até contexto na consulta, laudos importados sem erro, zero PHI em logs parceiro.

---

## Referências

- [`ECOSYSTEM.md`](./ECOSYSTEM.md) — mapas visuais
- [`LEGAL_COMPLIANCE.md`](./LEGAL_COMPLIANCE.md) — B2C vs B2B contratos
- [`CONNECT.md`](./CONNECT.md) — inbound/outbound
- [`AVA_VISION.md`](./AVA_VISION.md) — horizonte 18m+ portabilidade operadora
