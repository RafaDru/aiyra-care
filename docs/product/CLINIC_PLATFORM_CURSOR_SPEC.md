# Especificação Completa para o Cursor AI — Plataforma Ananeri para Consultórios, Clínicas e Atendimento Médico ("Séria, porém Leve")

> **Status:** Especificação Funcional e Arquitetural Pronta para Geração de Código no Cursor AI  
> **Escopo:** Gestão de Consultórios/Clínicas e **O Atendimento Médico em Si (PEP / Prontuário Eletrônico, Anamnese, Exame Físico, Prescrição, Exames, Documentos e Fechamento)**  
> **Filosofia de Produto:** **"Séria, porém leve"** — rigor clínico absoluto, segurança do paciente, conformidade CFM/LGPD e velocidade de uso para o médico (*"Zero Pajama-Time Charting"*), sem telas poluídas ou burocracia de ERPs hospitalares antigos.

---

## 1. Visão Arquitetural: O Que Torna um Sistema Médico "Sério, Porém Leve"

1. **Regra da Tela Única de Atendimento (Zero Labirinto de Abas)**:
   - Durante a consulta, o médico **não pode perder o contato visual com o paciente** caçando menus.
   - O atendimento inteiro acontece no **Cockpit Clínico de 3 Zonas**:
     - **Zona 1 — Faixa de Segurança & Contexto Longitudinal (Esquerda / Topo)**: Alergias em destaque, medicações em uso, linha do tempo de consultas anteriores, exames laboratoriais comparados e curvas antropométricas;
     - **Zona 2 — O Atendimento em Si (Centro)**: Queixa/Anamnese, Exame Físico/Sinais Vitais e Hipótese Diagnóstica (CID-10), com suporte opcional da **Neri Scribe (voz/tópicos → SOAP)**;
     - **Zona 3 — Conduta & Fechamento em 1 Clique (Direita)**: Prescrição (com cálculo automático por peso), Pedido de Exames (TUSS), Atestado/Encaminhamento, Assinatura ICP-Brasil e Orientação de Retorno.
2. **Continuidade Real com o Paciente (Diferencial Ananeri)**:
   - O prontuário do médico já nasce abastecido pelos exames e histórico que o paciente sincronizou (Unimed, Amil, Mater Dei, Fleury/Pardini, ConecteSUS), e tudo o que o médico prescreve ou solicita na consulta alimenta automaticamente o aplicativo do paciente.

---

## 2. Módulos Funcionais Detalhados (Escopo de Geração para o Cursor AI)

### MÓDULO 1 — Agenda Clínica, Recepção e Sala de Espera Ao Vivo
Focado em eliminar faltas (*no-show*) e dar visibilidade imediata do fluxo do dia para o médico e a secretária.

1. **Agenda Multi-Profissional e por Sala**:
   - Visão Dia, Semana e Lista do Médico;
   - Tipos de bloco configuráveis por cor e duração: *Primeira Consulta (40–60 min)*, *Consulta de Rotina / Puericultura (30 min)*, *Retorno de Exames (20 min)*, *Encaixe / Urgência (15 min)*, *Teleconsulta*;
   - Bloqueio rápido de horários (férias, congresso, plantão externo).
2. **Confirmação Automática & Pré-Check-in Digital**:
   - Disparo automático 24h antes (WhatsApp / Notificação App Ananeri) para o paciente confirmar presença em 1 toque;
   - **Formulário Rápido de Pré-Consulta (3 perguntas)**: *"Qual o principal motivo da consulta?"*, *"Sintomas ou intercorrências recentes?"*, *"Alguma dúvida específica para o médico?"* — chega preenchido direto no topo do atendimento.
3. **Fila da Sala de Espera em Tempo Real (Kanban / Barra de Status)**:
   - Estados do agendamento: `scheduled` (Agendado) → `confirmed` (Confirmado) → `checked_in` (Na Sala de Espera — mostra contador de minutos aguardando) → `in_progress` (Em Atendimento com o Médico) → `completed` (Atendido) | `no_show` (Faltou);
   - Botão **"Chamar Paciente / Iniciar Atendimento"** que abre o Cockpit Clínico e inicia o cronômetro discreto da consulta.

---

### MÓDULO 2 — O Atendimento Médico em Si (Cockpit Clínico / PEP)
O coração da plataforma. Deve ser extremamente rápido via teclado (atalhos `/` para templates e macros) ou via voz/IA.

