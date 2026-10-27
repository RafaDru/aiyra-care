# MVP go-live — checklist (produto)

Checklist mínimo antes de apontar domínio público para o app.

## Site institucional (`/home`)

- [ ] `LEGAL_ENTITY_NAME`, `LEGAL_CNPJ`, `LEGAL_PRIVACY_EMAIL` na API (footer e documentos legais)
- [ ] Opcional no build web: `VITE_LEGAL_ENTITY_NAME`, `VITE_LEGAL_CNPJ`, `VITE_PUBLIC_SITE_URL` (SEO canonical/OG)
- [ ] Termos, privacidade e cookies publicados (`seed-legal-documents`)
- [ ] Preços na landing sem valores vinculantes até billing público
- [ ] Suite QA [`auth-entry-flow`](../testing/suites/auth-entry-flow.md)

## Referências

- Feature [`landing-marketing`](../features/landing-marketing.md)
- [`LEGAL_COMPLIANCE.md`](../LEGAL_COMPLIANCE.md)
