# Suite QA — CH Defeitos (referência + correção)

**Id:** `ops-ch-defeitos`  
**Lane:** ops (manual CH)

## Pré-requisitos

- Migration **077** aplicada
- ops-console `:3013` com `CURSOR_DEFECT_FIX_*` (opcional para dispatch real)

## Passos

1. Abrir CH → **Defeitos** — coluna **Ref** `DEF-*` visível e copiável
2. Defeito `open` → **Iniciar correção** — sem webhook: permanece `open`, mensagem de aviso
3. Com webhook mock/ready: `ok: true`, status `in_fix`
4. **Em correção** → **Reenfileirar correção** — `POST start-fix` sem mudar status indevidamente
5. **Incidentes** — coluna **Ref** `INC-*`

## Critério

- PASS se refs aparecem e gate `in_fix` respeita dispatch (ou reconcilia para `open`)