#### 2.1 Faixa Fixa de Segurança do Paciente (Patient Safety Header)
Sempre visível no topo do atendimento:
- Nome completo, nome social (se houver), sexo biológico e **idade exata detalhada** (ex.: `6 anos, 4 meses e 12 dias` para pediatria; `42 anos` para adultos);
- **Badges Críticos de Segurança**:
  - **Alergias Medicamentosas e Alimentares** (em vermelho/destaque se presentes, ou *"Nega alergias conhecidas"*);
  - **Condições Crônicas / Problemas Ativos** (ex.: *Asma intermitente*, *Hipertensão*);
  - **Medicamentos em Uso Contínuo**.

#### 2.2 Anamnese e Evolução Clínica (SOAP ou Livre + Templates por Especialidade)
- **Modos de escrita intercambiáveis sem perder texto**:
  1. **Modo Estruturado SOAP**:
     - **S (Subjetivo)**: Queixa principal (QP), História da Moléstia Atual (HMA), Revisão de Sistemas, Antecedentes Pessoais e Familiares;
     - **O (Objetivo)**: Exame físico geral e segmentar, sinais vitais e achados relevantes de exames complementares;
     - **A (Avaliação)**: Impressão clínica, raciocínio diagnóstico, evolução do quadro e códigos **CID-10** (com busca fonética/semântica rápida);
     - **P (Plano)**: Conduta terapêutica, orientações não-farmacológicas, exames solicitados e prazo de retorno.
  2. **Modo Folha Contínua (Livre com Blocos `/` estilo Notion)**: para médicos que preferem texto corrido com inserção rápida de blocos (`/sinais-vitais`, `/receita`, `/exames-recentes`, `/puericultura`).
- **Templates Inteligentes por Especialidade (Customizáveis pelo Médico)**:
  - *Pediatria / Puericultura*: Marcos do desenvolvimento (DNPM), alimentação/aleitamento, sono, vacinação e curva OMS;
  - *Clínica Médica / Check-up*: Risco cardiovascular, rastreamentos preventivos, hábitos de vida;
  - *Ginecologia / Pré-Natal*: DUM, IG calculada automaticamente, DPP,BCF, altura uterina;
  - *Atendimento Agudo / Pronto-Atendimento*: Fluxo rápido de queixa, sinais de alarme e conduta imediata.

#### 2.3 Neri Clinical Scribe & Co-Pilot (IA Médica sob a Resolução CFM 2.454/2026)
- **Transcrição Ambiente ou Ditado de Notas**:
  - O médico pode gravar o diálogo da consulta (com aceite explícito do paciente) ou ditar um resumo rápido de 30 segundos;
  - A **Neri Clínica** transforma o áudio/notas nos campos **S, O, A, P**, sugere os **CID-10** pertinentes e extrai automaticamente os rascunhos de receita e pedidos de exame mencionados na fala!
- **Conformidade CFM 2.454/2026 Nativa**:
  - Checkbox de ciência/consentimento do paciente para auxílio de IA;
  - O documento fica em estado `draft` até a revisão e clique explícito do médico em **"Revisar e Assinar Atendimento"**;
  - Rodapé auditável: *"Registro elaborado com auxílio de inteligência artificial e integralmente revisado e validado pelo(a) médico(a) responsável."*

#### 2.4 Sinais Vitais, Antropometria e Calculadoras Clínicas Automáticas
- **Painel de Sinais Vitais Rápido**:
  - Peso ($\text{kg}$), Estatura ($\text{cm}$), Perímetro Cefálico ($\text{cm}$), PA ($\text{mmHg}$), FC ($\text{bpm}$), FR ($\text{irpm}$), Temperatura ($^\circ\text{C}$), $\text{SpO}_2$ ($\%$);
- **Cálculos Instantâneos em Tempo Real**:
  - **IMC** e classificação automática (adulto e percentil/Z-score pediátrico OMS);
  - **Superfície Corporal ($\text{m}^2$ — Mosteller)** e peso de referência salvos no contexto da consulta para alimentar a **Calculadora de Doses da Prescrição**;
  - **Gráfico de Crescimento OMS Interativo** (Peso×Idade, Estatura×Idade, IMC×Idade, PC×Idade) atualizado no mesmo segundo em que o médico digita o peso/altura do dia.

#### 2.5 Painel Comparativo de Exames e Laudos Durante a Consulta
- Tabela longitudinal lado a lado mostrando a evolução de cada biomarcador (ex.: *Hemoglobina, Ferritina, TSH, Glicemia, Colesterol*) nas últimas N coletas, destacando valores fora da referência;
- Visualizador rápido do PDF original do laboratório (Fleury, Pardini, Mater Dei, Unimed) sem sair da tela da consulta;
- Botão **"Importar valores selecionados para a evolução (O)"** com 1 clique.

