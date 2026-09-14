# «+ Registro rápido» global

| Campo | Valor |
|-------|--------|
| **ID** | `family-quick-capture` |
| **Épico** | `family-day-to-day` |
| **Status** | `done` |
| **Categoria** | negócio |
| **Prioridade** | P1 |

## Resumo

Botão **Registro rápido** no header da aplicação abre um sheet com cinco tipos de captura (nota, medida, medicação, agenda, documento), pré-selecionando o paciente da lente Ava (último aberto ou rota atual).

## Objetivo de negócio

- Registrar eventos do cotidiano em menos de 30 segundos
- Não depender de LLM nem de navegar até a aba correta do perfil
- Reutilizar APIs existentes (health threads, medidas, medicações, agenda, documentos)

## Comportamento (usuário)

1. Em qualquer tela autenticada, clica **Registro rápido** no header
2. Confirma ou troca o paciente (lente Ava)
3. Escolhe o tipo: **Nota** · **Medida** · **Medicação** · **Agenda** · **Documento**
4. Preenche o formulário mínimo e salva
5. Toast de confirmação; sheet fecha

## Superfície técnica

| Tipo | Referência |
|------|------------|
| UI | `QuickCaptureGlobal.tsx`, `QuickCaptureSheet.tsx`, `AppLayout.tsx` |
| Bus | `quick-capture-bus.ts` — `requestQuickCaptureOpen` |
| API | `POST /health-threads/:id/entries`, `POST /measurements/batch`, `POST /medication-administrations`, `POST /scheduled-events`, `POST /documents/upload` |
| Telemetria | `quick_capture_opened`, `quick_capture_saved` (`capture_kind`) |

## Fora de escopo (D2)

- Bloco «Hoje» na Carteira (D3)
- Ava como intake conversacional (A2)
- OCR guiado pós-upload de documento (fluxo completo permanece nas abas)

## QA

- Suite: [`family-quick-capture`](../testing/suites/family-quick-capture.md)
- Comando: `npm run qa:run -- --suite family-quick-capture`
