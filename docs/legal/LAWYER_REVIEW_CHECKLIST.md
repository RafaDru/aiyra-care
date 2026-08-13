# Checklist — revisão jurídica (v1.0)

> Enviar ao advogado **antes** de cobrança pública e marketing B2C.

## Pacote

| Documento | Caminho |
|-----------|---------|
| Termos de Uso v1.0 | `docs/legal/terms-of-use/v1.0.md` |
| Política de Privacidade v1.0 | `docs/legal/privacy-policy/v1.0.md` |
| Política de Cookies v1.0 | `docs/legal/cookie-policy/v1.0.md` |
| Consentimento responsável (menor) v1.0 | `docs/legal/minor-guardian-consent/v1.0.md` |
| Mapa de tratamento | `docs/legal/DATA_PROCESSING_MAP.md` |
| Runbook incidentes | `docs/legal/INCIDENT_RESPONSE.md` |

## Perguntas para o advogado

1. Textos adequados para **B2C familiar**, dados sensíveis de saúde e **menores** (LGPD art. 11)?
2. Bases legais e consentimento do responsável — suficientes para o fluxo atual (checkbox + auditoria PG)?
3. **Scraping** de portais com credenciais do usuário — cláusula nos Termos cobre o risco?
4. **Suboperadores** listados (Supabase, GCP, Stripe, LLMs) — necessidade de DPA adicional?
5. Transferência internacional — cláusulas suficientes?
6. Cancelamento, reembolso e assinatura (CDC + Marco Civil) — alinhado ao Stripe Customer Portal?
7. Canal de exercício de direitos (`privacidade@`) e prazos de resposta.

## Dados da empresa (configurar no `.env` antes do go-live)

```env
LEGAL_ENTITY_NAME=Razão Social Ltda
LEGAL_CNPJ=00000000000000
LEGAL_ENTITY_ADDRESS=Rua, cidade, UF
LEGAL_PRIVACY_EMAIL=privacidade@empresa.com
LEGAL_SUPPORT_EMAIL=suporte@empresa.com
```

A UI exibe razão social e CNPJ no rodapé dos documentos quando `LEGAL_ENTITY_NAME` e `LEGAL_CNPJ` (14 dígitos) estão definidos.

## Após revisão

1. Advogado devolve alterações nos `.md` ou aprovação formal.
2. Registrar em `docs/legal/CHANGELOG.md` (nova versão se mudou texto exigindo reaceite).
3. `node packages/api/scripts/seed-legal-documents.mjs`
4. Marcar item `legal-lawyer-review` como concluído no roadmap.
