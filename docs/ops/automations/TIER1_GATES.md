# Tier 1 — PR draft automático (gates)

Ative com `OPS_INVESTIGATOR_TIER1=1` no `.env` da API. **Default: desligado** (Tier 0).

## Quando sobe para Tier 1

| Lane | Condições |
|------|-----------|
| **Suporte ao Desenvolvimento** | `technical_bug` + `consentTechnical` |
| **Suporte SRE** | `infra` ou `sync`; auto só se `critical` |

Caso contrário permanece **Tier 0** (só markdown, sem PR).

## O que o agente pode fazer (Tier 1)

1. Investigar (igual Tier 0)
2. Corrigir código **dentro da allowlist**
3. Abrir **PR draft** (`gh pr create --draft`)
4. Callback com `prUrl` + `remediationSummary` + `analysisArtifactPath`

## Gates obrigatórios

| Gate | Valor |
|------|--------|
| PR | sempre **draft** — nunca merge em `main` |
| Paths | allowlist em `investigator-tier.ts` (`TIER1_PATH_ALLOWLIST`) |
| Diff | máx. **8 arquivos**, **200 linhas** |
| Proibido | `packages/web` clínico, `legal/`, migrations SQL, dados reais |
| Labels PR | `auto-investigator`, `tier-1`, `needs-human-review` |

## Callback com PR

```json
{
  "investigationId": "<investigationId>",
  "remediationSummary": "Correção: …",
  "analysisArtifactPath": "docs/ops/investigations/….md",
  "prUrl": "https://github.com/RafaDru/aiyra-care/pull/NNN"
}
```

## Rollback

Desligue `OPS_INVESTIGATOR_TIER1` → volta 100% Tier 0 sem alterar Automations.
