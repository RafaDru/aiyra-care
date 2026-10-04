# Suite — `mobile-exam-markers-chart`

| Campo | Valor |
|-------|--------|
| **ID** | `mobile-exam-markers-chart` |
| **Feature** | `mobile-app-shell` |
| **Lane** | `mobile` |
| **Bloco** | `2-graficos` |
| **Fixture** | `core-demo` |
| **Automação** | `manual` |

## Pré-requisito

Perfil demo com **marcadores de exame** importados (sync laboratorial ou massa web). Sem marcadores: estado vazio é aceitável; validar mensagem e toggle.

## Passos

| # | Ação | Esperado |
|---|------|----------|
| 1 | Clínico → **Exames** → sub-aba **Marcadores** | Lista/chips ou empty state |
| 2 | Com dados: selecionar marcador | Gráfico de linha (SVG) + último valor e status |
| 3 | Buscar por nome | Filtra chips |
| 4 | Pull-to-refresh | Recarrega sem crash |
| 5 | Web → Exames → Marcadores do Exame | Mesmos valores/tendência (paridade API) |

## Fora de escopo (mobile)

- Edição de marcadores / batch create
- Ava inline chart blocks (Bloco 3)

## Estrutural

```bash
npm run mobile:check
```
