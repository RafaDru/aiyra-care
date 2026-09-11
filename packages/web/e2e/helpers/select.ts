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
  await field.scrollIntoViewIfNeeded()
  await field.click()
  const dropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last()
  await dropdown.waitFor({ state: 'attached', timeout: 15_000 })
  const option = dropdown
    .locator('.ant-select-item-option')
    .filter({ hasText: optionName })
    .first()
  await option.waitFor({ state: 'attached', timeout: 15_000 })
  // Portal Ant Design: opção pode estar fora do viewport no headless CI.
  await option.evaluate((node) => {
    ;(node as HTMLElement).click()
  })
}
