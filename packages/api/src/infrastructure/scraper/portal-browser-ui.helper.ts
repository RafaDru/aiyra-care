import type { Page } from 'playwright'

/** Texto típico de modais que bloqueiam login/sync em portais de saúde. */
const PORTAL_BLOCKING_TEXT_SOURCES = [
  'importante',
  'nunca entra em contato',
  'entrega de resultados',
  'mediante pagamento',
  'não mostrar',
  'nao mostrar',
  'modal-welcome',
  'atenção',
  'aviso',
  'cookies',
  'cookie',
]

const PORTAL_DISMISS_BUTTON_PATTERNS = [
  /ok,\s*entendi/i,
  /^entendi$/i,
  /^ok$/i,
  /^fechar$/i,
  /^continuar$/i,
  /^confirmar$/i,
  /^prosseguir$/i,
  /^aceitar$/i,
  /^sim$/i,
  /^concordo$/i,
]

/**
 * Playwright serializa funções para o browser — tsx/esbuild injeta `__name` em callbacks TS.
 * Usar string pura evita ReferenceError no Chromium.
 */
const DISMISS_PORTAL_BLOCKING_UI_EVAL = `(patterns) => {
  let changed = false;
  function matchesBlocking(text) {
    for (let p = 0; p < patterns.length; p++) {
      if (new RegExp(patterns[p], 'i').test(text)) return true;
    }
    return false;
  }
  const welcome = document.getElementById('modal-welcome');
  if (welcome) {
    const buttons = welcome.querySelectorAll('button, a, [role="button"]');
    for (let i = 0; i < buttons.length; i++) {
      const t = (buttons[i].textContent || '').trim();
      if (/ok|entendi|continuar|fechar|confirmar/i.test(t)) {
        buttons[i].click();
        break;
      }
    }
    welcome.style.display = 'none';
    welcome.remove();
    changed = true;
  }
  const backdrops = document.querySelectorAll('.modal-backdrop, .modal-overlay, [class*="modal-backdrop"]');
  for (let i = 0; i < backdrops.length; i++) {
    backdrops[i].remove();
    changed = true;
  }
  const dialogs = document.querySelectorAll('[role="dialog"], [role="alertdialog"], .modal, .mdc-dialog, .mdc-dialog__container, .ant-modal-wrap');
  for (let i = 0; i < dialogs.length; i++) {
    const el = dialogs[i];
    const text = el.textContent || '';
    if (matchesBlocking(text) || el.id === 'modal-welcome') {
      el.remove();
      changed = true;
    }
  }
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  for (let i = 0; i < checkboxes.length; i++) {
    const cb = checkboxes[i];
    const label = cb.closest('label');
    const parent = cb.parentElement;
    const ctx = (label && label.textContent) || (parent && parent.textContent) || '';
    if (/não mostrar|nao mostrar|não exibir|nao exibir/i.test(ctx)) {
      if (cb instanceof HTMLInputElement && !cb.checked) {
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
        changed = true;
      }
    }
  }
  return changed;
}`

/** Aceita alert/confirm/prompt nativos — sync não deve travar em pop-ups do browser. */
export function attachPortalDialogHandler(page: Page): void {
  page.on('dialog', async (dialog) => {
    try {
      await dialog.accept()
    } catch {
      /* página pode fechar durante navegação */
    }
  })
}

/**
 * Remove overlays, modais Material/BS e clica botões de dismiss comuns (pt-BR).
 * Chamar após `goto` e em loops longos de espera.
 */
export async function dismissPortalBlockingUi(
  page: Page,
  opts?: { extraTextPatterns?: string[] },
): Promise<void> {
  const patternSources = [...PORTAL_BLOCKING_TEXT_SOURCES, ...(opts?.extraTextPatterns ?? [])]

  for (let attempt = 0; attempt < 5; attempt++) {
    const hadOverlay = await page.evaluate(DISMISS_PORTAL_BLOCKING_UI_EVAL, patternSources)

    if (hadOverlay) await page.waitForTimeout(250)

    for (const pattern of PORTAL_DISMISS_BUTTON_PATTERNS) {
      const btn = page.getByRole('button', { name: pattern })
      if (await btn.first().isVisible({ timeout: 200 }).catch(() => false)) {
        await btn.first().click({ force: true, timeout: 3000 }).catch(() => {})
        await page.waitForTimeout(200)
      }
    }

    const stillBlocking = await page.locator(
      '#modal-welcome, [role="dialog"], [role="alertdialog"], .ant-modal-wrap',
    ).first().isVisible({ timeout: 300 }).catch(() => false)
    if (!stillBlocking) break
  }
}

/** Handler de dialog + dismiss inicial — usar ao criar cada `Page` de sync. */
export async function preparePortalPage(
  page: Page,
  opts?: { extraTextPatterns?: string[] },
): Promise<void> {
  attachPortalDialogHandler(page)
  await dismissPortalBlockingUi(page, opts)
}
