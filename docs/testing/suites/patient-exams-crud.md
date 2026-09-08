# Suite — `patient-exams-crud`

| Campo | Valor |
|-------|--------|
| **ID** | `patient-exams-crud` |
| **Domínio** | `perfil-exames` |
| **Lane** | `business-full` |
| **Fixture** | paciente `QA-Exames-<data>` (criar na suite ou reutilizar de `core-patient-crud`) |

## Passos — CRUD exame manual

| # | Ação | Resultado esperado | ✅/❌ |
|---|------|-------------------|-------|
| 1 | Perfil → aba **Exames** | Lista carrega | |
| 2 | **Adicionar** exame `QA-Exame-Hemograma-<data>` (data, laboratório) | Aparece na lista | |
| 3 | Abrir detalhe / editar campos | Salva | |
| 4 | **Excluir** exame (confirmar) | Remove da lista | |
| 5 | (Opcional) Sub-aba marcadores | Dashboard marcadores renderiza se houver itens | |

## Fora de escopo

- Pipeline LLM de laudo PDF — suite `patient-documents-crud` (upload sem validar interpretação).
