# Aiyra Care — Brief de logomarca

Brief enviado ao **Open Design** (design system `open-health-platform-for-users-and-patients`) para geração e revisão de propostas.

## Conceito (direção do produto)

- **Símbolo:** coração formado por círculos de diversos tamanhos, interligados por linhas finas (rede / constelação / dados conectados).
- **Cor do símbolo:** amarelo AiyraCare `#ECC94B` (token `colorWarning`).
- **Wordmark:** **Aiyra Care** — tipografia limpa, peso semibold.
- **Tagline:** **Open Health Platform** — abaixo do nome, caps, tracking amplo, cor secundária `#64748B`.
- **Cor de marca principal:** roxo `#6B46C1` (ações, wordmark).
- **Cor de acento:** rosa `#ED64A6` (links, destaques).

## Referência atual

Arquivo de referência (logo aplicada na plataforma): `Logo 2.png` — gradiente rosa/roxo com rede em coração branco.

## Propostas derivadas do brief (SVG)

| Arquivo | Descrição |
|---------|-----------|
| `logo-network-heart.svg` | Ícone isolado — coração em rede amarelo |
| `logo-horizontal-wordmark.svg` | Lockup horizontal — ícone + Aiyra Care + tagline |
| `logo-stacked-wordmark.svg` | Lockup empilhado — ícone centralizado + textos |

Caminho na app: `packages/web/public/brand/proposals/`

## Open Design

Assets sincronizados em:

```
%APPDATA%\Open Design\namespaces\release-stable-win\data\design-systems\
  open-health-platform-for-users-and-patients\assets\
```

Abra o **Open Design** → design system **Open Health Platform** → aba **Brand** para revisar propostas e pedir variações ao agente de branding.

Para reprocessar tokens após mudanças no `brand.json`:

```powershell
# Quando o CLI `od` estiver disponível no PATH:
od brand finalize open-health-platform-for-users-and-patients
```

## Próximo passo na plataforma

Escolher uma proposta (ou refinamento no Open Design) e substituir `packages/web/public/brand/logo.png`.
