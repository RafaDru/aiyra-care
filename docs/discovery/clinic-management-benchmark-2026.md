# Estudo de Mercado & Produto (2026): Plataformas para Gestão de Clínicas e Consultórios — Oportunidades para a Ananeri

> **Data:** Novembro de 2026  
> **Escopo:** Benchmark nacional e internacional de softwares para clínicas/consultórios (PMS + PEP/EHR) e definição das features de maior alavancagem para incorporar ao ecossistema **Ananeri** (`@ananeri/*`).  
> **Documentos relacionados:** [`B2B_PARTNERS.md`](../B2B_PARTNERS.md), [`day-to-day-clinician-access.md`](./day-to-day-clinician-access.md), [`referral-growth-loop.md`](./referral-growth-loop.md).

---

## 1. Visão Geral do Mercado em 2026 (Brasil e Mundo)

O mercado de softwares médicos para consultórios e clínicas divide-se hoje em **6 grandes blocos funcionais**:
1. **Agenda & Recepção (Front-Desk)**: agendamento online, fila/sala de espera, confirmação via WhatsApp (redução de *no-show* em até 40%) e lista de espera.
2. **Prontuário Eletrônico do Paciente (PEP / EHR)**: evolução clínica estruturada (SOAP), templates por especialidade, curvas antropométricas (OMS), anexos e histórico.
3. **IA Clínica & Documentação Ambiente (AI Scribe)**: gravação/transcrição da consulta com geração de rascunho de evolução, sugestão de CID-10/TUSS e resumo do histórico (regulamentado no Brasil pela **Resolução CFM 2.454/2026**, que exige transparência ao paciente e revisão/assinatura humana do médico).
4. **Prescrição Eletrônica & Documentos Assinados**: receitas simples e de controle especial, pedidos de exames, atestados e laudos com assinatura **ICP-Brasil** (nativa ou via integração **Memed**) enviados ao celular do paciente.
5. **Faturamento de Convênios (Padrão TISS/TUSS/ANS)**: validação de elegibilidade da carteirinha, emissão de guias (Consulta, SP/SADT), geração de lotes XML e auditoria de glosas.
6. **Gestão Financeira & CRM Médico**: fluxo de caixa, emissão automática de NFS-e, split/repasse por profissional e campanhas de retorno (*recall* de check-up e puericultura).

### 1.1 Comparativo dos Principais Players (Brasil — 2026)

| Plataforma | Foco Principal | Pontos Fortes | Limitações / Lacunas que a Ananeri Resolve |
|---|---|---|---|
| **Afya iClinic** | Consultórios e clínicas pequenas (1–10 médicos) | UX limpa, *Afya iClinic Assist* (IA scribe e resumo), curvas pediátricas, forte presença em pediatria e clínica médica | É uma **ilha fechada da clínica**: o médico não recebe automaticamente os exames que o paciente fez no Fleury, Mater Dei, Unimed ou SUS, nem o diário da família entre consultas. |
| **Feegow Clinic** | Clínicas médias com alto volume de convênios | Faturamento TISS robusto, controle de glosas, certificação SBIS, *Noa Notes* (IA) | Interface densa e burocrática; foco em recepção/faturamento, com baixíssima experiência para a família/paciente em casa. |
| **Amplimed** | Consultórios focados em automação WhatsApp e IA | Chatbot de agendamento via API oficial do WhatsApp, transcrição por IA | TISS e IA cobrados como *add-ons*; sem agregação longitudinal da vida clínica externa do paciente. |
| **Conclínica** | Clínicas de 1 a 10 profissionais (convênio + particular) | Custo-benefício em TISS + telemedicina ilimitada + transcrição IA acessível | Foco operacional interno; o paciente só recebe mensagens de confirmação e links de vídeo. |
| **Aura Clinic** | Consultórios particulares individuais (IA-first) | Modelo freemium agressivo, *AI Scribe* nativo + assinatura ICP-Brasil em nuvem | Sem faturamento TISS em lote, sem integração com operadoras/laboratórios nem visão familiar. |
| **GestãoDS** | Clínicas particulares focadas em CRM e fidelização | Forte em marketing de retorno (*recall*), dashboards de retenção e IA no prontuário | Não conecta dados clínicos externos nem resolve a fragmentação de exames do paciente. |
| **Prontmed** | Médicos especialistas (25 anos de mercado) | Templates clínicos estruturados, scores médicos e integração com bulário | Financeiro e engajamento do paciente limitados. |

