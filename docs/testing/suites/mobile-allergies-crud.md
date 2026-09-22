# Suite — `mobile-allergies-crud`

| Campo | Valor |
|-------|--------|
| **ID** | `mobile-allergies-crud` |
| **Feature** | `mobile-app-shell` |
| **Lane** | `mobile` |
| **Bloco** | `1-tx` |
| **Fixture** | `core-demo` |
| **Automação** | `manual` |

## Pré-requisitos

- API `:3010` + Expo Go com branch `cursor/mobile-bloco1-tx-a5c1` (ou merge do PR)
- Paciente demo com permissão de edição

## Passos

| # | Ação | Esperado |
|---|------|----------|
| 1 | Clínico → **Alergias** → **Adicionar alergia** | Form sheet abre |
| 2 | Preencher alérgeno `QA-ALERGIA-MOB` + gravidade leve → Salvar | Toast sucesso; item na lista |
| 3 | Toque no item → alterar reação → Salvar | Lista atualizada |
| 4 | Excluir no form | Item some; toast |
| 5 | Web `:5173` mesmo paciente → aba Alergias | Mesmos dados (API única) |

## Estrutural

```bash
cd packages/mobile && npm run typecheck
```
