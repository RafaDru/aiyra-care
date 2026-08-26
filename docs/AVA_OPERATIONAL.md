# Ava operacional — estratégia por fases

> **Última atualização:** 2026-08-25  
> Relacionado: `docs/AVA_VISION.md`, `docs/AVA_PATIENT_LENS.md`, `docs/AGENTS_APOIO.md`

## Objetivo

Ava tão ou mais **operacional** que o usuário: não só responder sobre o prontuário, mas **acionar** fluxos da plataforma com confirmação humana e lastro auditável.

## Fases

| Fase | Entrega | Status |
|------|---------|--------|
| **G1 — Aceleradores + pins** | Botões “Pergunte à Ava” em entidades; dock abre com lente + pergunta + bloco de pin no prompt | **done** |
| **G2 — Ações read-only** | Navegar abas, abrir laudo/PDF, listar sync status via chat (links + respostas estruturadas) | **done (V0)** |
| **G3 — Ações com confirmação** | Sync portal, export clínico, resolver hygiene — POST só após confirmação UI | planejado |
| **G4 — Tool calling** | Runtime de ferramentas (`ava-tools.ts`) + SSE de atividade na UI | **parcial (read-only + reflexão)** |

## G4 — Ferramentas read-only (parcial)

- `packages/api/src/domain/llm/ava-tools.ts` — catálogo + heurísticas (`load_patient_record`, `load_family_alerts`, `load_operational`, `load_entity_pin`).
- `packages/api/src/domain/llm/ava-activity.ts` — eventos de status (context / llm / reflection) para UI.
- `POST /patients/:id/ava/chat` com `streamActivity: true` → SSE `activity` + `complete`.
- Web: `api.ava.chatWithActivity` + lista de passos no balão de pensamento.

Próximo: ferramentas mutáveis (G3) com confirmação UI + `product_events`.

## G2 — Ações read-only (V0)

- `AvaOperationalContextService` — blocos NAVEGAÇÃO, INTEGRAÇÕES/SYNC, LAUDOS no prompt.
- System prompt instrui links markdown internos; sem disparo de sync.
- `AvaMarkdown` — links `/patients/...` navegam via React Router.

## G1 — Aceleradores (detalhe)

### UX

- Botão/link **“Pergunte à Ava”** em exame, pedido de exame, marcador laboratorial.
- Abre drawer global, define **lente** = paciente da entidade, pré-preenche pergunta.
- API recebe `entityPin` → bloco **REGISTRO EM FOCO** no prompt (dados determinísticos).

### Tipos de pin (v1)

| `entityType` | Identificador | Fonte |
|--------------|---------------|--------|
| `exam` | `entityId` (UUID) | `exams` |
| `exam_order` | `entityId` | `exam_orders` |
| `exam_result_item` | `entityId` | `exam_result_items` |
| `exam_marker` | `markerName` + `patientId` | agregado de marcadores |

### Web

- `packages/web/src/lib/ava-dock-bus.ts` — evento `aiyracare:ava-open`
- `AvaAcceleratorButton.tsx`
- `AvaDockWidget` escuta bus e passa `initialMessage` + `entityPin` ao chat

### API

- `POST /patients/:id/ava/chat` body: `entityPin?`
- `AvaEntityContextService.buildPinBlock(patientId, pin)`

## Segurança (todas as fases)

- Sem diagnóstico; reflexão Ava mantida.
- Ações destrutivas/externas: **sempre** confirmação explícita (G3+).
- Pins e ações logados em `llm_usage_events.metadata` (G1) → `product_events` (G4).

## Roadmap

- `ava-accelerators` → G1 done
- `ava-platform-presence` → parcial (G1)
- Novo backlog G3: `ava-confirmed-actions`
