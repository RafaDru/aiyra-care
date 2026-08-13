# Framework de revisão paralela — AiyraCare

> **Última atualização:** 2026-08-13  
> Complementa [`LEGAL_COMPLIANCE.md`](./LEGAL_COMPLIANCE.md) e skills em `.cursor/skills/aiyracare-review-*`.

## Objetivo

Antes de cada **feature relevante** (ou release), rodar análises cruzadas com checklists repetíveis — sem substituir advogado, médico ou pentest formal.

## Análise crítica: faz sentido?

**Sim, com matriz de risco — não com “quatro agentes em tudo”.**

| Abordagem | Veredicto |
|-----------|-----------|
| 4 análises **obrigatórias em cada PR** (CSS, typo, i18n) | **Não** — custo alto, lentidão, ruído; o modelo alucina “riscos” onde não há |
| 4 análises **tiered** por tipo de mudança | **Sim** — alinhado a saúde + LGPD + hexagonal |
| Skills (checklist) + subagent ocasional (diff grande) | **Sim** — skills baratas; agente só quando `tier ≥ 2` |
| Substituir advogado / DPO / pentest | **Não** — skills orientam; go-live exige humano |

### Princípios

1. **Risco proporcional** — não tratar alteração de cor como alteração de dado sensível.
2. **Skills = procedimento** — mesma estrutura de saída (`PASS | CONCERNS | BLOCK` + bullets).
3. **Um orquestrador** — skill `aiyracare-feature-release` classifica tier e diz quais reviews rodar.
4. **Registro leve** — para tier 2+, append em `docs/reviews/` ou comentário no PR (template abaixo).
5. **Domínio de negócio sempre leve** — ajuda hexagonal; quase sempre tier 1.

### Quando cada análise importa

| Review | Sempre | Exemplos que exigem foco |
|--------|--------|-------------------------|
| **Legal** | Tier 2+ | novos dados, menores, termos, scraping, billing, export público, IA clínica |
| **Medical** | Tier 2+ se toca clínico/IA | OCR interpretação, export, RAG, textos que usuário confia para saúde |
| **Security** | Tier 2+ se toca auth/dados | novas rotas, share links, credenciais, dependências, CSP |
| **Business domain** | Tier 1+ | novas entidades, nomes de abas, bounded contexts, integrações |

## Tiers de feature

| Tier | Exemplos | Reviews |
|------|----------|---------|
| **0** | typo, CSS, i18n sem novo dado | opcional: só business (rápido) |
| **1** | nova aba UI, CRUD sem dado novo sensível | business (+ legal se copy de saúde) |
| **2** | sync portal, upload doc, billing, compliance | legal + security + business; medical se UI clínica |
| **3** | IA interpretação, share token, RAG, exclusão conta | **todas as quatro** + humano antes de produção |

Classificação: skill `aiyracare-feature-release` ou autor do PR no template.

## Skills do projeto

| Skill | Path | Trigger |
|-------|------|---------|
| Orquestrador | `.cursor/skills/aiyracare-feature-release/` | nova feature, release, “review antes de merge” |
| Legal | `.cursor/skills/aiyracare-review-legal/` | LGPD, termos, billing, menores |
| Medical | `.cursor/skills/aiyracare-review-medical/` | clínico, OCR/LLM, export, disclaimers |
| Security | `.cursor/skills/aiyracare-review-security/` | auth, API, dados sensíveis, pentest-lite |
| Business | `.cursor/skills/aiyracare-review-business-domain/` | domínios, naming, hexagonal |

Invocar manualmente: *“Rode ayracare-feature-release neste diff”* ou pedir review específico.

## Template de saída (todas as skills)

```markdown
## [Legal|Medical|Security|Business] Review — {feature-id}
- **Tier:** 0–3
- **Verdict:** PASS | CONCERNS | BLOCK
- **Findings:** (bullets acionáveis)
- **Backlog:** (ids roadmap opcionais)
- **Human required:** sim/não — motivo
```

## Integração com agentes Cursor

- **Tier 0–1:** só skill no chat (Composer).
- **Tier 2:** skill + opcional `security-review` subagent no diff.
- **Tier 3:** skills + subagents `security-review` e `bugbot`; advogado/médico humano antes de go-live.

Não criar quatro subagents permanentes — skills cobrem 80%; subagents para diffs grandes ou tier 3.

## DocuSign vs click-wrap

Ver [`LEGAL_COMPLIANCE.md` §11](./LEGAL_COMPLIANCE.md#11-evidência-de-aceite-click-wrap-vs-docusign) — B2C termos/privacidade: **não** exige DocuSign; B2B contrato clínica: considerar.

## Backlog

Epic `feature-review-framework` em `roadmap.json`.
