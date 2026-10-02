# Suite — `mobile-measurements-chart`

| Campo | Valor |
|-------|--------|
| **ID** | `mobile-measurements-chart` |
| **Feature** | `mobile-app-shell` |
| **Lane** | `mobile` |
| **Bloco** | `2-graficos` |
| **Fixture** | `core-demo` |
| **Automação** | `manual` |

## Pré-requisito

Perfil com medições em `measurements` (sinais vitais, antropometria ou glicemia importada).

## Passos

| # | Ação | Esperado |
|---|------|----------|
| 1 | Clínico → **Crescimento** → rolar até **Sinais vitais** / **Antropometria** | Cards com gráficos de linha |
| 2 | Pressão arterial (se houver) | Duas linhas (sistólica/diastólica) |
| 3 | Faixa normal (se API enviar `normalRange`) | Banda verde suave no gráfico |
| 4 | Web → Crescimento → gráficos | Mesmas séries (`chart-series`) |
| 5 | Empty state | «Sem medições para gráfico» sem crash |

## Estrutural

```bash
npm run mobile:check
```
