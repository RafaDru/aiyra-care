# Mapa de tratamento de dados (LGPD) — AiyraCare

> **Última atualização:** 2026-08-13  
> Documento operacional interno — complementa a Política de Privacidade v1.0. Revisar com DPO/advogado antes do go-live.

## Controlador

| Campo | Valor (preencher antes do go-live) |
|-------|-------------------------------------|
| Razão social | [CNPJ / razão social] |
| Canal privacidade | privacidade@aiyracare.com (`LEGAL_PRIVACY_EMAIL`) |
| Canal suporte | `LEGAL_SUPPORT_EMAIL` (opcional) |

## Registro de operações (resumo)

| Dado | Titular | Finalidade | Base legal (LGPD) | Retenção | Suboperador |
|------|---------|------------|-------------------|----------|-------------|
| E-mail, auth_subject, display_name | Conta (cuidador) | Autenticação, identificação | Execução de contrato | Conta ativa + logs legais | Supabase |
| Perfil da conta (contato, bio) | Conta | Comunicação, preferências | Contrato / consentimento | Conta ativa | Postgres |
| Nome, nascimento, CPF, CNS, sexo, medidas | Paciente (menor/adulto) | Organizar histórico clínico familiar | Consentimento responsável (menor) / contrato | Conta ativa + obrigações legais | Postgres, GCS |
| Consultas, exames, vacinas, meds, alergias, docs | Paciente | Histórico de saúde centralizado | Art. 11 — consentimento / tutela saúde familiar | Conta ativa | Postgres, GCS |
| Credenciais de portal (criptografadas) | Conta | Sync com operadoras/labs | Consentimento explícito no vínculo | Até remover integração | Postgres (`CRYPTO_KEY`) |
| Aceites legais (versão, hash, IP, UA) | Conta | Prova de consentimento | Obrigação legal / contrato | Prazo legal aplicável | Postgres |
| Pagamento (customer id Stripe) | Conta | Assinatura e pacotes | Contrato | Conforme fiscal | Stripe |
| OCR / interpretação manuscrito | Conta | Funcionalidade sob demanda | Contrato / consentimento | Eventos de crédito + logs | Groq, OpenAI, Google Vision |
| Sync jobs, logs de API | Conta / sistema | Operação, segurança | Legítimo interesse | Política de retenção de logs | Postgres |
| Export / share links | Paciente | Compartilhar com médico | Ação do titular/responsável | TTL do link (ex. 48h) | Postgres |

## Transferência internacional

Suboperadores em cloud (Supabase, GCP, Stripe, LLMs) podem processar fora do Brasil. Medidas: contratos/DPA, criptografia em trânsito, minimização de dados enviados a LLMs (só documento sob demanda).

## Direitos do titular (art. 18)

| Direito | Canal | Implementação no produto |
|---------|-------|---------------------------|
| Confirmação / acesso | privacidade@ | Export clínico, contexto paciente |
| Correção | App | Edição de perfil e paciente |
| Eliminação | privacidade@ + app | **Configurações → Excluir conta** (`DELETE /auth/account`) |
| Revogação consentimento | privacidade@ | Remover integração, excluir conta |
| Informação sobre compartilhamento | Política de Privacidade | `/privacidade` |

## Incidentes

Ver [`INCIDENT_RESPONSE.md`](./INCIDENT_RESPONSE.md).

## Histórico

| Data | Alteração |
|------|-----------|
| 2026-08-13 | Versão operacional inicial (Fase C LGPD) |
