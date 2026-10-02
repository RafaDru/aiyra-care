# Suite — `mobile-ava-accelerator`

| Campo | Valor |
|-------|--------|
| **ID** | `mobile-ava-accelerator` |
| **Feature** | `mobile-app-shell` |
| **Lane** | `mobile` |
| **Bloco** | `3-ava` |
| **Fixture** | `core-demo` |
| **Automação** | `manual` |

## Passos

| # | Ação | Esperado |
|---|------|----------|
| 1 | Clínico → **Exames** → item → **Pergunte à Ava** | Dock abre; mensagem enviada com `entityPin` exam |
| 2 | Exames → **Marcadores** → marcador ativo → acelerador | Pin `exam_marker`; resposta sem 5xx |
| 3 | Clínico → **Autorizações** ou **Prontuários** → acelerador | Dock abre; mensagem enviada com `entityPin` `authorization` ou `medical_record` |
| 5 | FAB **+** (registro) → **Sintoma** → salvar | Toast sucesso; entrada em health thread |
| 6 | FAB **+** → **Sinais vitais** → temperatura ou FC → salvar | `POST /measurements/batch`; toast sucesso |
| 4 | Após resposta, chips de **sessão** (pins) visíveis se API retornar contexto | Labels de pin |

## Não avaliar

Conteúdo interpretativo do LLM.

## Estrutural

```bash
npm run mobile:check
```
