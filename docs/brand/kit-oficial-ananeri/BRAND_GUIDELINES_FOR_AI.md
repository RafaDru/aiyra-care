# Ananeri — Brand Guidelines & UI Asset Kit (Web + Mobile App)

Este pacote contém todos os artefatos vetoriais oficiais (`SVG`) e diretrizes visuais da marca **Ananeri** (e da sua agente de inteligência clínica **Neri**), prontos para uso em aplicações Web, Mobile (iOS/Android) e materiais institucionais.

---

## 1. Arquitetura da Logomarca

### 1.1 Assinatura Principal Horizontal (`ana ♥ neri`)
- **Arquivo Light**: `01-lockups-principais/ananeri-lockup-horizontal-light.svg`
- **Arquivo Dark**: `01-lockups-principais/ananeri-lockup-horizontal-dark.svg`
- **Construção**:
  - Tipografia caligráfica autoral de **alto-contraste** (100% desenhada em curvas Bézier com cabeças em pérola `A 4.8 4.8`, subidas finas como seda e terminais em gota).
  - **`ana`** à esquerda pintada no gradiente Rosa-Magenta (`#F472B6 → #EC4899 → #BE185D`).
  - **Símbolo do Coração (`♥`)** posicionado entre `ana` e `neri`, **alinhado pela base inferior (baseline)** e **ligeiramente mais alto que as letras**, de forma que seus lóbulos superiores ultrapassam o topo-x na mesma linha óptica do pingo do `i`.
  - **`neri`** à direita pintada no mesmo gradiente Roxo do arco externo direito do coração (`#7E22CE → #6B21A8 → #581C87`), com o **pingo do `i` em gota rosa**, fechando o arco cromático da marca.
  - **No Dark Mode**: o coração e `ana` permanecem 100% nas suas cores originais, e apenas `neri` assume **Branco Puro (`#FFFFFF`)** sobre fundos escuros (`#0F172A`).

### 1.2 Assinatura Compacta Empilhada (`♥ + ana / neri`)
- **Arquivo Light**: `01-lockups-principais/ananeri-lockup-stacked-light.svg`
- **Arquivo Dark**: `01-lockups-principais/ananeri-lockup-stacked-dark.svg`
- **Construção**: Símbolo do Coração à esquerda + `ana` (em cima) e `neri` (embaixo) alinhados à esquerda, ocupando **exatamente a mesma altura vertical do coração** com `40px` de entrelinha respirada.

---

## 2. Recursos Gráficos Proprietários para UI (Evitar estética "jornal/engessada")

Para dar profundidade, acolhimento e identidade às telas da Landing Page e do App (em **Light Mode natural**):

1. **Marcador da Asa Central Esquerda (`05-elementos-graficos-ui/graphic-wing-marker-*.svg`)**:
   - Extraído da única peça interna totalmente preenchida do coração (`v24-echo`).
   - **Como usar na UI**:
     - Como **marcador/bullet orgânico** nos insights da Agente Neri e nos eventos da Linha do Tempo (Rosa = exames, Roxo = vacinas/consultas, Dourado = alertas/preparo de consulta);
     - Ao lado de **títulos de seção** e no **item ativo da Sidebar**;
     - Em **macro-escala translúcida (`10% a 14%` de opacidade)** no canto superior direito dos cards de pacientes e da Neri.
2. **Fitas de Pincelada em Marca-d'água (`05-elementos-graficos-ui/graphic-brush-watermark-ribbons.svg`)**:
   - As três fitas direitas do coração (`blend-1`, `blend-2`, `blend-3`).
   - **Como usar na UI**: ampliadas e suavizadas (`14% a 18%` de opacidade) atravessando o fundo de Headers, Sidebars e Banners Hero sobre superfícies claras em **Lavanda-Pérola (`#F5EEFF → #FDF2F8 → #EDE9FE`)**.

---

## 3. Mapa Completo de Arquivos do Kit

- **`01-lockups-principais/`**
  - `ananeri-lockup-horizontal-light.svg` — Assinatura principal horizontal (Light Mode)
  - `ananeri-lockup-horizontal-dark.svg` — Assinatura principal horizontal (Dark Mode)
  - `ananeri-lockup-stacked-light.svg` — Assinatura empilhada compacta (Light Mode)
  - `ananeri-lockup-stacked-dark.svg` — Assinatura empilhada compacta (Dark Mode)
- **`02-simbolo-e-wordmark/`**
  - `ananeri-symbol-heart.svg` — Símbolo do Coração isolado (fundo transparente)
  - `ananeri-wordmark-light.svg` — Wordmark contínuo `ananeri` sem coração (Light)
  - `ananeri-wordmark-dark.svg` — Wordmark contínuo `ananeri` sem coração (Dark)
- **`03-monocromaticas/`**
  - `ananeri-mono-purple.svg` — Lockup 100% Roxo `#581C87` (receituários, impressos, carimbos)
  - `ananeri-mono-white.svg` — Lockup 100% Branco `#FFFFFF` (fundos institucionais escuros/fotos)
  - `ananeri-symbol-mono-purple.svg` — Símbolo 100% Roxo `#581C87`
  - `ananeri-symbol-mono-white.svg` — Símbolo 100% Branco `#FFFFFF`
- **`04-app-icons-e-favicons/`**
  - `app-icon-ios-android-light.svg` — Ícone de App (`1024×1024`, fundo Silk Light)
  - `app-icon-ios-android-dark.svg` — Ícone de App (`1024×1024`, fundo Slate Dark `#0F172A`)
  - `app-icon-ios-android-royal.svg` — Ícone de App (`1024×1024`, fundo Roxo Real)
  - `favicon.svg` — Favicon vetorial (`64×64`)
  - `neri-agent-avatar-circle.svg` — Avatar circular da Agente Neri (`256×256`)
  - `neri-agent-tile-rounded.svg` — Tile arredondado da Agente Neri (`160×160`)
- **`05-elementos-graficos-ui/`**
  - `graphic-wing-marker-pink.svg` — Marcador Asa Interna (Rosa)
  - `graphic-wing-marker-purple.svg` — Marcador Asa Interna (Roxo)
  - `graphic-wing-marker-gold.svg` — Marcador Asa Interna (Dourado)
  - `graphic-brush-watermark-ribbons.svg` — Fitas de Pincelada para Marca-d'água
  - `graphic-gold-seed.svg` — Gota/Semente Dourada
- **`06-social-e-splash/`**
  - `og-share-banner-1200x630.svg` — Banner OpenGraph para compartilhamento de links
  - `mobile-splash-screen-1080x1920.svg` — Splash Screen para o aplicativo mobile
