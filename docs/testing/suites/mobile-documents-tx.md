# Suite — `mobile-documents-tx`

| Campo | Valor |
|-------|--------|
| **ID** | `mobile-documents-tx` |
| **Feature** | `mobile-app-shell` |
| **Lane** | `mobile` |
| **Bloco** | `1-tx` |
| **Fixture** | `core-demo` |
| **Automação** | `manual` |

## Passos

| # | Ação | Esperado |
|---|------|----------|
| 1 | Perfil → **Documentos pessoais** → **Enviar arquivo** | Lista atualiza |
| 2 | Segure → **Excluir** | Removido |
| 3 | Aba **Documentos** (arquivos) → upload PDF pequeno | Na lista |
| 4 | Web → mesma aba | Arquivo visível |

## Fora de escopo

- OCR / interpretação LLM

## Estrutural

```bash
cd packages/mobile && npm run typecheck
```
