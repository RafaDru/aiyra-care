# Suite — `mobile-who-growth-chart`

| Campo | Valor |
|-------|--------|
| **ID** | `mobile-who-growth-chart` |
| **Feature** | `mobile-app-shell` |
| **Lane** | `mobile` |
| **Bloco** | `2-graficos` |
| **Fixture** | `core-demo` |
| **Automação** | `manual` |

## Pré-requisito

Perfil com **data de nascimento** e **sexo** (masculino/feminino). Ideal: dependente pediátrico com medições de peso/altura/PC.

## Passos

| # | Ação | Esperado |
|---|------|----------|
| 1 | Clínico → **Crescimento** | Seções WHO + medidas |
| 2 | Bloco **Curvas WHO** | Até 3 gráficos (peso, altura, PC) com bandas P3/P50/P97 e pontos do paciente |
| 3 | Perfil sem sexo/nascimento | Mensagem para completar Dados básicos |
| 4 | Pull-to-refresh | Sem crash |
| 5 | Web → aba Crescimento (Measurements) | Curvas WHO alinhadas |

## Fora de escopo

- Lançar medida / monitoramento TX (web)

## Estrutural

```bash
npm run mobile:check
```