### 1.2 Referências Globais (EUA / Canadá / Europa)
- **Jane App / Tebra / Athenahealth / CureMD**: em 2026 consolidaram o conceito de **"Zero Pajama-Time Charting"** (o prontuário fecha quando a consulta termina, graças ao *Ambient AI Scribe* + *Digital Intake* preenchido pelo paciente no celular antes de entrar na sala) e **Interoperabilidade Longitudinal** (o histórico acompanha o paciente entre laboratórios e clínicas).

---

## 2. O Grande Ponto Cego dos Softwares de Clínica (E a Vantagem Injusta da Ananeri)

Todos os softwares acima (iClinic, Feegow, Amplimed, GestãoDS) sofrem do mesmo problema estrutural: **eles são centrados nas quatro paredes do consultório**.
- Quando uma mãe leva o filho ao pediatra (ou um adulto vai ao cardiologista), **85% dos dados relevantes aconteceram fora daquele consultório**: exames feitos no Hermes Pardini/Fleury, internação ou pronto-socorro no Mater Dei, vacinas aplicadas no posto (ConecteSUS), autorizações na Unimed/Amil e sintomas/medicações da última semana em casa.
- Hoje, o médico perde **10 a 15 minutos da consulta** abrindo PDFs soltos no WhatsApp, tentando ler fotos de exames no celular da mãe e digitando valores manualmente no iClinic/Feegow.

### A Tese Ananeri para Clínicas e Consultórios (**"Prontuário Vivo B2B2C"**):
Em vez de começar construindo um ERP contábil pesado de backoffice hospitalar, a Ananeri entra no consultório pela **porta de maior valor clínico e menor atrito**:
> **Antes da consulta**, a família prepara e compartilha o contexto vivo; **durante a consulta**, o médico ganha superpoderes de leitura longitudinal, evolução assistida pela **Neri IA** e prescrição; **depois da consulta**, o plano terapêutico (receita, pedidos de exames e data de retorno) cai estruturado direto no aplicativo da família!

---

## 3. Recursos e Features Principais para Incorporarmos à Ananeri

Abaixo estão os **10 recursos de maior impacto** divididos em **3 Horizontes de Entrega (H1 → H2 → H3)**, desenhados para aproveitar a arquitetura que a Ananeri já possui (`organizations` na migration 055, `@ananeri/connect`, `clinical_entity_links`, `health_threads` e a agente **Neri**):

### Horizonte 1 (H1) — A Ponte Consultório ↔ Família (Alto Valor Percebido, Rápida Adoção)

#### 1. Pré-Consulta Inteligente & Check-in Digital ("Levar na Consulta" 2.0)
- **Como funciona**: 24h antes da consulta agendada, a família recebe um toque da Neri: *"Preparar consulta com Dra. Camila"*. A família revisa em 30 segundos os sintomas da semana, medicações em uso e dúvidas.
- **Para o médico/clínica**: O médico recebe um link/QR seguro (ou abre no **Console Médico Ananeri**) um **Briefing Pré-Consulta de 1 Página** contendo:
  - Motivo da consulta e linha do tempo dos últimos 30 dias;
  - Exames recém-sincronizados de portais externos (Mater Dei, Fleury, Unimed, SUS) já tabulados com destaques de alteração;
  - Alergias, medicações ativas, situação vacinal e curva antropométrica OMS atualizada.
- **Alavanca**: Economiza 10 minutos de anamnese mecânica e impressiona o médico no primeiro contato (motor de aquisição viral B2B2C).

#### 2. Console do Médico & Workspace da Clínica (Evolução de `organizations`)
- **Como funciona**: Painel web dedicado para o profissional de saúde (`role: clinician` ou `admin` na tabela `organization_members`).
- **Features chave**:
  - **Fila do Dia / Pacientes Compartilhados**: lista dos pacientes que compartilharam seu prontuário Ananeri com o médico/clínica;
  - **Comparador Longitudinal de Biomarcadores**: visualização lado a lado de séries históricas de exames (mesmo que coletados em laboratórios diferentes!) e curvas de crescimento OMS (peso, estatura, IMC, perímetro cefálico);
  - **Botão "Solicitar Atualização de Sync"**: o consultório pode disparar um pedido para o paciente autorizar a atualização dos exames do convênio/laboratório antes da consulta.

#### 3. Neri Clinical Co-Pilot & AI Scribe (Em conformidade com a Resolução CFM 2.454/2026)
- **Como funciona**: Durante o atendimento (presencial ou teleconsulta), o médico pode usar a **Neri Modo Clínico**:
  - **Modo Scribe / Ditado Estruturado**: transcreve a conversa ou o ditado médico e preenche automaticamente o modelo SOAP (*Subjetivo, Objetivo, Avaliação, Plano*) com sugestão de **CID-10** e códigos **TUSS**;
  - **Rodapé de Conformidade CFM 2.454/2026**: registro explícito de consentimento do paciente e assinatura de revisão humana pelo médico;
  - **Geração Automática do "Resumo para a Família"**: ao encerrar a evolução técnica do médico, a Neri gera uma versão em linguagem acolhedora com as orientações de casa, que vai direto para o app da família.

