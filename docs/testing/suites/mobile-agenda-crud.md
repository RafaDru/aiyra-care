# Suite — `mobile-agenda-crud`

| Campo | Valor |
|-------|--------|
| **ID** | `mobile-agenda-crud` |
| **Feature** | `mobile-app-shell` |
| **Lane** | `mobile` |
| **Bloco** | `1-tx` |
| **Fixture** | `core-demo` |
| **Automação** | `manual` |

## Passos

| # | Ação | Esperado |
|---|------|----------|
| 1 | Visão geral → **Agenda** → **Novo evento** | Form sheet |
| 2 | Título `QA-AGENDA-MOB` + tipo **Lembrete** + data/hora futura → Salvar | Toast; na lista |
| 3 | Toque → tipo **Consulta** → Salvar | Atualizado |
| 4 | **Concluir** na linha (ou status Concluído no sheet) | Status concluído |
| 5 | Editar → **Excluir** | Removido |
| 6 | Web → aba Agenda | Dados alinhados |

## Fora de escopo (mobile)

- Calendário mensal, ICS import/export
- Google / Outlook sync
- Vínculo com linha de cuidado (health thread)

## Estrutural

```bash
cd packages/mobile && npm run typecheck
```
