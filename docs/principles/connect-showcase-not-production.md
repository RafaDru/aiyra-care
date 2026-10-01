# Connect — scraper só showcase, não produção

> **Decisão Rafael · 2026-09-30** · Contexto: [regulatory-adherence-plan.md](../regulatory-adherence-plan.md) · pesquisa no Project store (`health-data-interoperability-research.md`)

## Regra

Integrações **payer / provider** que dependem de **scraper ou sessão não contratada** (Unimed, Amil, Mater Dei, Fleury, etc.):

- **Não** oferecer em **produção** B2C pública.
- **Sim** usar em **demonstrações** para operadoras, hospitais e laboratórios — mostrar valor para o **beneficiário** e para a **operadora** (engajamento, menos fricção, dados estruturados), com narrativa clara: versão real = **API + contrato + LGPD**.

## Produção permitida (integração)

- **Governo:** gov.br + FHIR (ConecteSUS, Caderneta) — caminho regulado.
- **Suplementar:** parceria com API/OAuth documentada; import manual (PDF, upload); export/portabilidade que o titular controla.

## Showcase

- Ambiente demo, contas de teste ou opt-in explícito em reunião.
- Slides: “PoC técnica — integração oficial em negociação”.

## Não fazer

- Marketing que implique sync automático de convênio em prod sem parceria.
- Escalar scrapers como diferencial competitivo de go-live.
