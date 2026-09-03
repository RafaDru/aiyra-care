# Organizações B2B — API primitives

| Campo | Valor |
|-------|--------|
| **ID** | `b2b-platform-orgs` |
| **Épico** | `b2b-partner-platform` |
| **Status** | `done` (API mínima; sem UI parceiro) |
| **Categoria** | técnico |
| **Prioridade** | P3 |

## Resumo

CRUD de **organizações** (clínica, lab, farmácia, plano) e **membros** com RBAC (`admin`, `clinician`, `read_only`). Separação explícita do modelo **família B2C** (`care_circles` — ver `family-access-model`).

## Objetivo de negócio

- Base para console parceiro, API inbound de labs e seats clínicos.
- Piloto B2B sem misturar com `patient_memberships`.

## Superfície técnica

| Tipo | Referência |
|------|------------|
| Migration | `055_organizations.sql` |
| Domain | `packages/api/src/domain/organization/` |
| API | `GET/POST/PATCH/DELETE /organizations`, members sub-routes |
| Testes | `organization.service.test.ts` |

## Fora de escopo

- UI console parceiro.
- API keys / webhooks (`b2b-partner-api` backlog).

## Ver também

- [`docs/B2B_PARTNERS.md`](../B2B_PARTNERS.md)
