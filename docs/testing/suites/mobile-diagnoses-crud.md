# Suite — `mobile-diagnoses-crud`

| Campo | Valor |
|-------|--------|
| **ID** | `mobile-diagnoses-crud` |
| **Feature** | `mobile-app-shell` |
| **Lane** | `mobile` |
| **Bloco** | `1-tx` |
| **Fixture** | `core-demo` |
| **Automação** | `manual` |

## Passos

| # | Ação | Esperado |
|---|------|----------|
| 1 | Clínico → **Diagnósticos** → **Adicionar** | Form sheet |
| 2 | Nome `QA-DX-MOB` + CID opcional + crônico → Salvar | Toast; na lista |
| 3 | Toque → status **Resolvido** → Salvar | Atualizado |
| 4 | Excluir | Removido |
| 5 | Web → aba Diagnósticos | Dados alinhados |

## Estrutural

```bash
cd packages/mobile && npm run typecheck
```
