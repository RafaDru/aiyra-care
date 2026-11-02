# Ananeri — briefing de marca (designer externa)

> **2026-11-01** · Documento para **repasse à designer** (identidade visual + logomarca).  
> **PDF:** [`../media/ananeri-designer-brief-external.pdf`](../media/ananeri-designer-brief-external.pdf)  
> Rafael: plataforma **Ananeri** · agente **Neri** · paleta **Vivid v2** · direção símbolo **metaball/cluster** (placeholder no app até entrega final).

**Produto:** app web (e futuro mobile) de **organização de saúde da família** no Brasil — convênio, SUS, exames, círculo de cuidado. **Não** é telemedicina genérica nem prontuário hospitalar.

---

## 1. Resumo executivo (30 segundos)

| | |
|---|---|
| **O que desenhar** | Sistema de identidade: **símbolo-mãe**, **wordmark Ananeri**, **ícone Neri** (chat), regras de cor e uso |
| **Sensação** | Confiança tipo **Nubank** (clareza humana) + calor de **cuidado familiar** — **saturado**, não pastel |
| **Metáfora** | Saúde dispersa → **visão única**; símbolo = **elo fluido / cluster** que conecta (não hospital, não stock médico) |
| **Placeholder hoje** | SVG agente no repo (`packages/web/public/brand/`) — **substituir** por craft profissional |

---

## 2. Arquitetura de marca

| Nome | Onde aparece | Personalidade |
|------|----------------|---------------|
| **Ananeri** | Landing, header, legal, marketing | Serena, integradora, confiável |
| **Neri** | Chat, dock, notificações do agente | **Coloquial**, calma, parceira («vamos ver juntos») |

**Frase de ligação (opcional em materiais):** «A **Neri** é a assistente inteligente da **Ananeri**.»

**Proibido:** sigla **AISI**, apelido **Ana**, gimmick **«AI»** em inglês no logo, tom **médico** ou **infantil** na Neri.

**Anti-persona:** fria · burocrática · operadora · pragmática **sem acolher**.

---

## 3. Essência e promessa

**Ananeri** conecta plano, SUS, exames e família num **só lugar** — a história de saúde **contínua**, visível para quem cuida e para quem atende.

**Neri** organiza e explica o próximo passo — **nunca** diagnostica nem substitui médico.

**Disclaimer (rodapé / chat):** «Informação organizada para apoiar seu cuidado — decisões clínicas com profissional de saúde.»

---

## 4. Paleta **Vivid v2** (obrigatória — nov 2026)

| Papel | Hex | Uso |
|-------|-----|-----|
| Roxo primário | `#7E22CE` | Wordmark, CTAs, lobo dominante do símbolo |
| Roxo hover | `#9333EA` | Lift, gradientes, fusões |
| Magenta | `#EC4899` | Destaque **A** / **i** no wordmark; 2º lobo; links |
| Ouro marca | `#FACC15` | **Acento** no símbolo (≤ ~15% da área do mark) |
| Insight UI | `#FFE566` | Badges IA leves no app — **não** dominar logo |
| Wash UI | `#EDE9FE` | Fundos leves **fora** do símbolo |
| Borda | `#C4B5FD` | Contornos suaves UI |
| Layout | `#F8FAFC` · cards `#FFFFFF` | |
| Texto | `#1E293B` · secundário `#64748B` | |

**Gradiente marca:** `#7E22CE` → `#EC4899` (curto).

**Regras logo (anti-pastel):**

- Formas do símbolo **opacas** (≥ 85%); **sem** lilás `#F3E8FF` / `#EDE9FE` **dentro** do mark.
- **Multicolor** no símbolo: **sim** — 3–4 cores **saturadas** no acorde (referência **Google**, não arco-íris aleatório).
- **Não:** teal farmácia, clone roxo Nubank, verde operadora, ícones médicos.

Swatches: [`../media/ananeri-palette-options-swatches.png`](../media/ananeri-palette-options-swatches.png) (trilha B).

---

## 5. Direção de símbolo (decisão Rafael)

**Escolhida para explorar:** **C — metaball / cluster** — orbes líquidos fundidos, acorde multicolor, centro de **conexão**.

