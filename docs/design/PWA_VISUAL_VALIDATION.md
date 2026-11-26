# Validação visual — PWA compact (sem Figma)

| Campo | Valor |
|-------|--------|
| **Decisão** | 2026-11-26 — operador solo **não** edita Figma; validação em **Canvas** antes do código |
| **Tier** | 1 — shell mobile |

## Onde validar

**Canal oficial:** [Ananeri PWA — design system playground](https://cursor.com/canvas/store-1b70afcc-bd73-4856-b0a0-08659a158546/5ced97c4-0aad-4d7b-8b79-798357008230) (Cursor Canvas, componentizado 390px).

Store (espelho): `docs/ananeri-pwa-design-playground.md` no Agent Store do projeto.

Espelha CSS em:

- `packages/web/src/styles/app-layout-mobile.css`
- `packages/web/src/components/patient/patient-detail-nav.css`
- Componentes `AppLayout`, `PatientCompactMacroSections`, `PatientCompactSubTabs`

## Ritual (propor → confirmar → codificar)

1. **Propor** — Rafael descreve ajuste no chat ou altera controles do Canvas (S0–S3, trilho, Neri).
2. **Confirmar** — agente atualiza o Canvas + screenshot mental / valores de token na conversa.
3. **Codificar** — PR com diff mínimo; `npm run qa:run -- --suite pwa-mobile-shell` ou `pwa-mobile-patient-ux` quando tocar fluxo.
4. **Preview** — promote lote só para aceite final no celular (não para iteração estética fina).

## Figma

Arquivo Paciente (`dzbV8pL5bSnyUtMHh8Fzf2`) permanece como **arquivo histórico** (B+ `30-2`, fidel `23-86`). **Não** é fonte de verdade nem bloqueia entrega. Desconectar conta/MCP Figma no Cursor é opcional.

## Ampliar o playground

Novos blocos no Canvas: pedir ao agente «adicionar ao playground» com referência ao componente React ou token. Um `.canvas.tsx` por onda (shell, perfil, auth) evita arquivo gigante.