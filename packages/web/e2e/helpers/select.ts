import type { Locator, Page } from '@playwright/test'

/** Ant Design Select — opções no portal; evitar wait visible (animação slide-up no CI). */
export async function selectAntOption(
  page: Page,
  fieldLabel: string,
  optionName: string,
  scope?: Locator,
) {
  const root = scope ?? page
  const field = root.getByLabel(fieldLabel, { exact: true })
  await field.click()
  const option = page
    .locator('.ant-select-item-option')
    .filter({ hasText: optionName })
    .last()
  await option.waitFor({ state: 'attached', timeout: 15_000 })
  await option.click({ force: true })
}
