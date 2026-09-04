# Cursor Automations (rascunhos no repo)

Definições versionadas para importar no **Cursor → Automations**.

## Importante

O Cursor **não** carrega estes arquivos automaticamente ao abrir ou reiniciar o IDE (ainda não há config-as-code oficial como em `.cursor/rules/`).

**Uma vez** você importa/cria a Automation na UI; depois ela fica na sua conta Cursor até você apagar.

## Investigador suporte (Tier 0)

| Arquivo | Uso |
|---------|-----|
| `support-report-investigator.workflow.json` | Importar no editor (JSON prefill) |
| `support-report-investigator.yaml` | Referência legível + prompt inline |
| `../docs/ops/automations/support-report-investigator.prompt.md` | Playbook completo |

### Passos (import único)

1. `Ctrl+Shift+P` → **Automations** (ou janela Agents / Glass Automations).
2. **Create** → importar `.cursor/automations/support-report-investigator.workflow.json`  
   **ou** pedir ao agente: «abre a automation do investigador de suporte».
3. Trigger: **Webhook** · Repo: `RafaDru/aiyra-care` · branch `main`.
4. **Salvar** → copiar URL do webhook.
5. `.env`:
   ```env
   CURSOR_SUPPORT_AUTOMATION_WEBHOOK_URL=<url>
   ```
6. Validar: `npm run ops:support-investigator:simulate`

Runbook: `docs/ops/SUPPORT_INVESTIGATOR_AUTOMATION.md`
