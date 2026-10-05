# Automation — Revisão PR (defect_pr_review_v1)

Saída **obrigatória**: `POST` no `callbackUrl` do payload com JSON abaixo. Não mergear nem push.

## Checklist

1. `docs/AGENT_BOOTSTRAP.md` + artefato `defect.triageArtifactPath`
2. `gh pr view` / `gh pr diff` no `prUrl` (sem PHI)
3. Skill mental `.cursor/skills/aiyracare-review-security/SKILL.md` na dimensão segurança
4. Refletir CI em `ciSnapshot` quando visível

## Callback (sucesso)

```json
{
  "kind": "defect_pr_review_v1",
  "defectId": "<uuid do payload>",
  "reviewId": "<reviewId do payload>",
  "status": "completed",
  "dimensions": {
    "correctionEffectiveness": {
      "verdict": "plausible",
      "summary": "…",
      "evidence": ["packages/…"]
    },
    "risk": {
      "level": "baixo",
      "summary": "…"
    },
    "security": {
      "verdict": "pass",
      "summary": "…",
      "findings": []
    }
  },
  "recommendation": "approve",
  "recommendationRationale": "…",
  "ciSnapshot": { "status": "success", "runUrl": "…" },
  "prReviewCommentUrl": "https://github.com/…/pull/N#issuecomment-…",
  "agentRunUrl": "https://cursor.com/agents/…",
  "headSha": "<opcional>"
}
```

## Escalas

| Campo | Valores |
|-------|---------|
| `correctionEffectiveness.verdict` | `plausible` \| `uncertain` \| `unlikely` |
| `risk.level` | `nulo` \| `baixo` \| `medio` \| `alto` \| `grave` |
| `security.verdict` | `pass` \| `concerns` \| `block` |
| `recommendation` | `approve` \| `request_changes` \| `block` |

Auth: header do payload `callbackAuth`.
