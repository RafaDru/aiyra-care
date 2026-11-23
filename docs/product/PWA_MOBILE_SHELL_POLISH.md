# PWA — shell mobile polish (pós AC-126)

| Campo | Valor |
|-------|--------|
| **Decisão** | 2026-11-23 (Rafael) — aba Neri aprovada |
| **Feature** | [`beta-pwa-mobile-shell`](../features/beta-pwa-mobile-shell.md) |
| **Store** | Project store `pwa-mobile-shell-polish-2026-11-23.md` |

## O que o AC-126 não entregou

Layout compacto inicial: **4 abas iguais** + orb Ava flutuante no canto e hamburger lateral. **Não** incluía Neri no centro da tab bar.

## Direção aprovada (compact / PWA)

| Tema | Comportamento |
|------|----------------|
| **Neri no centro** | Rosto Ava/Neri; toque abre **chat** (`requestAvaOpen`); faixa central da barra transparente |
| **FAB direita** | `+` → **Registro rápido** (roxo) e **Fazer um pedido** |
| **Sem FAB Ava** | Trigger do dock oculto no compact; drawer do chat permanece |
| **Sem + no header** | `QuickCaptureGlobal` só com sheet (`hideTrigger`) |
| **Serviços** | Quinta aba; folha inferior com Config, Ajuda, conta, tema, idioma, sair |
| **Sem hamburger** | Menu lateral removido no compact |
| **Header** | Gradiente rosa→lilás, wordmark + seletor de círculo de cuidado |
| **Visual** | Fundo levemente tintado, barra com sombra, aba ativa com pill no ícone |

## Desktop

Inalterado: sider, header completo, Ava orb, botão Registro rápido.

## QA

[`pwa-mobile-shell`](../testing/suites/pwa-mobile-shell.md) — cenário Neri + Serviços.