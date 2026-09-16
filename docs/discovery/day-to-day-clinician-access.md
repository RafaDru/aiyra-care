# Discovery — dia a dia da família + acesso do médico

> **Status:** discovery (debate aberto)  
> **Última atualização:** 2026-09-11  
> **Dono:** produto / negócio  
> **Relacionado:** [`FOCO_ATUAL.md`](../FOCO_ATUAL.md), [`B2B_PARTNERS.md`](../B2B_PARTNERS.md), [`referral-growth-loop.md`](./referral-growth-loop.md)

## Objetivo

Tornar **registro do cotidiano** (sintoma, medida, medicação, evento) **tranquilo, simples e rápido**, e facilitar **entregar contexto ao médico** antes/durante a consulta — com extrato **completo o suficiente** para impressionar o profissional e abrir caminho para conversão B2B.

**Hipótese de negócio:** quanto mais útil e “pronto para consulta” o material for para o médico, maior a chance de o médico adotar (ou recomendar) o AiyraCare — reforçada por um **programa de indicação bilateral** (paciente ↔ médico). Ver debate em [`referral-growth-loop.md`](./referral-growth-loop.md).

---

## Personas

| Persona | Momento | Dor |
|---------|---------|-----|
| **Cuidador familiar** | Dia a dia + véspera de consulta | Esquece de registrar; não sabe o que anotar; medo de perder informação |
| **Médico** | 5–10 min antes/durante consulta | PDF desorganizado, WhatsApp sem estrutura, falta sequência consulta→exame |
| **AiyraCare (negócio)** | Aquisição B2B2C | Médico precisa *ver valor em 30s* sem criar conta obrigatória no primeiro contato |

---

## Jobs-to-be-done

### Família (captura)

1. **Registrar em &lt; 30s** algo que aconteceu agora (febre, medicação dada, vômito, consulta marcada).
2. **Ver o que importa hoje** (eventos do dia, lembretes, acompanhamento ativo).
3. **Montar pacote para o médico** em 1 fluxo (não caçar aba por aba).

### Médico (consumo)

1. **Abrir extrato** sem fricção (link, QR na recepção, PDF no WhatsApp).
2. **Confiar** no conteúdo (fonte, data, disclaimer, sem “inventar” com IA no resumo determinístico).
3. **Entender sequência** (consulta → autorização → exame) quando relevante.

---

## Inventário — o que já temos

| Capacidade | Onde | Gap para discovery |
|------------|------|---------------------|
| Resumo clínico determinístico | `PatientContextService`, export modal | Não é “1 toque” no dia a dia |
| Export PDF / imprimir | `PatientClinicalExportModal`, `PatientClinicalExportSheet` | Família ainda entra no perfil |
| **Link temporário** (48h UI / 7d default API) | `POST /patients/:id/clinical-export/shares`, página `/clinical-export/:token` | Sem QR, sem WhatsApp nativo, sem e-mail transacional |
| Modos `summary` / `full` | API + UI | Família pode não saber qual escolher |
| Acompanhamento (`health_threads`) | Wizard, entries | Não é o fluxo default de “anotar agora” |
| Agenda + lembretes | `scheduled_events`, `CareReminderBanner` | Desconectado de “export para consulta” |
| Ava dock | Chat + aceleradores G1 | Pode capturar com confirmação (G3) — não desenhado para intake rápido |
| Share família (perfil) | `profile-shares` | É ACL família, não médico externo |

---

## Proposta A — «Registrar agora» (captura familiar)

Três abordagens (podem coexistir em fases):

### A1 — Botão global «+ Registro rápido» (recomendada para MVP)

- FAB ou item fixo no header/dashboard.
- Sheet com **5 tipos** (ordem sugerida): sintoma/nota · medida · medicação administrada · evento agenda · foto/documento.
- Pré-seleciona **paciente da lente** (último aberto ou lente Ava).
- Opcional: vincular ao **acompanhamento ativo** (`health_thread_id`).
- **Prós:** previsível, não depende de LLM, testável em QA.  
- **Contras:** mais um botão na UI — precisa design enxuto.

### A2 — Ava como intake conversacional

- «Lucas teve febre 38,5» → Ava propõe salvar em thread/medida → usuário confirma (G3).
- **Prós:** alinha “parceira”; mãos livres.  
- **Contras:** latência, quota LLM, QA mais complexo; não substitui A1 no MVP.

### A3 — Carteira «Hoje»

- Bloco no dashboard/Carteira: timeline do dia + CTA inline.
- **Prós:** contexto visual.  
- **Contras:** só ajuda quem já abriu o app — não resolve captura urgente fora do perfil.

**Recomendação:** **A1 MVP** → A3 na mesma entrega visual → A2 quando G3 estiver sólido.

---

