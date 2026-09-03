# Modelo de acesso familiar — conta, cuidadores e pacientes

> **Última atualização:** 2026-09-03  
> **Status:** fase 2 em produção local (grants 057, convites 058, care circles 059–060, UI `/settings/family`) — ver [`features/family-access-model.md`](./features/family-access-model.md).  
> **Relacionado:** [`ECOSYSTEM.md`](./ECOSYSTEM.md), [`SUPABASE.md`](./SUPABASE.md), [`LEGAL_COMPLIANCE.md`](./LEGAL_COMPLIANCE.md), [`B2B_PARTNERS.md`](./B2B_PARTNERS.md) (organizações B2B ≠ família B2C).

## Resposta curta

**Sim, faz sentido.** O cenário que você descreveu (múltiplos responsáveis, visibilidade diferente por pessoa, famílias reconstituídas, mesmo filho em dois núcleos) é real e comum. O produto **implementa MVP** com `patient_access_grants` (057), convites (058), `care_circles` (059–060) e UI em **Configurações → Família e cuidadores**. Casos avançados (mesmo filho em dois círculos com visibilidades independentes — Mariana) permanecem na fase 3.

---

## O que já existe no AiyraCare

| Conceito | Implementação atual | Limite |
|----------|---------------------|--------|
| **Usuário logado** | `app_accounts` (1 login Supabase → 1 conta) | Sem convite nem co-admin |
| **Quem paga** | `account_entitlements` por `account_id` | 1 assinante por conta; plano família cobre pacientes da conta |
| **Pessoa cuidada** | `patients` | Nome “paciente” é clínico; UI já usa **“Você”** para `role=self` |
| **Acesso conta→paciente** | `patient_memberships(account_id, patient_id, role)` | `role` ∈ `guardian` \| `self` — **sem escopo por paciente entre admins** |
| **Quem criou o registro** | `patients.owner_account_id` | Não distingue “dono da assinatura” vs “outro admin” |
| **Vínculo familiar clínico** | `patients.parent_ids[]` | Grafo **paciente↔paciente** (titular/dependente Unimed); não é ACL de login |
| **Household para sync** | `collectHouseholdPatientIds()` | Deriva IDs para import; não governa permissões de UI |
| **Menor** | `minor_guardian_consent` + checkbox cadastro | Consentimento do responsável que cadastra; não cobre segundo guardião |
| **Organização B2B** | `organizations` (migration 055) | Clínica/lab — **outro bounded context** |

Fluxo de autorização hoje (`patient-access.guard.ts`):

```
allowedPatientIds = memberships(account) ∪ patients(owner_account_id = account)
```

Ou seja: se Maria e João compartilhassem a **mesma** conta, veriam os mesmos pacientes. Se tiverem **contas distintas**, cada um só vê o que tiver membership explícito — mas **não há UI de convite nem matriz “admin vê só estes filhos”**.

---

## Três camadas que precisamos separar (vocabulário)

Evitar misturar termos na UI e no código:

| Camada | Nome sugerido (produto) | Nome técnico | Pergunta que responde |
|--------|-------------------------|--------------|---------------------|
| 1 | **Conta** / login | `app_account` | Quem entra no app? Quem paga? |
| 2 | **Família** / círculo de cuidado | `care_circle` (proposto) | Qual grupo organiza os cuidados? |
| 3 | **Pessoa** / perfil de saúde | `patient` | De quem é este histórico clínico? |

**Relações 1.1 e 1.2** que você citou mapeiam para:

- **1.1** — `patient_memberships.role = 'self'` (adulto cuidando de si).
- **1.2** — `role = 'guardian'` (ou futuros `caregiver`, `viewer`).

O **pagador** (2) deve ficar na camada 1: `billing_owner_account_id` no círculo ou flag `is_billing_owner` na membership do círculo — **não** confundir com `owner_account_id` do paciente (quem criou o cadastro).

---

## Seu exemplo — como deveria funcionar

```
Família A (care_circle)
  billing_owner: João (account)
  admins: João, Maria
  patients: Pedro, Lucas, Mariana

Família B (care_circle)
  billing_owner: Francisco
  admins: Francisco, Vitória
  patients: Henrique, Mariana
```

Matriz de visibilidade desejada:

| Conta | Vê pacientes |
|-------|----------------|
| João | Pedro, Lucas, Mariana |
| Maria | Pedro, Lucas |
| Francisco | Henrique |
| Vitória | Mariana |

**Mariana em duas famílias** é o caso mais delicado: mesmo `patient_id` pode ter **grants independentes** por conta, possivelmente em círculos diferentes. Isso espelha custódia compartilhada / famílias reconstituídas.

