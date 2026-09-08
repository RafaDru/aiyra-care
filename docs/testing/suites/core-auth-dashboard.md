# Suite — `core-auth-dashboard`

| Campo | Valor |
|-------|--------|
| **ID** | `core-auth-dashboard` |
| **Feature** | núcleo |
| **Lane** | `regression` |
| **Fixture** | `core-demo` |
| **parallelSafe** | `false` |
| **Automação** | `planned` |

## Pré-requisitos

- [ ] `npm run up` (dev) ou `npm run up:preview`
- [ ] `npm run seed:staging-refresh`
- [ ] `$env:AUTH_SUBJECT="<seu-sub-supabase>"; npm run link:demo-patients`
- [ ] Conta Supabase de teste com senha conhecida

## Passos

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Abrir `/login` e autenticar | Redirect para dashboard ou `/` | |
| 2 | Ver lista de pacientes | Pelo menos Lucas e Ana visíveis (após link) | |
| 3 | Clicar em Lucas | Perfil abre; abas Carteira / Integrações carregam | |
| 4 | Voltar ao dashboard | Lista mantém estado | |
| 5 | Abrir menu Configurações | `/settings/account` ou família acessível | |
| 6 | Logout (se disponível) ou limpar sessão | Retorna a `/login` | |

## Falhas conhecidas

| Sintoma | Causa provável |
|---------|----------------|
| “Falha ao carregar pacientes” | Migration `care_circles` faltando no PG dev — ver `ENVIRONMENTS.md` |
| Lista vazia | `link:demo-patients` não rodou com `AUTH_SUBJECT` correto |

## Seletores (automação futura)

| Elemento | Seletor sugerido |
|----------|------------------|
| Card paciente | `data-testid="patient-card-<id>"` *(adicionar na UI)* |
| Dashboard grid | `data-testid="dashboard-patient-list"` |
