# Suite — `family-circles-crud`

| Campo | Valor |
|-------|--------|
| **ID** | `family-circles-crud` |
| **Feature** | [`family-access-model`](../../features/family-access-model.md) |
| **Lane** | `feature` |
| **parallelSafe** | `true` |
| **Automação** | `planned` |

## Pré-requisitos

- Conta titular com ≥1 `care_circle` (onboarding ou backfill «Minha família»)
- API + web locais (`:3010` / `:5173`)

## Passos

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Login titular → `/family` | Painel **Famílias** visível | |
| 2 | **Nova família** → nome `QA-Família Extra` | Toast sucesso; círculo na lista | |
| 3 | Expandir círculo → **Renomear** → `QA-Família Renomeada` | Nome atualizado no collapse e no seletor (se 2+) | |
| 4 | **Vincular perfil** (se houver perfil sem vínculo) | Perfil na lista do círculo | |
| 5 | **Excluir família** no círculo extra | 204; círculo some; titular mantém ≥1 família | |
| 6 | Única família restante | Botão **Excluir** não aparece (guarda última família) | |
| 7 | Onboarding ou link ` /family?circle=<id>` | Hub abre com família ativa no seletor | |

## Cleanup

- Remover `QA-*` se criou perfis de teste ao vincular.
