# Suite — `mobile-ava-attachment-smoke`

| Campo | Valor |
|-------|--------|
| **ID** | `mobile-ava-attachment-smoke` |
| **Feature** | `mobile-app-shell` |
| **Lane** | `mobile` |
| **Bloco** | `3-ava` |
| **Fixture** | `core-demo` |
| **Automação** | `manual` |

## Passos

| # | Ação | Esperado |
|---|------|----------|
| 1 | Ava → **+** galeria → escolher imagem | Preview do anexo no composer |
| 2 | Enviar mensagem curta com anexo | HTTP 200; sem crash |
| 3 | Remover anexo antes de enviar | Limpa preview |

## Não avaliar

OCR / interpretação do laudo.

## Estrutural

```bash
npm run mobile:check
```
