# CH — Pacote UX / gráfico (especificação autorizada)

> **Status:** spec autorizada (Rafael, 2026-10-05) · **Implementação:** pendente  
> **Épico roadmap:** `ch-ui-graphics-package`  
> **Relacionado:** [`CH_PR_REVIEW_AGENT.md`](./CH_PR_REVIEW_AGENT.md) §7 · [`CH_SOLO_OPERATOR_JOURNEY_SPEC.md`](./CH_SOLO_OPERATOR_JOURNEY_SPEC.md) §7 · [`CH_INCIDENT_BOARD_SSE.md`](./CH_INCIDENT_BOARD_SSE.md) · [`CH_INCIDENT_BOARD_FILTERS.md`](./CH_INCIDENT_BOARD_FILTERS.md)

---

## 1. Objetivo

Tornar o Command Hub (`:3013`) **operável em um olhar** na jornada INC/DEF: lista legível, detalhe estruturado, confirmação em mutações, identificadores copiáveis sem expandir, **tempo real** sem polling como regra, layout com navegação lateral fixa.

**Gatilho:** piloto DEF-000003 (revisão agêntica E2E) validado — implementar antes da frente **Produto**.

---

## 2. Escopo

### 2.1 Incluído

| Área | Entrega |
|------|---------|
| **Operação** | Incidentes, Defeitos, Suporte (listas + expand) |
| **Layout CH** | Sidenav fixa; scroll só no conteúdo principal |
| **Tempo real** | SSE para incidentes + defeitos; remover poll 15s/60s nessas telas; remover botão **Atualizar** onde SSE cobrir |
| **Mutações** | `Modal.confirm` (ou equivalente Ant Design) em todo comando transacional |
| **Detalhe** | Layout em seções/cards (menos parágrafo único) |
| **Lista** | Refs `INC-*` / `DEF-*` / `[defect:…]` como **tags copiáveis** na linha; clique na linha expande; **sem** highlight automático ao carregar |
| **Filtro default** | Chips «Em aberto» / equivalente (`all_open` incidentes; defeitos `open,in_fix,ready_for_pr` ou chip documentado) |
| **Review R3 (lista)** | Badge recomendação + estado review na linha (`ready_for_pr`) |
| **CH Geral** | Documentar **Verificar e acionar**; métricas com push ou refresh por visibilidade (ver §6) |

### 2.2 Fora de escopo (este pacote)

- Merge automático em `main` (G3 permanece humano).
- R2 completo (`pipeline_status` GitHub, CI failed → `in_fix`) — **fatia seguinte** `ch-solo-operator-r2`; este pacote só **prepara badges** e links CI quando R2 existir.
- Redesign global de tema / mock `ChLayoutMockPage` como produto final.
- SSE multi-instância GCP (bus Redis) — notebook single-process v1.

---

## 3. Princípios de UX

| # | Regra |
|---|--------|
| P1 | **Linha = superfície de expansão** — clique em qualquer área da linha (exceto controles interativos explícitos: tag copiar, link externo, botão) alterna expand. |
| P2 | **IDs na linha** — `INC-000007`, `DEF-000003`, tag curta `[defect:579a0d6b]` com ícone copiar; **não** exigir expand para copiar UUID/ref. |
| P3 | **Sem destaque ao abrir** — deep link `investigationId` / `defectId` / `incidentRef` pode expandir **uma** linha, mas **sem** classe `ops-row-highlight` nem scroll agressivo no load padrão (sem query de highlight). |
| P4 | **Filtro inicial «em aberto»** — lista principal carrega já filtrada; contadores nos chips atualizados via SSE. |
| P5 | **Mutação = confirmação** — texto claro do efeito (status alvo, irreversível ou não, link para automação se aplicável). |
| P6 | **Tempo real por padrão** — polling é **fallback** (SSE `onerror` + reconnect), não UX primária. |

---

