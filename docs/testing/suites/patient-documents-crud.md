# Suite — `patient-documents-crud`

| Campo | Valor |
|-------|--------|
| **ID** | `patient-documents-crud` |
| **Domínio** | `perfil-documentos` |
| **Lane** | `business-full` |

## Passos

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Aba **Documentos** | Lista / empty state | |
| 2 | **Upload** PDF ou imagem `QA-doc-<data>.pdf` | Documento na lista; status processamento | |
| 3 | Abrir / visualizar documento | Preview ou download OK | |
| 4 | **Excluir** documento | Remove da lista | |

## Fora de escopo

- Conteúdo extraído por OCR/LLM e marcadores gerados — não avaliar qualidade nesta suite.