---

### MÓDULO 3 — Prescrição Digital, Pedidos de Exames e Documentos Médicos
Tudo o que o paciente precisa levar da consulta, gerado em segundos e sem retrabalho.

#### 3.1 Prescrição Médica Inteligente (Nativa + Integração Memed / ICP-Brasil)
- **Tipos de Receituário**:
  - Receita Simples, Receita de Controle Especial (Branca em 2 vias / Antimicrobianos / Psicotrópicos), Uso Contínuo (com validade configurável);
- **Assistente de Posologia & Calculadora Pediátrica por Peso**:
  - Ao selecionar um medicamento (ex.: *Amoxicilina suspensão $250\text{mg}/5\text{mL}$* ou *Dipirona gotas*) e tendo o peso do paciente registrado no atendimento (ex.: $18\text{ kg}$), o sistema calcula e sugere o volume exato em $\text{mL}$ ou gotas conforme a faixa terapêutica ($\text{mg/kg/dia}$), que o médico apenas confirma ou ajusta;
- **Trava de Segurança (Safety Guardrails)**:
  - Alerta imediato se o princípio ativo prescrito coincidir com alguma **alergia registrada** no perfil do paciente;
  - Alerta de interação medicamentosa grave com os medicamentos de uso contínuo já cadastrados;
- **Protocolos / Receitas Favoritas do Médico**:
  - O médico salva combos frequentes (ex.: *"Kit Broncoespasmo Infantil"*, *"Sintomáticos IVAS"*, *"Suplementação Ferro + Vitamina D"*) e aplica na receita atual em 1 clique.

#### 3.2 Solicitação de Exames (Laboratoriais, Imagem e Procedimentos — Padrão TUSS)
- Busca rápida por nome popular ou código **TUSS**;
- **Kits / Perfis de Exames por Especialidade**: com 1 clique o médico insere o pacote (ex.: *"Rotina Pediátrica Anual"*, *"Check-up Metabólico Adulto"*, *"Investigação Anemia"*) e edita apenas o que quiser;
- Preenchimento automático da **Indicação Clínica** e **CID-10** a partir da Avaliação (`A`) do atendimento, pronto para gerar a **Guia TISS de SP/SADT** sem glosa;
- **Vínculo Automático no Grafo (`clinical_entity_links`)**: cada exame solicitado cria um "slot esperado" no perfil do paciente; quando o resultado entra via sync de laboratório, o sistema avisa o médico e a família que o pedido daquela consulta foi concluído!

#### 3.3 Atestados, Encaminhamentos, Laudos e Relatórios
- Gerador em 1 clique com preenchimento automático dos dados do paciente, data/hora e carimbo digital do médico (Nome, CRM/UF, RQE):
  - **Atestado Médico** (com opção de exibir ou omitir o CID-10 mediante autorização expressa do paciente);
  - **Declaração de Comparecimento** (para o paciente e/ou acompanhante legal, com horário de entrada e saída);
  - **Carta de Encaminhamento para Especialista** (puxando automaticamente o resumo clínico e exames pertinentes);
  - **Relatório Médico para Escola / Esporte / Reembolso de Convênio**.

#### 3.4 Assinatura Digital ICP-Brasil e Entrega Multicanal ("Zero Papel Perdido")
- Assinatura criptográfica **ICP-Brasil** (certificado em nuvem Vidaas / BirdID / SafeID ou integração via Memed) com QR Code de validação nacional para farmácias e laboratórios;
- **Entrega Instantânea em 3 vias simultâneas**:
  1. **Direto no App Ananeri do Paciente/Família** (os medicamentos já entram na aba *Medicamentos* com horários, os exames entram em *Exames Solicitados* e as orientações de casa ficam salvas na *Linha do Tempo*);
  2. **Envio direto por WhatsApp / E-mail** com PDF assinado;
  3. **Impressão limpa** (para pacientes que preferem papel).

---

### MÓDULO 4 — Fechamento da Consulta, Retorno (*Recall*) e Gestão Leve da Clínica
O backoffice enxuto para que o consultório funcione como um relógio sem precisar de planilhas paralelas.