## 4. Layout — sidenav fixa e scroll

**Estado hoje:** `.ch-body` flex; sidenav e coluna principal rolam com a página.

**Alvo:**

```text
┌ ch-header (fixo ou no topo do viewport) ─────────────┐
├ ch-body (flex, height: calc(100vh - header - footer)) ┤
│ ┌ ch-sidenav ─┐ ┌ ch-main-scroll (overflow-y: auto) ─┐ │
│ │ fixa        │ │ context bar + painel + tabela       │ │
│ │ (sticky)    │ │                                     │ │
│ └─────────────┘ └─────────────────────────────────────┘ │
└ ch-footer (opcional fixo no rodapé) ──────────────────┘
```

- **Desktop:** `ch-sidenav` `position: sticky; top: 0; align-self: flex-start; max-height: 100%`; scroll apenas em `ch-main-scroll` (novo wrapper em `ChLayout`).
- **Mobile:** manter drawer atual; scroll no conteúdo do drawer + painel.
- **Critério:** ao rolar lista longa de incidentes, tabs da sidenav permanecem visíveis.

---

## 5. Listas — Incidentes e Defeitos

### 5.1 Colunas e tags

| Elemento | Comportamento |
|----------|----------------|
| Ref `INC-*` / `DEF-*` | `Tag` + `Typography.Text` copyable ou botão copiar dedicado |
| Identificador curto | Mesma linha que título ou segunda linha compacta |
| Status | Tag colorida (já humanizado em `ch-*-display.ts`) |
| Defeito `ready_for_pr` | Chips: **review** (`running` / `approve` / `request_changes` / `block`), opcional **CI** (placeholder até R2) |
| Ações na linha | Mínimas: preferir ações no expand; se mantidas, `stopPropagation` no clique |

### 5.2 Expansão

- `expandedRowKeys` controlado por clique na linha (`onRow`).
- Deep link: expandir linha alvo **sem** highlight CSS persistente (remover ou restringir `ops-row-highlight` a query explícita `?highlight=1` se necessário para debug).
- Remover dependência de expand só para ver ref copiável.

### 5.3 Filtros iniciais

| Painel | Default | Notas |
|--------|---------|--------|
| **Incidentes** | `all_open` | Já implementado; garantir load sem `ensureId` fora do filtro |
| **Defeitos** | Status «Em aberto» (open + in_fix + ready_for_pr) ou chip único documentado em `CH_INCIDENT_BOARD_FILTERS` espelho defeitos | Alinhar label PT «Em aberto» |

---

## 6. Detalhe expandido — estrutura visual

Substituir blocos de texto corrido por **seções** (Ant Design `Descriptions`, `Card`, `Collapse` opcional):

### 6.1 Incidente (expand)

| Seção | Conteúdo |
|-------|----------|
| **Resumo** | Título, prioridade, pipeline, última atualização |
| **Triagem** | Resumo agente, artefato, erros |
| **Vínculos** | DEF-* tags navegáveis |
| **Dispatch** | Estado outbox, última falha, ações recuperação |
| **Técnico** | UUID (tag copiável, tipografia secundária) |

### 6.2 Defeito (expand)

| Seção | Conteúdo |
|-------|----------|
| **Resumo** | Título, fingerprint, status, branch/PR |
| **Correção** | Banner falha R1, último dispatch |
| **Revisão agêntica** | Card existente (`DefeitoAgenticReviewCard`) — manter; humanizar enums (`plausible` → «Plausível») |
| **Incidentes ligados** | Lista `INC-*` |
| **G3** | Abrir PR, Aprovar para merge, Pedir mudanças (com confirmação §7) |
| **Técnico** | UUID, timestamps |

**Componente alvo:** `ChDetailSections.tsx` (ou par incident/defect) para evitar duplicação.

---

## 7. Confirmação de comandos transacionais