---

### Horizonte 2 (H2) — Fechando o Ciclo Clínico (Prescrição, Pedidos e Agenda Inteligente)

#### 4. Prescrição Digital (ICP-Brasil / Integração Memed) com "Loop de Adesão" no App da Família
- **O problema nos sistemas atuais**: O médico emite um PDF assinado no Memed/iClinic, manda no WhatsApp, e a família ainda precisa cadastrar os remédios e horários manualmente.
- **Na Ananeri**: Quando o médico prescreve na Ananeri (ou via webhook Memed/ICP-Brasil):
  - Os **medicamentos prescritos** já entram estruturados na aba **Medicamentos** do paciente com posologia e alertas de horário;
  - Os **pedidos de exames** entram na lista de **"Exames Solicitados / Pendentes"** — e quando o laboratório libera o laudo via sync, a Ananeri **cruza automaticamente o pedido do médico com o resultado entregue** (`clinical_entity_links`: Consulta → Pedido → Autorização → Resultado)!

#### 5. Agenda Clínica com Confirmação Multicanal (WhatsApp + App Ananeri) e *Recall* Automático
- **Features chave**:
  - Agenda multi-profissional e por sala/especialidade;
  - Confirmação automática em 1 clique via WhatsApp e notificação nativa no app Ananeri da família (com botão *"Adicionar à agenda da família"*);
  - **Motor de Recall Clínico (Puericultura e Check-up)**: diferentemente de um CRM genérico, a Ananeri sabe a idade exata da criança (protocolo SBP de consultas aos 2, 4, 6, 9, 12, 18 meses...), sabe quando uma vacina ou exame de controle vence e sugere proativamente à família agendar o retorno com a clínica!

#### 6. Teleconsulta Contextual Integrada
- Vídeo seguro integrado diretamente à tela do prontuário da Ananeri, permitindo que médico e família olhem juntos para a mesma curva de crescimento ou evolução de exame durante a chamada.

---

### Horizonte 3 (H3) — Operação da Clínica, Convênios (TISS) e Financeiro

#### 7. Elegibilidade Automática & Faturamento TISS sem Glosas (Alavancando o `@ananeri/connect`)
- **Grande diferencial técnico**: A Ananeri já possui conectores reais com portais de operadoras (Unimed, Amil, Bradesco Saúde).
- Podemos usar essa mesma inteligência para a clínica:
  - **Validação automática de elegibilidade e carência** da carteirinha do paciente antes da consulta;
  - **Geração de Guias TISS (Consulta e SP/SADT)** e lotes XML com crítica prévia anti-glosa.

#### 8. Gestão Financeira Enxuta, Split/Repasse Médico e Cobrança Integrada
- Controle de recebimentos (particular via Pix/Cartão/Stripe e lotes de convênio), cálculo automático de repasse por profissional/sala e emissão de NFS-e.

---

## 4. Resumo Estratégico: Por Onde Começar na Ananeri?

| Prioridade | Feature para Incorporar | Esforço | Impacto na Família (B2C) | Impacto no Médico/Clínica (B2B) |
|---|---|---|---|---|
| **1º (Agora)** | **Briefing Pré-Consulta + QR Code ("Levar na Consulta" 2.0)** | Baixo (evolui export atual) | Altíssimo (consulta rende o dobro) | Altíssimo (vê valor em 30s sem cadastro prévio) |
| **2º (Curto)** | **Plano Pós-Consulta Vivo (Médico/Neri → App da Família)** | Médio | Altíssimo (sai da consulta com remédios e retornos já configurados) | Alto (fideliza a família e reduz dúvidas no WhatsApp pessoal) |
| **3º (Curto/Médio)** | **Workspace do Médico (`Organization` Console + Neri Scribe SOAP)** | Médio | Médio | Altíssimo (economiza ~2h/dia de digitação do médico) |
| **4º (Médio)** | **Agenda com Recall Clínico (Puericultura/Vacinas/Exames) + Prescrição ICP** | Médio/Alto | Alto (nunca perde janela de retorno ou receita) | Altíssimo (reduz *no-show* em 40% e aumenta recorrência) |
| **5º (Longo)** | **Elegibilidade Automática de Convênios & Faturamento TISS** | Alto | Transparente (autorizações mais rápidas) | Alto (substitui de vez o ERP legado da clínica) |
