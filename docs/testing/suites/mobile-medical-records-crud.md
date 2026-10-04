# Suite — `mobile-medical-records-crud`

| Campo | Valor |
|-------|--------|
| **ID** | `mobile-medical-records-crud` |
| **Feature** | `mobile-app-shell` |
| **Lane** | `mobile` |
| **Bloco** | `1-tx` |
| **Fixture** | `core-demo` |
| **Automação** | `manual` |

## Pré-requisitos

- Branch `cursor/mobile-bloco1-tx-a5c1` (PR #68+)
- API `:3010` + Expo Go

## Passos

| # | Ação | Esperado |
|---|------|----------|
| 1 | Clínico → **Atendimentos** → **Adicionar atendimento** | Form sheet |
| 2 | Data hoje + tipo Consulta + médico `QA-MED-MOB` → Salvar | Toast; item na lista |
| 3 | Toque → alterar descrição → Salvar | Atualizado |
| 4 | Excluir | Some da lista |
| 5 | Web mesmo paciente → aba Atendimentos | Dados alinhados |

## Estrutural

```bash
cd packages/mobile && npm run typecheck
```
