# Suite — `mobile-patient-tx`

| Campo | Valor |
|-------|--------|
| **ID** | `mobile-patient-tx` |
| **Feature** | `mobile-app-shell` |
| **Lane** | `mobile` |
| **Bloco** | `1-tx` |
| **Fixture** | `core-demo` |
| **Automação** | `manual` |

## Passos

| # | Ação | Esperado |
|---|------|----------|
| 1 | Início → **Adicionar perfil** → menor com consentimento | Criado na lista |
| 2 | Perfil → **Dados básicos** → **Editar** → alterar nome | Salvo |
| 3 | **Exportar** link resumo → compartilhar | URL retornada |
| 4 | Excluir perfil de teste (não titular) | Removido |

## Estrutural

```bash
cd packages/mobile && npm run typecheck
```
