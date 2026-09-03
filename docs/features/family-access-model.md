# Família — múltiplos cuidadores e acesso por perfil

| Campo | Valor |
|-------|--------|
| **ID** | `family-access-model` |
| **Épico** | `family-access-model` |
| **Status** | `in_progress` (fase 2 — care circles + convites entregues; audit log pendente) |
| **Categoria** | negócio |
| **Prioridade** | P1 |

## Resumo

Modelar explicitamente a diferença entre **conta** (login e pagamento), **família/círculo de cuidado** (agrupamento) e **perfil de saúde** (histórico clínico). Permitir múltiplos responsáveis com **visibilidade diferente por perfil** — incluindo famílias reconstituídas (ex.: mesmo filho visível para um pai e não para a madrasta).

## Objetivo de negócio

- Refletir a realidade de guardiões múltiplos (pai, mãe, padrasto) sem forçar um login compartilhado.
- Preparar convites por e-mail com escopo de perfis.
- Manter LGPD: trilha de quem concedeu acesso e revogação.

## Comportamento (usuário) — alvo

1. Dono da assinatura cria perfis de saúde dos filhos.
2. Convida até 2 co-administradores por família (MVP).
3. Na convite, escolhe **quais perfis** cada pessoa enxerga.
4. Co-admin com conta própria entra com login dela, mas vê só os perfis autorizados.

## Superfície técnica (hoje vs alvo)

| Hoje | Alvo |
|------|------|
| `patient_access_grants` (057) + backfill | Convites (058) + care circles (059) |
| `patient_memberships` (espelho guardian/self) | UI **Família e cuidadores** (`/settings/family`) |
| Acesso via grants ativos | Matriz conta × paciente completa |
| `care_circles` + backfill «Minha família» | Vincular convites a `care_circle_id` |

| Tipo | Referência |
|------|------------|
| Design completo | [`docs/FAMILY_ACCESS_MODEL.md`](../FAMILY_ACCESS_MODEL.md) |
| Auth / ACL | `patient-access-grant.pg.repository.ts`, `patient-access.service.ts`, `patient-access.guard.ts` |
| Migration | `057_patient_access_grants.sql`, `058_patient_access_invites.sql`, `059_care_circles.sql` |
| API | `GET/POST /care-circles`, membros e vínculos de perfil |
| UI | Configurações → Família e cuidadores (`/settings/family`) |
| Billing | `account_entitlements` (1 pagador por conta) |

## Fora de escopo (fase 1)

- Mesmo paciente em dois círculos com billing unificado.
- Arbitragem jurídica de custódia pelo produto.

## Métricas / sucesso

- Convite aceito sem suporte manual.
- Zero vazamento IDOR em testes de escopo.
- Parecer jurídico antes de go-live multi-guardião.

## Ajuda relacionada

- [`docs/help/familia-multiplos-cuidadores.md`](../help/familia-multiplos-cuidadores.md)

## Ver também

- [`docs/ECOSYSTEM.md`](../ECOSYSTEM.md) — persona Responsável
- Roadmap: `family-access-*` items