## Proposta B — Entregar ao médico (canais)

| Canal | Esforço | Experiência médico | Notas |
|-------|---------|-------------------|--------|
| **PDF / Imprimir** | Já existe | Abre em qualquer lugar | Usuário envia WhatsApp manualmente — **zero integração** |
| **Link temporário** | Já existe | Página web responsiva, sem login | Copiar link; falta QR e preview social |
| **QR Code** | Baixo | Médico escaneia na recepção | Gerar QR do `shareUrl` existente; TTL + revogação |
| **E-mail** | Médio | Link + resumo no corpo | Resend; template; consentimento do cuidador |
| **WhatsApp deep link** | Médio | `wa.me` com texto + URL | Não envia PDF automático sem API Business |
| **Portal médico (conta)** | Alto | Dashboard B2B | Épico `b2b-segment-clinicians` — fase 2 |

### Fluxo unificado sugerido: **«Levar na consulta»**

1. Cuidador toca **«Preparar consulta»** (dashboard ou perfil).
2. Escolhe **profundidade** (ver seção C).
3. Escolhe **canal**: copiar link · QR · PDF · e-mail (fase 2).
4. Opcional: **código do médico** (futuro referral) embutido no link para atribuição.

**Recomendação MVP:** reutilizar export existente + wizard **«Levar na consulta»** com **QR + link + PDF** na mesma tela.

---

## Proposta C — Profundidade do extrato (tiers)

| Tier | Conteúdo | Público | Risco |
|------|----------|---------|-------|
| **Essencial** | Alertas, alergias, meds ativos, 7d eventos | UPA, consulta rápida | Baixo |
| **Consulta** (default) | Essencial + timeline 30d + acompanhamentos + planos | Pediatra rotina | Médio |
| **Completo** | Modo `full` atual (exames, laudos, autorizações) | Especialista, internação eletiva | LGPD — mais PHI no link |

**Hipótese:** médico impressionado = **Consulta** bem formatado + sequência visual (não necessariamente `full` no primeiro contato).

**Requisito:** resumo **determinístico** (já é) + marca AiyraCare + «gerado pelo cuidador em DD/MM».

---

## Programa de indicação (boca a boca)

O termo usual é **programa de indicação** (*referral program*) ou **growth loop bilateral**.

Documento de debate (regras, descontos vitalícios vs temporários, anti-fraude): **[`referral-growth-loop.md`](./referral-growth-loop.md)**.

Resumo para alinhar com este discovery:

- Paciente indica médico → desconto no plano familiar quando médico assina.
- Médico indica pacientes → desconto no plano profissional (futuro) por pacientes convertidos.
- Atribuição via **código no link de export** ou cadastro com `referral_code`.

---

## Fases sugeridas

| Fase | Entrega | Épico roadmap |
|------|---------|---------------|
| **D0** | Este doc + debate referral | `family-day-to-day-discovery` |
| **D1** | Wizard «Levar na consulta» (link + QR + PDF) | `clinician-share-channels` |
| **D2** | «+ Registro rápido» (5 tipos) | `family-quick-capture` |
| **D3** | Bloco «Hoje» na Carteira | `family-day-timeline` |
| **D4** | E-mail médico + código referral | `referral-growth-loop` + billing |
| **D5** | Portal médico leve | `b2b-segment-clinicians` |

---

## LGPD / clínico

- Link público = **minimização** + TTL + revogação + log `created_by` (já em `clinical_export_shares`).
- Disclaimer no extrato (já existe) — reforçar em copy médico.
- Programa de indicação: termos específicos, sem PHI no código de referral.
- Tier **Completo** em link: revisão **legal** antes de marketing agressivo a médicos.

---

## Métricas de sucesso (discovery → MVP)

| Métrica | Alvo inicial |
|---------|----------------|
| Tempo médio captura rápida | &lt; 30s (task test) |
| % consultas com export/share 7d | Baseline → +20% após wizard |
| Aberturas de link pelo médico (token hit) | Medir `GET /clinical-export/share/:token` |
| Conversão referral (fase 4) | TBD após debate fiscal |

---

## Perguntas abertas (debate)

1. **Canal prioritário** para MVP: QR + link, ou PDF WhatsApp manual basta na v1?
2. **Default do extrato:** `summary` ou novo tier «Consulta»?
3. **Médico sem conta:** sempre anônimo via link, ou convite para criar conta profissional após 1º acesso?
4. **Referral:** desconto vitalício vs enquanto indicado pagar — ver doc dedicado.

---

## Próximo passo técnico (após aprovação)

Plano de implementação (`writing-plans`): wizard «Levar na consulta» + QR (sem novo backend além de opcional analytics).

Suite QA alvo: `patient-clinical-export`, `family-quick-capture` (novas).