Padrão: `Modal.confirm` com `title`, `content` (1–3 frases), `okText` / `cancelText` PT, `okButtonProps` danger quando reabre ou descarta trabalho.

### 7.1 Defeitos

| Ação | Efeito | Confirmação (resumo) |
|------|--------|----------------------|
| Iniciar correção | `open` → dispatch → `in_fix` | «Disparar agente Correção Dev?» |
| Reenfileirar correção | Novo `defect_fix_v1` | «Reenfileirar correção (mesmo defeito)?» |
| Marcar pronto p/ PR | → `ready_for_pr` | «Marcar manualmente como pronto para PR?» |
| **Corrigido** (lista) | → `fixed` | «Marcar como corrigido **sem** merge GitHub?» (aviso se `prUrl` aberto) |
| Aprovar para merge | Registra intent G3 + abre GitHub | «Registrar aprovação e abrir PR para merge?» |
| Pedir mudanças | → `open` + limpa review | «Reabrir defeito para nova correção?» |

### 7.2 Incidentes

| Ação | Confirmação |
|------|-------------|
| Nova tentativa dispatch / retry | «Reenviar triagem para a automação?» |
| Analisar / Concluir (suporte legado) | Manter ou alinhar ao mesmo padrão |

### 7.3 Suporte / alertas (Operação)

| Ação | Confirmação |
|------|-------------|
| Enfileirar análise, dismiss, etc. | Conforme mutação existente em `SupportPanel` |

**Não confirmar:** copiar tag, abrir link externo, trocar filtro chip, expandir linha.

---

## 8. Tempo real (SSE) — eliminar polling e «Atualizar»

### 8.1 Incidentes

Implementar [`CH_INCIDENT_BOARD_SSE.md`](./CH_INCIDENT_BOARD_SSE.md):

- `GET /api/analysis-queue/stream`
- Cliente: patch lista em `incident_updated`; fallback reconnect + **um** `load()` em erro prolongado.
- **Remover:** `setInterval` 15s em `IncidentesPanel`.
- **Remover:** botão **Atualizar** no header do painel Incidentes (se existir); manter refresh implícito SSE.

### 8.2 Defeitos

**Extensão nova (mesmo pacote):**

| Peça | Especificação |
|------|----------------|
| Bus | `platform-defect-board.bus.ts` (espelho `incident-board.bus`) |
| Evento | `defect_updated` — `defectId`, `status`, `latestReview` resumo, `referenceCode`, `suggestedStatusFilter` |
| Publicar após | PATCH status, `review-callback`, `start-fix`, link incident, merge webhook → `fixed` |
| Rota | `GET /api/platform-defects/stream?deploymentTier=…` |
| Cliente | `DefeitosPanel` — mesmo padrão Incidentes; remover poll review 15s quando SSE entregar `latestReview` |

### 8.3 Abas sem SSE neste pacote

| Aba | Regra |
|-----|--------|
| **CH Geral** (métricas) | Ver §9 — não bloqueia pacote Operação |
| **Estratégia / Produto** | Sem mudança |

**Regra geral:** em **Incidentes** e **Defeitos**, **não** exibir botão **Atualizar** após SSE estável; indicador discreto «Ao vivo» / «Reconectando…».

---

## 9. CH Geral — «Verificar e acionar» e «Atualizar»

### 9.1 O que é **Verificar e acionar**

- **Onde:** aba **Geral** do CH (`App.tsx` — grupo métricas/infra).
- **O que faz:** `POST /api/alerts/check` (`opsApi.dispatchCheck()`).
- **Efeito:** executa o **pipeline de checagem de alertas ops** (probe, regras em `ops-alerts-check`), persiste/atualiza alertas derivados e, para alertas **critical** de infra com webhook configurado, pode **disparar a automação investigadora SRE** (lane Triador SRE — ver `ops-panels.tsx` tooltip).
- **Não é:** triagem de incidente INC, nem `start-fix`, nem `request-review` de defeito.

