# Suite — `mobile-ava-conversation-crud`

| Campo | Valor |
|-------|--------|
| **ID** | `mobile-ava-conversation-crud` |
| **Feature** | `mobile-app-shell` |
| **Lane** | `mobile` |
| **Bloco** | `3-ava` |
| **Fixture** | `core-demo` |
| **Automação** | `manual` |
| **Espelha** | `ava-conversation-crud` |

## Passos

| # | Ação | Esperado |
|---|------|----------|
| 1 | Abrir Ava → enviar 1 mensagem | `conversationId` criado |
| 2 | **Nova conversa** | Histórico limpo; próxima mensagem nova thread |
| 3 | **Escolher conversa** (picker) | Mensagens anteriores carregam |
| 4 | **Arquivar** conversa ativa | Some da lista ativa |
| 5 | **Excluir** outra conversa (se houver) | Removida |

## Estrutural

```bash
npm run mobile:check
```
