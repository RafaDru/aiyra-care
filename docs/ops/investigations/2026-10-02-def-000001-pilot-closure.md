# Piloto DEF-000001 — encerramento (2026-10-02)

| Campo | Valor |
|-------|--------|
| `referenceCode` | DEF-000001 |
| `defectId` | `0e672818-72ec-4ef7-918e-312db34bbeb5` |
| Incidente vinculado | `96a2e898-9d36-4495-82e6-76eb17fc555e` |
| PR | https://github.com/RafaDru/aiyra-care/pull/86 (merged 2026-10-02) |

## Escopo real vs título CH

- **Título no CH:** «Sync silent skip» — **desatualizado** (rótulo de dedup antigo).
- **Artefato de triagem:** `docs/ops/investigations/2026-09-28-96a2e898-support.md` (introduzido no PR #86).
- **Correção:** `ActiveCareCircleProvider` montado sempre em `AppLayout` — incidente `ui|ui_boundary|error` na rota `/`.

A automação Correção Dev deve seguir **artefato + incidente**, não o título quando divergirem (ver `docs/automations-aiyra-correcao-dev-instructions.md`).

## Passos operador (CH)

1. **Retítulo (opcional mas recomendado):** PATCH `/api/platform-defects/0e672818-72ec-4ef7-918e-312db34bbeb5` ou editar no ops-console — título sugerido: «Dashboard `/` — useActiveCareCircle fora do provider (ui_boundary)».
2. **Pós-merge:** PATCH status `fixed`, `prUrl` = PR #86, `branchName` = `cursor/defect-0e672818-dashboard-care-circle-provider` (ou usar botão **Corrigido** no CH se `ready_for_pr` já tiver `prUrl`).

Contrato `defect_fix_v1` atualizado em PR do branch `cursor/ch-defect-agent-contract-2d4a` (`defect.referenceCode` no payload).