1. **Plano de Cuidado Pós-Consulta & Agendamento de Retorno**:
   - No fechamento do atendimento, o médico define o prazo de retorno (ex.: *"Retorno com exames em 15 dias"* ou *"Próxima consulta de puericultura em 3 meses"*);
   - O sistema já coloca o paciente na **Fila de Recall / Retornos Programados** da clínica e envia um lembrete automático ao paciente na data certa para agendar!
2. **Faturamento de Convênio Simplificado (TISS Consulta & SP/SADT)**:
   - Ao encerrar o atendimento de um paciente de convênio (Unimed, Amil, Bradesco, etc.), a **Guia TISS de Consulta** já nasce preenchida com o número da carteirinha, código TUSS da consulta e CID;
   - Fechamento de lote XML mensal em 2 cliques para envio à operadora.
3. **Financeiro Leve do Atendimento (Particular & Repasse)**:
   - Registro rápido do recebimento na recepção ou link de pagamento (Pix, Cartão, Dinheiro, Convênio);
   - Emissão de Recibo Médico (para imposto de renda / reembolso) ou NFS-e;
   - Relatório simples de atendimentos realizados e repasse por médico/período.

---

## 3. Modelo de Dados Relacional Completo (PostgreSQL Migrations)

Abaixo está o schema consolidado para o Cursor AI implementar em `database/relational/` (conectado à `055_organizations.sql`):

- **`065_clinic_profiles_and_patient_links.sql`**:
  - Estende `organization_members` com `professional_council`, `council_number`, `council_uf`, `rqe`, `specialty`, `digital_signature_provider`;
  - Cria `clinic_patient_links` (vínculo consentido entre paciente e clínica, com escopo e aceite da Resolução CFM 2.454/2026);
  - Cria `clinician_templates` (modelos favoritos de anamnese, receitas e kits de exames de cada médico).
- **`066_clinic_appointments_and_waiting_room.sql`**:
  - Cria `clinic_appointments` (agenda, status da fila de espera `scheduled | confirmed | checked_in | in_progress | completed | no_show`, tempos de chegada/início/fim e dados do Pré-Check-in da família).
- **`067_clinical_encounters_and_vitals.sql`**:
  - Cria `clinical_encounters` (evolução SOAP/livre, sinais vitais e antropometria da consulta, códigos `icd10_codes[]`, `tuss_codes[]`, metadados de revisão de IA CFM 2.454/2026, resumo traduzido para a família e prazo de retorno `recommended_return_days`).
- **`068_clinical_prescriptions_orders_and_documents.sql`**:
  - Cria `clinical_prescriptions_and_orders` (receitas estruturadas com posologia, pedidos de exame TUSS, atestados/encaminhamentos, status de assinatura ICP-Brasil e status de sincronização automática com o app da família).
- **`069_clinic_billing_and_tiss_guides.sql`**:
  - Cria `clinic_encounter_billings` (modalidade `private | insurance`, valor, status de pagamento/recibo, número da guia TISS e lote).

---

## 4. Roteiro de Execução em Waves para o Cursor AI

Para gerar cada módulo no Cursor AI sem estourar contexto, execute na seguinte ordem:

1. **Wave C1 — Fundação Clínica, Perfil CRM/RQE e Sala de Espera/Agenda (`065` + `066`)**:
   - Backend hexagonal (`packages/api/src/domain/clinic/`, `application/clinic/`, `infrastructure/http/clinic/`);
   - Tela Web `/clinic/schedule` (Agenda + Fila de Sala de Espera em Tempo Real + Pré-Check-in).
2. **Wave C2 — Cockpit de Atendimento Médico (PEP 3 Zonas + Sinais Vitais/Curvas OMS + Exames Comparados) (`067`)**:
   - Tela Web `/clinic/encounters/:id` com Faixa de Segurança (Alergias/Meds), Editor SOAP + Templates por Especialidade, Calculadora Antropométrica em tempo real e Comparador de Exames.
3. **Wave C3 — Neri Clinical Scribe (Voz/Notas → SOAP + CID-10/TUSS + Conformidade CFM 2.454/2026)**:
   - Integração com o serviço de IA para estruturação automática do atendimento e geração simultânea do *Resumo Pós-Consulta* para o paciente.
4. **Wave C4 — Prescrição Inteligente (Calculadora Pediátrica por Peso + Alerta de Alergia), Pedidos TUSS e Atestados (`068`)**:
   - Emissão de receitas, kits de exames e atestados com assinatura digital e entrega direta nas abas do paciente no app Ananeri.
5. **Wave C5 — Fechamento, Recall Automático de Retornos, Guias TISS e Financeiro Leve (`069`)**.
