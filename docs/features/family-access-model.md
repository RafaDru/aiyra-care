# Família — múltiplos cuidadores e acesso por perfil

| Campo | Valor |
|-------|--------|
| **ID** | `family-access-model` |
| **Épico** | `family-access-model` |
| **Status** | `in_progress` (discovery / design) |
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
| `patient_memberships` (guardian/self) | + `access_level`, `granted_by` ou `patient_access_grants` |
| Acesso = união plana de memberships | Matriz conta × paciente |
| Sem `care_circles` | `care_circles` + members + links |

| Tipo | Referência |
|------|------------|
| Design completo | [`docs/FAMILY_ACCESS_MODEL.md`](../FAMILY_ACCESS_MODEL.md) |
| Auth atual | `patient-access.guard.ts`, `018_app_accounts.sql` |
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
