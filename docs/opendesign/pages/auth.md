# Open Design — telas de autenticação

Especificação para **Login**, **Criar conta** e **Completar perfil** (`/login`, `/onboarding`).

## Layout (`AuthPageLayout`)

| Token | Valor | Uso |
|-------|-------|-----|
| `colorBgLayout` / `--brand-bg` | `#F8FAFC` | fundo da página |
| `paddingXL` | `32px` | padding vertical da página |
| `padding` | `16px` | padding horizontal |
| `paddingLG` | `24px` | espaço entre logo e card |
| Logo → card | `8px` | margem inferior da logo no login |
| `borderRadius` | `12px` | cards Ant Design |

- Conteúdo: `max-width 440px`, centralizado.
- Logo: variante **square** (`logo-square.svg`), altura **240px**, `max-width 300px`.

## Fluxo

1. **Entrar** — e-mail/senha ou Google → dashboard (sem obrigar cadastro de perfil).
2. **Criar conta** — e-mail/senha → `/onboarding` (dados do titular, ≥18 anos).
3. Google no login trata-se como **entrada**, não como cadastro de perfil.

## Componentes

- `Card` Ant Design (`colorBgContainer`, borda `--brand-border`).
- Botão primário: `colorPrimary` `#9333EA`.
- Links / info: `colorInfo` `#FF3DA8`.

Sincronizar paleta: `node packages/web/scripts/sync-brand-to-opendesign.mjs`
