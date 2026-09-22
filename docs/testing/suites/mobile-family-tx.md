# Suite — `mobile-family-tx`

| Campo | Valor |
|-------|--------|
| **ID** | `mobile-family-tx` |
| **Feature** | `mobile-app-shell` |
| **Lane** | `mobile` |
| **Bloco** | `1-tx` |
| **Fixture** | `core-demo` |
| **Automação** | `manual` |

## Passos

| # | Ação | Esperado |
|---|------|----------|
| 1 | Configurações → **Família** | Círculos, convites, compartilhamentos carregam |
| 2 | Criar convite (e-mail + perfis) se titular | Convite na lista |
| 3 | Seção **Acessos ativos** → selecionar perfil | Grants listados |
| 4 | (Opcional) Revogar grant de teste | Removido |

## Estrutural

```bash
cd packages/mobile && npm run typecheck
```