**Alternativas descartadas (mas válidas como contexto):** blob áurea (A), swirl envolvente (B).

**Placeholder de referência (não final):**

- PNG inspiração: [`../media/ananeri-g2f-gen-c.png`](../media/ananeri-g2f-gen-c.png)
- SVG rascunho: [`../media/ananeri-g2g-metaball-symbol.svg`](../media/ananeri-g2g-metaball-symbol.svg), lockup [`../media/ananeri-g2g-metaball-lockup.svg`](../media/ananeri-g2g-metaball-lockup.svg)

**Pedido à designer:** **recriar do zero** com boolean/mesh profissional — placeholder é só direção e proporção de cor.

**Forma desejada:**

- Símbolo **memorável sozinho** (favicon **32px**, app icon **512**).
- **Lockup horizontal:** símbolo **equilibra** «Ananeri» (sans humanista; destaque sutil em **A** e **i** permitido).
- **Neri:** tile/orb **irmão** — mesmo acorde, forma mais **quente/móvel** (ouro + rosa + roxo).
- **Sistema Google-like:** cores fixas; **formas** podem variar por produto (landing vs dock vs empty states).

---

## 6. Moodboard (clima — inspirar, não plagiar)

Rafael aprovou síntese em [`ananeri-brand-moodboard-2026-11-01.md`](./ananeri-brand-moodboard-2026-11-01.md).

**Puxar:** fluido orgânico, gradiente **saturado**, comunidade **envolvente** (anel/áurea), multicolor **com regra**, blend suave **flat ou soft-depth** (não 3D glossy cyan).

**Evitar:** bustos stock «3 users», cruz/estetoscópio, fotos criança como logo, watermarks stock, molecule biotech, infantilizar.

**Arquivos PNG:** pasta [`../media/references/`](../media/references/) (`r2-a` … `r2-e` + rodada 1).

---

## 7. Tipografia (aberto)

- Sans **humanista**, legível PT-BR; «a» redonda; **sem** condensada tech.
- Wordmark **desenhado ou licenciado** — placeholder atual usa DM Sans / Plus Jakarta **só no app**.

---

## 8. Entregáveis esperados

| Item | Formato |
|------|---------|
| Símbolo master | SVG + PNG @1x @2x |
| Lockup Ananeri horizontal | SVG + PNG |
| Ícone Neri (dock) | SVG + PNG |
| Favicon | 32 / 180 / 512 |
| Guia mini | Margem mínima, tamanho mínimo, mono/reverso se aplicável |
| (Opcional) Hero landing | 1 composição static |

**Handoff técnico:** arquivos nomeados para `packages/web/public/brand/` (substituir `ananeri-symbol.svg`, `ananeri-lockup.svg`, `ananeri-neri-tile.svg`, favicon).

---

## 9. Contexto legal / escopo

- Marca **Ananeri** em uso no produto; **registro INPI adiado** (gate faturamento) — designer **não** precisa ® no logo.
- Domínio **ananeri.com.br** registrado; produção OAuth/domínio final ainda em roadmap.
- Dados de saúde — identidade **não** deve parecer brincadeira nem urgência hospitalar.

---

## 10. O que já está no código (pós Phase 1)

PR **[#193](https://github.com/RafaDru/aiyra-care/pull/193)** — tokens Vivid v2 + placeholder G2g + copy Ananeri/Neri. **Substituir assets** quando identidade final estiver pronta (sem mudar paleta salvo acordo).

---

## 11. Anexos internos (opcional para designer)

| Doc | Conteúdo |
|-----|----------|
| [`ananeri-brand-concept.md`](./ananeri-brand-concept.md) | Workshop completo, voz Neri |
| [`ananeri-brand-spec-v2.md`](./ananeri-brand-spec-v2.md) | Spec cor + regras logo |
| [`ananeri-logo-g2g-metaball-report.md`](./ananeri-logo-g2g-metaball-report.md) | Limitações do placeholder |

---

## Contato / decisões

Decisor de marca: **Rafael Drummond**. Dúvidas de produto: agente de implementação AiyraCare (não incluir no PDF se preferir).

**Versão briefing:** 1.0 — 2026-11-01
