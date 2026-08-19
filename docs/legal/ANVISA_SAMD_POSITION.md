# Posicionamento ANVISA — software organizador vs SaMD

> Epic: `legal-anvisa-review-rag` — **obrigatório antes** de agentes RAG com recomendação clínica.

## Enquadramento atual (MVP)

O AiyraCare é um **organizador familiar** de histórico de saúde:

- Não diagnostica, não prescreve, não substitui prontuário oficial.
- Resumo clínico **determinístico** (sem LLM inventando dados).
- Export com disclaimer explícito.

Isso tende a ficar **fora** de Software como Dispositivo Médico (SaMD) de alto risco quando não há finalidade diagnóstica/terapêutica autônoma (RDC 657/2022 — validar com consultor regulatório).

## O que mudaria o enquadramento

| Funcionalidade | Risco regulatório |
|----------------|-------------------|
| RAG que **sugere diagnóstico** ou tratamento | SaMD — revisão ANVISA |
| Alertas automáticos de condição grave sem supervisão médica | SaMD / responsabilidade clínica |
| OCR/LLM só para **transcrição** com citação da fonte | Menor — manter disclaimers |
| Agente "pediatra virtual" | Alto — não no MVP |

## Gate de produto (antes de `packages/agents`)

1. Revisão com consultor regulatório / advogado de saúde.
2. Documentar decisão neste arquivo (data + conclusão).
3. Atualizar Termos e Privacidade se o escopo mudar.
4. Skill `aiyracare-review-medical` obrigatória (tier 3) em features de IA clínica.

## MVP agentes (quando implementar)

- Respostas **sempre** com citação a registro do Postgres.
- Disclaimer fixo: não substitui pediatra.
- **Sem afirmar diagnóstico** — apenas temas para debate médico (`docs/AGENTS_APOIO.md`).
- **Hard stops determinísticos** (ex.: alergia × medicação → `do_not_apply`) — não são “triagem autônoma”; são contraindicação com base em dado registrado + linguagem firme. Revisão médica obrigatória ao expandir catálogo.
- Sem dosagem ou prescrição.
- Triagem de urgência **generalizada** por LLM sozinha — não no MVP; red flags via regras + catálogo emergência curado.

## Horizonte (roadmap — gate regulatório)

- Notificação ativa / escalonamento em cenários extremos (opt-in, dispositivos, persistência de vital crítico).
- Validar enquadramento SaMD antes de automação sem confirmação humana.

## Referências

- ANVISA RDC 657/2022 (SaMD)
- [`docs/LEGAL_COMPLIANCE.md`](../LEGAL_COMPLIANCE.md) §2
