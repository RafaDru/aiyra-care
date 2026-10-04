# Suite QA — CH Defeitos (referência + correção)

**Id:** `ops-ch-defeitos`  
**Lane:** ops (manual CH)

## Pré-requisitos

- Migration **077** aplicada; **082** para metadados `correction_failed`
- ops-console `:3013` com `CURSOR_DEFECT_FIX_*` (opcional para dispatch real)

## Passos

1. Abrir CH → **Defeitos** — coluna **Ref** `DEF-*` visível e copiável
2. Defeito `open` → **Iniciar correção** — sem webhook: permanece `open`, mensagem de aviso
3. Com webhook mock/ready: `ok: true`, status `in_fix`
4. **Em correção** → **Reenfileirar correção** — `POST start-fix` sem mudar status indevidamente
5. **Incidentes** — coluna **Ref** `INC-*`
6. **Incidentes** — filtro padrão **Precisam atenção**; chip **Triados** lista incidentes com `incident_pipeline_status=triaged`
7. Deep link `?group=operacao&tab=incidentes&investigationId=<uuid>` (ou `incidentRef=INC-00000N`) — linha visível, expandida e destacada (mesmo se triado)
8. Busca **Incidentes**: `INC-*` / prefixo UUID / substring do título encontra linha
9. Busca **Defeitos**: `DEF-*` / prefixo UUID / substring do título encontra linha
10. Link de incidente vinculado em detalhe de defeito abre **Incidentes** com highlight
11. **Incidentes** — ordenação por coluna (Ref, Atualizado, Título, Prioridade, Status); padrão **Atualizado** mais recente primeiro; ordem persiste na sessão do browser ao trocar de aba CH e voltar
12. Chip **Triados** — coluna Status mostra tag **Triado** (não «Aberto» / «Em aberto»)
13. **R4 (opcional com secret):** com `GITHUB_DEFECT_MERGE_WEBHOOK_SECRET` e defeito `ready_for_pr` + `prUrl`, simular payload GitHub `pull_request` merged → status `fixed`, `fixedVia=github_webhook`, hint no expand do CH
14. **R1:** simular callback `correction_failed` (ou API vitest) — defeito `open`, expand com banner de falha, tag **Falha correção**; **Iniciar correção** após falha limpa metadados ao entrar em `in_fix`

## Critério

- PASS se refs aparecem, gate `in_fix` respeita dispatch (ou reconcilia para `open`), deep link triado funciona, busca INC/DEF/UUID localiza registro, ordenação padrão e persistência de sessão funcionam, triados exibem label **Triado**, e R1 exibe falha estruturada sem reset silencioso (passo 13 quando webhook configurado)
