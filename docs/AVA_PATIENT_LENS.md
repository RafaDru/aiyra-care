# Ava — lente de paciente e layout conversacional

> **Última atualização:** 2026-08-25  
> Relacionado: `docs/AVA_VISION.md`, `docs/CURSOR_AGENT_OPS.md`

## Problema (2026-08-24)

- Fallback global usava o **1º paciente por nome** (Bruno) fora de `/patients/:id`.
- Sem seletor no drawer; histórico não resetava ao trocar lente.
- `membership.role=self` não configurado → badge **Você** inexistente.
- Layout era “avatar por bolha”, não conversa face-a-face.
- Barra de tokens mostrava % da franquia grátis, não do **pool total** (franquia + pacotes).

## Estratégia — lente de paciente

| Prioridade | Fonte | Quando |
|------------|-------|--------|
| 1 | Rota `/patients/:id` ou `?patientId=` | Navegação no perfil |
| 2 | Override no drawer (seletor) | Usuário escolhe outro paciente |
| 3 | `localStorage` `ava:lastPatientId` | Última lente usada |
| 4 | Paciente `isSelf` (`role=self`) | Titular da conta |
| 5 | Primeiro da lista API | Fallback |

**Regras:**

- Mudança de **rota** de paciente atualiza a lente e limpa override.
- Troca manual no seletor grava `ava:lastPatientId` e **reseta** mensagens do chat (nova conversa na lente).
- API `POST /patients` com `markAsSelf` ou script `set-self-patient.ts` para titular.

Implementação web: `packages/web/src/lib/ava-patient-lens.ts`, `AvaPatientLensSelect.tsx`.

## Estratégia — layout conversacional

| Zona | Conteúdo |
|------|----------|
| Coluna esquerda | Ava grande (estágio), balão de pensamento clássico (trilha de bolinhas + nuvem) ao processar |
| Centro | Bolhas de texto (sem avatar repetido) |
| Coluna direita | Avatar do usuário (OAuth / iniciais), menor que Ava |

CSS: `ava-chat.css` — `.ava-chat-stage`.

## Estratégia — tokens (UI)

- `usagePercent` = tokens usados / **pool total atual** (franquia restante + pacotes), cap 100%.
- `status=exhausted` só quando `totalTokensRemaining <= 0`.
- UI: barra = consumo do pool; detalhe = créditos equivalentes + tokens restantes.

Código: `packages/api/src/domain/llm/llm-policy.ts`, `AvaQuotaBar.tsx`.

## Horizonte — Ava operacional

Fase seguinte (roadmap): tool calling / actions com confirmação humana (sync, export, hygiene). Esta entrega cobre **lente correta + UX conversacional + metering coerente**.
