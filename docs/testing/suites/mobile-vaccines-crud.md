# Suite — `mobile-vaccines-crud`

| Campo | Valor |
|-------|--------|
| **ID** | `mobile-vaccines-crud` |
| **Feature** | `mobile-app-shell` |
| **Lane** | `mobile` |
| **Bloco** | `1-tx` |
| **Fixture** | `core-demo` |
| **Automação** | `manual` |

## Passos

| # | Ação | Esperado |
|---|------|----------|
| 1 | Clínico → **Vacinas** → **Adicionar** | Form sheet |
| 2 | Nome `QA-VAC-MOB` + data aplicação (hoje) + dose `1` → Salvar | Toast; na lista |
| 3 | Toque na linha → alterar lote → Salvar | Atualizado |
| 4 | Excluir | Removido |
| 5 | Web → mesma aba Vacinas | Dados alinhados |

## Estrutural

```bash
cd packages/mobile && npm run typecheck
```
