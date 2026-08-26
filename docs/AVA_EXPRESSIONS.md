# Ava — expressões visuais e linha narrativa

> **Última atualização:** 2026-08-26  
> Relacionado: `docs/AVA_VISION.md`, `docs/AVA_OPERATIONAL.md`, `packages/web/src/components/ava/ava-expressions.ts`

## Expressões (catálogo)

| ID | Momento | Asset |
|----|---------|-------|
| `present` | Orb idle após intro | `/brand/ava-avatar.png` |
| `greeting` | Intro do orb (~4,2s) | `/brand/ava-expressions/greeting.png` |
| `listening` | Chat idle | `/brand/ava-expressions/listening.png` |
| `reflective` | LLM pensando (genérico) | `/brand/ava-expressions/reflective.png` |
| `researching` | LLM em exames/pesquisa | `/brand/ava-expressions/researching.png` |
| `warm` | Reservado (dock CTA) | `/brand/ava-expressions/warm.png` |

Implementação: `AvaAvatar` + `useAvaExpression` + `softCrossfade` (`full` dock, `lite` chat 1s).

## Dock (header)

- `greeting` (~4,2s) + balão de saudação.
- `settling` (~2,2s): crossfade `full` + glow esfumaçado → `present`.
- `done`: CTA “Falar com a Ava”.

## Chat (drawer)

- Idle: `listening`.
- LLM: `reflective` / `researching` (heurística em `expressionForThinkingPhrase`).
- Crossfade `lite` 1s entre PNGs; crop unificado 118%.

## Status de processamento (não é resposta)

- `POST /patients/:id/ava/chat` com `streamActivity: true` → SSE eventos `activity` (ferramentas + reflexão).
- Web: balão mostra passo atual + lista de passos concluídos (sem texto “não é resposta da Ava”).
- Ver `docs/AVA_OPERATIONAL.md` (G4).

## Linha narrativa (intimidade)

- **Primeiro nome** do cuidador (`caregiverFirstName`) na UI e no system prompt.
- Regras no prompt: calor natural, sem repetir o nome em toda frase; não substituir avaliação médica.

## Arte

Assets em `packages/web/public/brand/ava-expressions/`. Alinhar crops ao enquadramento base ao adicionar novas poses.
