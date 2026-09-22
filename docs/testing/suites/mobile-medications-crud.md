# Suite — `mobile-medications-crud`

| Campo | Valor |
|-------|--------|
| **ID** | `mobile-medications-crud` |
| **Feature** | `mobile-app-shell` |
| **Lane** | `mobile` |
| **Bloco** | `1-tx` |
| **Fixture** | `core-demo` |
| **Automação** | `manual` |

## Passos

| # | Ação | Esperado |
|---|------|----------|
| 1 | Clínico → **Medicamentos** → **Adicionar** | Form sheet |
| 2 | Genérico `QA-MED-MOB` + dosagem + em uso → Salvar | Toast; na lista |
| 3 | Toque → marcar **Encerrado** → Salvar | Badge encerrado |
| 4 | Excluir | Removido |
| 5 | Web → mesma aba | Dados alinhados |

## Estrutural

```bash
cd packages/mobile && npm run typecheck
```