**UX deste pacote:** tooltip ou microcopy no botão explicando o acima; opcional mover para subseção «Alertas & infra».

### 9.2 Botão **Atualizar** (Geral)

- Hoje: refresh manual + auto 60s em `App.tsx`.
- **Este pacote:** manter refresh por **visibilidade** + intervalo longo **ou** SSE futuro de snapshot métricas (opcional P2).
- **Obrigatório remover Atualizar** nas abas **Incidentes** e **Defeitos** quando SSE ativo (§8).

---

## 10. Fatias de implementação

| Fatia | Entrega | Depende |
|-------|---------|---------|
| **G1** | Layout scroll + sidenav sticky (`ch-zones.css`, `ChLayout`) | — |
| **G2** | Listas: tags copiáveis, row click expand, sem highlight default, filtros em aberto | G1 |
| **G3** | `ChDetailSections` incidente + defeito | G2 |
| **G4** | `confirmTransactionalAction()` + cobertura tabela §7 | G2 |
| **G5** | SSE incidentes (spec existente) + remover poll/Atualizar | API bus |
| **G6** | SSE defeitos + badges review na lista | G5 |
| **G7** | Microcopy Geral + tooltips; polish i18n review enums | G5–G6 |
| **G8** | QA `ops-ch-ui-graphics` + atualizar `ops-ch-defeitos` | G1–G7 |

Ordem sugerida: **G1 → G2 → G4 → G3 → G5 → G6 → G7 → G8**.

---

## 11. Critérios de aceite (pacote)

1. Notebook: sidenav fixa com lista 50+ linhas rolável só no painel central.
2. Incidentes/Defeitos: ref copiável na linha sem expand.
3. Clique na linha expande/colapsa; sem highlight ao abrir aba sem deep link.
4. Toda ação §7 exibe confirmação antes de `POST`.
5. Mudança de status de outro processo (callback review, triagem) aparece em **&lt;5s** sem F5 (SSE).
6. Botão **Atualizar** ausente em Incidentes e Defeitos com SSE conectado.
7. DEF `ready_for_pr` com review `approve` visível na **linha** e no card expand.
8. `npm run qa:run -- --suite ops-ch-ui-graphics` PASS.

---

## 12. Validação E2E defeitos — o que ainda falta (além deste pacote)

| Item | Status | Nota |
|------|--------|------|
| Piloto DEF-000003 revisão agêntica | ✅ | approve round 2 |
| **G3 merge [#109](https://github.com/RafaDru/aiyra-care/pull/109)** | ⏳ Rafael | Fecha DEF `fixed` |
| **R4** INC-000007 → `resolved` após merge | ⏳ | Webhook merge ou manual |
| Suite `ops-ch-defeitos` PASS no notebook pós-merge | ⏳ | Incl. passos 23–25 |
| R2 CI ↔ defeito | Planejado | Não bloqueia declarar E2E «lógico» fechado |
| `CH_AUTO_START_FIX_ON_TRIAGE` piloto opcional | Opcional | Env flag |
| Este pacote UX | Pendente | Não bloqueia merge G3 |

**Declaração E2E agêntica (INC→DEF→review):** considerada **validada** após merge #109 + INC-000007 `resolved` + `ops-ch-defeitos` PASS; UX gráfica é **paralelizável** com G3.

---

## 13. Referências de código (implementação)

| Área | Arquivos |
|------|----------|
| Layout | `packages/ops-console/src/client/components/ChLayout.tsx`, `theme/ch-zones.css` |
| Defeitos | `DefeitosPanel.tsx`, `ch-defect-display.ts` |
| Incidentes | `IncidentesPanel.tsx`, `ch-incident-display.ts` |
| Geral | `App.tsx`, `api.ts` → `/api/alerts/check` |
| SSE ref | `CH_INCIDENT_BOARD_SSE.md`, `sse-response.helper.ts`, `sync-completion.bus.ts` |
