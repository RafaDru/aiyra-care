# Suite QA — CH Defeitos (referência + correção)

**Id:** `ops-ch-defeitos`  
**Lane:** ops (manual CH)

## Pré-requisitos

- Migration **077** aplicada; **082** para metadados `correction_failed`; **083** para `parent_defect_id`; **084** para reincidência INC (`recurrence_of_incident_id`)
- ops-console `:3013` com `CURSOR_DEFECT_FIX_*` (opcional para dispatch real)

## Passos

1. Abrir CH → **Defeitos** — coluna **Ref** `DEF-*` visível; clique na ref ou tag `[defect:…]` abre o defeito (copiar só pelo ícone quando visível)
2. Defeito `open` → **Iniciar correção** — sem webhook: permanece `open`, mensagem de aviso
3. Com webhook mock/ready: `ok: true`, status `in_fix`
4. **Em correção** → **Reenfileirar correção** — `POST start-fix` sem mudar status indevidamente
5. **Incidentes** — coluna **Ref** com `INC-*` e identificador curto na mesma linha (sem coluna ID); clique navega para o incidente; copiar pelo ícone no detalhe expandido
6. **Incidentes** — filtro padrão **Em aberto** (`all_open`); chips **Precisam atenção**, **Triados** / **Resolvidos**; sem chip «Descartados» (deep link `investigationId` ainda exibe linha descartada)
7. Deep link `?group=operacao&tab=incidentes&investigationId=<uuid>` (ou `incidentRef=INC-00000N`) — linha visível, expandida e destacada (mesmo se triado)
8. Busca **Incidentes**: `INC-*` / prefixo UUID / substring do título encontra linha
9. Busca **Defeitos**: `DEF-*` / prefixo UUID / substring do título encontra linha
10. Link de incidente vinculado em detalhe expandido de **Defeitos** — lista com `INC-*`, título legível e tag curta; abre **Incidentes** com highlight
11. Expand **Incidentes** — rótulos em português; identificador interno no rodapé com clique para abrir e ícone para copiar
12. **Incidentes** — ordenação por coluna (Ref, Atualizado, Título, Prioridade, Status); padrão **Atualizado** mais recente primeiro; ordem persiste na sessão do browser ao trocar de aba CH e voltar
13. Chip **Triados** — coluna Status mostra tag **Triado** (não «Aberto» / «Em aberto»)
14. **R4 (opcional com secret):** com `GITHUB_DEFECT_MERGE_WEBHOOK_SECRET` e defeito `ready_for_pr` + `prUrl`, simular payload GitHub `pull_request` merged → status `fixed`, `fixedVia=github_webhook`, hint no expand do CH
15. **R1:** simular callback `correction_failed` (ou API vitest) — defeito `open`, expand com banner de falha, tag **Falha correção**; **Iniciar correção** após falha limpa metadados ao entrar em `in_fix`
16. **Reincidência DEF:** após DEF `fixed`, triagem de INC com mesma fingerprint (ou callback `parentDefectId` + `recurrenceLikely`) — novo DEF com tag **Reincidência** e link «Abrir DEF pai» no expand
17. **Reincidência INC:** após INC `resolved` (DEF `fixed`), novo sinal — novo `INC-*` com **Reincidência de INC-xxxxx**
18. **Resolvido:** DEF `fixed` → INC vinculado tag **Resolvido** no chip **Resolvidos** (backfill mig 084 cobre piloto INC-000001)
19. **Em triagem (hook):** com INC `forwarded`, simular `POST /api/analysis-queue/:id/triage-started` (auth callback) → pipeline `in_triage` + status `investigating`; idempotente se já `in_triage`
20. **Incidentes ao vivo:** lista recarrega a cada ~15s (sem F5); coluna **Defeito** + expand mostram `DEF-*` vinculado via `platform_defect_incidents`

## Critério

- PASS se refs aparecem, gate `in_fix` respeita dispatch (ou reconcilia para `open`), deep link triado funciona, busca INC/DEF/UUID localiza registro, ordenação padrão e persistência de sessão funcionam, triados/resolvidos exibem labels corretas, R1 exibe falha estruturada (passo 14 quando webhook configurado), reincidência DEF/INC (16–17), fechamento INC em `resolved` (18), hook triage-started (19)
