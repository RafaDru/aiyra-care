# Suite — `integrations-link-sync`

| Campo | Valor |
|-------|--------|
| **ID** | `integrations-link-sync` |
| **Domínio** | `integracoes` |
| **Lane** | `business-full` |
| **Fixture** | paciente `QA-Integracao-<data>` |

## Passos (UI — sem validar portal)

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Aba **Integrações** | Lista de portais | |
| 2 | **Vincular** plano / link (fluxo UI do portal escolhido) | Link criado ou wizard abre | |
| 3 | Botão **Sincronizar** → modal progresso | Job inicia (`jobId`) | |
| 4 | Aguardar terminal ou cancelar | UI atualiza status | |
| 5 | (Opcional) Remover / desvincular link | Link some | |

## Portais com suite dedicada

- Amil filtros: [`amil-sync-options.md`](./amil-sync-options.md) (lane `integration-portal`).