Modelo recomendado (inspirado em [FHIR RelatedPerson + Consent](https://www.medplum.com/docs/fhir-datastore/family-relationships) e padrões de apps como [Novix Health](https://github.com/NovixHealth/Novix)):

1. **`care_circles`** — unidade familiar (nome opcional: “Família A”).
2. **`care_circle_members`** — `(circle_id, account_id, circle_role)` com `owner` \| `admin` \| `member` (limite sugerido: **2 admins** no MVP).
3. **`patient_circle_links`** — `(patient_id, circle_id)` — paciente pertence a um ou mais círculos.
4. **`patient_access_grants`** — `(account_id, patient_id, access_level, relationship, granted_by, granted_at)` — **fonte de verdade do ACL**.
   - `access_level`: `full` \| `read` \| `sync_only` (futuro).
   - Permite: João `full` em Mariana; Maria **sem grant** em Mariana.

Convite: `circle_invites(email, circle_id, invited_role, patient_ids[])` → ao aceitar, cria `care_circle_member` + grants explícitos.

---

## Billing vs acesso

| Regra proposta | Motivo |
|----------------|--------|
| **Uma assinatura = uma conta pagadora** | Stripe já em `account_entitlements` |
| Plano família limita **N pacientes** no círculo do pagador | Evita abuso |
| Co-admin **não precisa pagar** | Maria usa conta dela, mas entra no círculo de João por convite |
| Co-admin com conta própria pode ter **seu** círculo e assinatura | Francisco / Vitória — Família B separada |
| Paciente adulto (`self`) pode ser pagador e revogar guardiões | Emancipação / LGPD art. 18 |

**Não** fundir billing de duas contas no MVP; “conta compartilhada” aqui é **compartilhamento de dados clínicos**, não de cartão.

---

## LGPD e produto (Brasil)

| Tema | Implicação |
|------|------------|
| Menores | Responsável que convida deve ter base legal (consentimento já iniciado com `minor_guardian_consent`) |
| Dois guardiões | Ambos podem ter legitimidade; **restringir** acesso de um guardião (ex.: madrasta sem acesso à enteada) é decisão do **owner/admin** com trilha de auditoria |
| Auditoria | Registrar `granted_by`, `revoked_at`, IP — alinhado a accountability LGPD |
| Revogação | Guardião removido perde acesso imediato; dados que ele inseriu permanecem com atribuição |
| Conflito entre pais | Produto **não arbitra** custódia; UI pede confirmação de legitimidade no convite (checkbox + termo) |

Revisão jurídica obrigatória antes de go-live multi-guardião (`reviewBadge: legal`).

---

## Naming na UI (sugestão)

| Hoje | Proposta |
|------|----------|
| Paciente (genérico) | **Perfil de saúde** ou manter “paciente” só em contexto clínico |
| Você (self) | Manter — já implementado |
| Responsável | **Cuidador** / **Conta** na área de configurações |
| Família (implícita) | **Sua família** — lista de perfis + “Gerenciar acesso” |

---

## Fases de entrega (épico roadmap)

### Fase 0 — Documentação e invariantes (agora)
- Este doc + glossário em `PROJETO.md`
- Matriz de casos de teste (João/Maria/Francisco/Vitória/Mariana)

### Fase 1 — ACL explícito sem novo agrupamento
- ✅ Tabela `patient_access_grants` (migration 057) + backfill + API `/patients/:id/access-grants`
- ✅ `listAccessiblePatientIds` via grants; limite 2 co-admins `full` (titular excluído da contagem)
- ✅ Convites MVP (058): `POST /family-access/invites`, aceite em `/invite/accept`, link copiável + checkbox LGPD
- ✅ UI lista “Quem tem acesso” por perfil (drawer no header do perfil)
- [ ] Envio de e-mail transacional do convite

### Fase 2 — Care circles
- ✅ Tabelas `care_circles`, `care_circle_members`, `patient_circle_links` (059) + backfill «Minha família»
- ✅ API `/care-circles` + UI Configurações → Família e cuidadores
- ✅ Dashboard agrupado por família (quando 2+ círculos ou perfis compartilhados)
- ✅ Convites vinculados a `care_circle_id` (060) — membro adicionado ao aceitar
- ✅ Drawer «Quem tem acesso» no perfil de saúde
- [ ] Migrar `parent_ids` sync household para opcionalmente derivar do círculo

### Fase 3 — Cenários avançados
- Mesmo paciente em múltiplos círculos (Mariana)
- Adulto `self` convida cuidador com escopo `read_only`
- Exportação / portabilidade quando paciente vira titular da própria conta

---

## O que **não** fazer

- Reutilizar `organizations` (055) para família B2C — bounded context diferente.
- Dar a todos os `guardian` membership visão total por padrão em famílias blended.
- Criar “conta compartilhada” com um login para dois adultos — preferir **duas contas + grants**.

---

## Skill / agente especializado?

Por enquanto **não** é obrigatório um agente novo. Usar:

- `aiyracare-review-business-domain` — naming, aggregates, roadmap
- `aiyracare-review-legal` — convites, menores, bases legais
- `aiyracare-review-security` — ACL, convites, IDOR

Se o épico crescer (migração + UI + billing), considerar skill `aiyracare-family-access` com checklist de casos (self, guardian, blended, revoke, invite).

## Feature card

- [`docs/features/family-access-model.md`](./features/family-access-model.md)
- Índice: [`docs/features/index.json`](./features/index.json)

---

## Referências

- [Medplum — Family relationships (FHIR)](https://www.medplum.com/docs/fhir-datastore/family-relationships) — RelatedPerson, Group, access policies
- [HL7 FHIR RelatedPerson](https://hl7.org/fhir/R4/relatedperson.html)
- [FHIR Consent pattern (emancipation / guardians)](https://github.com/JohnMoehrke/emancipation)
- [Novix Health — family_members + sharing_permissions](https://github.com/NovixHealth/Novix) — padrão próximo ao desejado (linked vs dependent, convite bidirecional)
