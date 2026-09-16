# Ava — escopo de QA

> **Última atualização:** 2026-09-08  
> Ava tem **suites próprias** na lane `ava` — separadas do CRUD clínico do perfil.

## Princípio

Testamos **comportamento operacional determinístico** da UI e da API (dock, conversas, pins, guardrails). **Não** julgamos qualidade médica ou texto gerado por LLM neste ciclo.

| Testar | Não testar (agora) |
|--------|---------------------|
| Dock abre em qualquer rota | Se a resposta clínica está correta |
| Lente de paciente altera contexto | OCR / interpretação de laudo |
| Mensagem enviada → resposta chega (HTTP 200, bubble) | Consumo de tokens / custo |
| Guardrail off-topic bloqueia sem chamar LLM | RAG com citações corretas |
| Pin de entidade no prompt (acelerador G1) | Ferramentas mutáveis G3 (quando existirem) |
| Nova conversa / arquivar / excluir | Anexo imagem → conteúdo interpretado |

Referência produto: [`AVA_OPERATIONAL.md`](../AVA_OPERATIONAL.md).

---

## Suites Ava (lane `ava`)

| Suite | Foco | `parallelSafe` |
|-------|------|----------------|
| [`ava-companion-smoke`](./suites/ava-companion-smoke.md) | Dock, lente, 1 mensagem saúde | ✅ |
| [`ava-guardrail-smoke`](./suites/ava-guardrail-smoke.md) | Pergunta off-topic → bloqueio | ✅ |
| [`ava-entity-pin`](./suites/ava-entity-pin.md) | Acelerador em exame → pin no chat | ✅ |
| [`ava-conversation-crud`](./suites/ava-conversation-crud.md) | Criar, listar, arquivar, excluir conversa | ✅ |
| [`ava-attachment-smoke`](./suites/ava-attachment-smoke.md) | Anexar imagem (upload OK; **sem** validar OCR) | ✅ |

```powershell
npm run qa:run -- --suite ava-companion-smoke
# Teste completo Ava:
npm run qa:run-all -- --lane ava
```

---

## Mensagens de teste sugeridas (determinísticas)

| Tipo | Exemplo | Resultado esperado |
|------|---------|-------------------|
| Saúde simples | «Quais exames recentes do paciente?» | Resposta sem erro 5xx; bubble assistant |
| Off-topic | «Qual a capital da França?» | Guardrail; mensagem de redirecionamento (sem alucinação clínica) |
| Com lente | Paciente X selecionado + «Resumo da carteira» | Resposta menciona contexto do paciente ou pede dado faltante |

---

## Automação CI (Fase 4)

- `AVA_TEST_MODE=1` na API — resposta fixa para mensagens de saúde (`ava-test-mode.ts`).
- Playwright: `e2e/suites/ava-companion-smoke.spec.ts`, `ava-guardrail-smoke.spec.ts`.
- Guardrail off-topic continua sem LLM; assert no texto de redirecionamento.
- SSE (`activity` → `complete`) — assert estrutural futuro.

Ver [`AUTOMATION_ROADMAP.md`](./AUTOMATION_ROADMAP.md) Fase 4.
