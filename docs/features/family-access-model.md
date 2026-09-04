# Família — múltiplos cuidadores e acesso por perfil

| Campo | Valor |
|-------|--------|
| **ID** | `family-access-model` |
| **Épico** | `family-access-model` |
| **Status** | `in_progress` (blended patient entregue; e-mail transacional pendente) |
| **Categoria** | negócio |
| **Prioridade** | P1 |

## Resumo

Modelar explicitamente a diferença entre **conta** (login e pagamento), **família/círculo de cuidado** (agrupamento) e **perfil de saúde** (histórico clínico). Permitir múltiplos responsáveis com **visibilidade diferente por perfil** — incluindo famílias reconstituídas (ex.: mesmo filho visível para um pai e não para a madrasta).

## Objetivo de negócio

- Refletir a realidade de guardiões múltiplos (pai, mãe, padrasto) sem forçar um login compartilhado.
- Convites por e-mail com escopo de perfis e família (`care_circle_id`).
- Manter LGPD: trilha de quem concedeu acesso e revogação — **audit log (062)** entregue.

## Comportamento (usuário) — entregue (MVP)

1. Titular cria perfis de saúde e recebe círculo padrão **«Minha família»** (backfill 059).
2. **Configurações → Família e cuidadores** (`/settings/family`): gerenciar famílias, vincular perfis, convidar cuidadores.
3. Convite escolhe **família** + **perfis**; ao aceitar, cria grants (057) e membro no círculo (060).
4. **Dashboard** agrupa por família; só exibe perfis aos quais o usuário tem grant (ou é titular).
5. No perfil de saúde: **Quem tem acesso** — lista cuidadores; titular pode revogar.
6. Limite: **2 co-admins** com acesso `full` por perfil (titular excluído da contagem).
7. **Compartilhar perfil entre famílias** (caso Mariana): titular convida outra conta; ao aceitar, perfil aparece no círculo receptor com tag «Compartilhado»; grants continuam independentes por cuidador.

## Superfície técnica

| Camada | Referência |
|--------|------------|
| Design | [`docs/FAMILY_ACCESS_MODEL.md`](../FAMILY_ACCESS_MODEL.md) |
| Migrations | `057_patient_access_grants`, `058_patient_access_invites`, `059_care_circles`, `060_invite_care_circle`, `063_patient_profile_shares` |
| ACL | `patient-access.service.ts`, `patient-access-grant.pg.repository.ts`, `patient-access.guard.ts` |
| Convites | `patient-access-invite.service.ts`, `/family-access/invites`, `/invite/accept` |
| Compartilhamento cross-família | `patient-profile-share.service.ts`, `/family-access/profile-shares` |
| Círculos | `care-circle.service.ts`, `/care-circles`, `/care-circles/dashboard` |
| UI | `/settings/family`, dashboard agrupado, `PatientAccessGrantsDrawer` no perfil |
| Billing | `account_entitlements` (1 pagador por conta) |

### Rotas API

- `GET/POST/DELETE /patients/:id/access-grants`
- `GET /patients/:id/access-audit`
- `GET/POST/DELETE /family-access/invites`, `POST /family-access/invites/accept`
- `GET/POST/DELETE /family-access/profile-shares`, `POST .../profile-shares/:id/accept`
- `GET/POST/PATCH /care-circles`, membros, vínculos de perfil
- `GET /care-circles/dashboard`

## Pendente (fase 3+)

- E-mail transacional do convite e do compartilhamento entre famílias.
- `parent_ids` derivado opcionalmente do círculo.

## Métricas / sucesso

- Convite aceito sem suporte manual.
- Zero vazamento IDOR em testes de escopo.
- Parecer jurídico antes de go-live multi-guardião.

## Ajuda relacionada

- [`docs/help/familia-multiplos-cuidadores.md`](../help/familia-multiplos-cuidadores.md)
- [`docs/help/quem-pode-ver-perfil-saude.md`](../help/quem-pode-ver-perfil-saude.md)

## Ver também

- [`docs/ECOSYSTEM.md`](../ECOSYSTEM.md) — persona Responsável
- Roadmap: itens `family-access-*`
