# Suite — `mobile-exams-crud`

| Campo | Valor |
|-------|--------|
| **ID** | `mobile-exams-crud` |
| **Feature** | `mobile-app-shell` |
| **Lane** | `mobile` |
| **Bloco** | `1-tx` |
| **Fixture** | `core-demo` |
| **Automação** | `manual` |

## Passos

| # | Ação | Esperado |
|---|------|----------|
| 1 | Clínico → **Exames** → **Adicionar** | Form sheet |
| 2 | Tipo `QA-EXAM-MOB` + data (hoje) + laboratório → Salvar | Toast; na lista |
| 3 | Toque → editar resumo → Salvar | Atualizado |
| 4 | Excluir | Removido |
| 5 | Web → aba Exames | Dados alinhados |

## Fora de escopo (mobile)

- Upload laudo PDF / OCR
- Dashboard de marcadores

## Estrutural

```bash
cd packages/mobile && npm run typecheck
```
