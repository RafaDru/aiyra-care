# npm scope `@ananeri` e variáveis `LEGAL_*`

> Checklist após Phase 3A (raiz `ananeri`, pacotes `@ananeri/*` no monorepo).

## Organização npm `@ananeri`

| Passo | Notas |
|-------|--------|
| Criar org no npm | Nome sugerido: `ananeri` — [npmjs.com/org/create](https://www.npmjs.com/org/create) (conta de billing do produto). |
| Membros | Adicionar maintainers com 2FA; tokens CI apenas se publicar pacotes (hoje o monorepo é `private: true`). |
| Workspaces locais | `npm install` na raiz **não** exige org publicada — dependências internas resolvem via `workspace:*`. |
| Publicação futura | Quando um pacote deixar de ser `private`, garantir `"name": "@ananeri/<pkg>"` e `publishConfig.access` conforme política. |

## Variáveis `LEGAL_*` (env)

Placeholder enquanto não houver **razão social / CNPJ** definitivos (ver [`REBRAND_STATUS.md`](../product/REBRAND_STATUS.md)):

- Não reescrever seed legal nem env de produção só por causa do rename técnico.
- Quando o jurídico fechar dados cadastrais: atualizar `LEGAL_COMPANY_*`, termos, e rodar o ritual em `docs/LEGAL_COMPLIANCE.md` / feature compliance.

**Resumo:** org npm = preparação para publicação; `LEGAL_*` = decisão jurídica, não automática com o rename de código.
