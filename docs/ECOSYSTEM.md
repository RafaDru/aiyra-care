# Ecossistema AiyraCare — personas, valor e plano de negócio

> **Última atualização:** 2026-09-02  
> **Nota:** prioridades P0–P4 no roadmap **organizam temas** — não são uma fila rígida de execução.  
> Complementa: [`B2B_PARTNERS.md`](./B2B_PARTNERS.md), [`roadmap.json`](./roadmap.json).

## Visão em uma frase

**AiyraCare** é a camada familiar que **organiza** histórico clínico disperso (planos, labs, SUS, documentos) com **mínimo esforço manual** — e, no horizonte, conecta **parceiros** que participam do cuidado (médicos, labs, operadoras, farmácias) sem substituir o prontuário oficial.

---

## Mapa de personas

```mermaid
flowchart TB
  subgraph core["Núcleo — sempre"]
    FAM["Família / responsável<br/>B2C"]
    PAT["Paciente<br/>menor ou adulto"]
  end

  subgraph partners["Parceiros — médio prazo B2B"]
    MED["Médico / clínica"]
    LAB["Laboratório"]
    PLAN["Operadora / plano"]
  end

  subgraph horizon["Horizonte — monetização ampliada"]
    PHARM["Farmácia / drogaria<br/>marketplace"]
    PHARM -->|"sem patrocínio inicial"| FAM
  end

  FAM -->|"cuida, importa, exporta"| PAT
  MED -->|"consulta, recebe export/share"| PAT
  LAB -->|"entrega laudos"| PAT
  PLAN -->|"sync autorização/eligibility"| FAM
  PHARM -->|"adesão, compra, lembrete"| FAM

  AIYRA["AiyraCare<br/>Postgres + Connect + Ava"]
  FAM & PAT & MED & LAB & PLAN & PHARM -.-> AIYRA
```

| Persona | Relação com Aiyra | Valor que recebe | Monetização Aiyra (fases) |
|---------|-------------------|------------------|---------------------------|
| **Responsável (B2C)** | Cliente principal hoje | Carteira unificada, sync, export, agenda, Ava | Assinatura família + créditos manuscrito/OCR |
| **Paciente** | Titular dos dados (menor: via responsável) | Histórico centralizado | Indireto (via família) |
| **Médico / clínica** | Parceiro B2B | Contexto na consulta, share seguro, timeline | Seat clínica / API (futuro) |
| **Laboratório** | Parceiro B2B | Canal de entrega estruturada de laudos | Fee por import ou SaaS lab |
| **Operadora** | Fonte de dados (sync) + parceiro regulado | Menos ligação do beneficiário; dados já no app família | Contrato B2B (discovery legal) |
| **Farmácia / drogaria** | Persona horizonte | Alcance a famílias com contexto de medicação | **Marketplace** (comissão/transação), **sem** patrocínio editorial inicial |

---

## Onde Aiyra agrega valor (camadas)

```mermaid
flowchart LR
  subgraph ingest["1 — Captura"]
    PORT["Portais convênio"]
    SUS["gov.br / SUS"]
    DOC["Upload / OCR"]
    CAL["Agenda / calendário"]
  end

  subgraph core["2 — Núcleo clínico"]
    PG["Postgres<br/>entidades"]
    SEQ["Sequência clínica"]
    CTX["Contexto determinístico"]
  end

  subgraph intel["3 — Inteligência (opt-in)"]
    OCR["OCR / laudos"]
    AVA["Ava + pins"]
    NEO["Neo4j associações"]
  end

  subgraph outbound["4 — Saída"]
    EXP["Export / share médico"]
    AGN["Agenda / lembretes"]
    MKT["Marketplace farmácias<br/>horizonte"]
  end

  PORT & SUS & DOC & CAL --> PG
  PG --> SEQ & CTX
  PG --> OCR & AVA & NEO
  CTX --> EXP & AGN
  PG --> MKT
```

**Princípio:** dados clínicos estruturados no Postgres; Neo4j só associações; resumo para consulta **sem inventar com LLM**.

---

## Modelo de negócio (esboço)

```mermaid
quadrantChart
  title Monetização por horizonte (esboço)
  x-axis "Curto prazo" --> "Longo prazo"
  y-axis "Baixo esforço regulatório" --> "Alto esforço regulatório"
  quadrant-1 "B2B labs / clínicas"
  quadrant-2 "Operadoras / dados agregados"
  quadrant-3 "Assinatura família + OCR"
  quadrant-4 "Marketplace farmácias"
```

| Fase | Foco | Dependências |
|------|------|--------------|
| **Agora (pré-CNPJ)** | Produto família, sync, ops, ambientes, docs ecossistema | Estruturação técnica; **sem** cobrança live |
| **Go-live B2C** | Stripe live, compliance, onboarding self-service | CNPJ, NFS-e, pareceres `human-review-gates` |
| **B2B piloto** | Export médico++, lab inbound API, 1 clínica + 1 lab | Org/RBAC, contratos B2B |
| **Marketplace farmácias** | Catálogo med + lembretes + checkout/rede credenciada | Sem patrocínio: lista neutra; LGPD + gate médico em recomendações |

### Marketplace farmácias (horizonte)

- **Não é** patrocínio de produto nem recomendação clínica automática no MVP do marketplace.
- **É** um **grupo de personas** adicional: família encontra farmácia/drogaria para **adesão, reposição ou compra** com contexto de medicação já no app.
- Receita possível: comissão sobre transação, fee de parceiro, ou assinatura para rede de lojas — **discovery** em [`B2B_PARTNERS.md`](./B2B_PARTNERS.md).

---

## Fluxo de valor — família (hoje)

```mermaid
sequenceDiagram
  participant R as Responsável
  participant A as AiyraCare
  participant P as Portal convênio
  participant M as Médico

  R->>A: Vincula integração (1ª vez)
  A->>P: Sync silencioso (sessão)
  P-->>A: Autorizações, exames, consultas
  A->>A: Organiza sequência + contexto
  R->>A: Abre Carteira / Export
  R->>M: Share link ou PDF
  M-->>R: Consulta com contexto confiável
```

---

## Fluxo de valor — horizonte farmácia

```mermaid
sequenceDiagram
  participant R as Responsável
  participant A as AiyraCare
  participant F as Farmácia parceira

  Note over A: Medicação já no prontuário
  R->>A: Lembrete / necessidade de reposição
  A->>F: Pedido ou reserva (marketplace)
  F-->>R: Entrega / retirada
  Note over A,F: Sem destaque patrocinado de SKU
```

---

## Relação com outros documentos

| Doc | Conteúdo |
|-----|----------|
| [`PROJETO.md`](./PROJETO.md) | Produto vivo, integrações |
| [`B2B_PARTNERS.md`](./B2B_PARTNERS.md) | Segmentos B2B + marketplace |
| [`CONNECT.md`](./CONNECT.md) | Captura de portais |
| [`infra/ENVIRONMENTS.md`](./infra/ENVIRONMENTS.md) | Dev / staging / prod |
| [`LEGAL_COMPLIANCE.md`](./LEGAL_COMPLIANCE.md) | LGPD, click-wrap B2C vs contrato B2B |
| [`BILLING.md`](./BILLING.md) | Stripe, pacotes família |

---

## Próximos passos (produto / negócio)

1. Validar mapa com 2–3 conversas (pediatra, familiar beta) — **não bloqueia código**.
2. Piloto B2B clínico + lab antes de marketplace.
3. Marketplace farmácias: discovery regulatório (ANVISA, propaganda) + UX neutra.
