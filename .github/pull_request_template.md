## Summary

<!-- O que mudou e por quê (1–3 bullets) -->

## Tier (FEATURE_REVIEW_FRAMEWORK.md)

- [ ] **Tier 0** — typo, docs, sem comportamento
- [ ] **Tier 1** — UI/UX, sem dados sensíveis novos
- [ ] **Tier 2** — feature de produto (sync, billing, export, legal UI)
- [ ] **Tier 3** — auth, credenciais, endpoints públicos, dados de saúde novos

## Revisões (marque o que aplicou)

| Review | Tier 2+ | Tier 3 |
|--------|---------|--------|
| Business / domínio (`aiyracare-review-business-domain`) | recomendado | obrigatório |
| Legal / LGPD (`aiyracare-review-legal`) | se toca dados, termos, menores, billing | obrigatório |
| Medical (`aiyracare-review-medical`) | se toca OCR/LLM, export, contexto clínico | obrigatório |
| Security (`aiyracare-review-security`) | se novas rotas/auth | obrigatório |

- [ ] Li `docs/FEATURE_REVIEW_FRAMEWORK.md` e classifiquei o tier
- [ ] Reviews necessárias foram feitas (ou pendências listadas abaixo)

## Test plan

- [ ] `cd packages/api && npx vitest run` (se API)
- [ ] Smoke manual descrito:

## Pendências de revisão humana

<!-- Itens que dependem de advogado, contador, médico, etc. — ver docs/HUMAN_REVIEW_QUEUE.md -->
