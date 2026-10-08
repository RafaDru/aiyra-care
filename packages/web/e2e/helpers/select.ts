import { expect, type Locator, Page } from '@playwright/test'

function fieldByLabel(root: Locator | Page, fieldLabel: string | RegExp) {
  return fieldLabel instanceof RegExp
    ? root.getByLabel(fieldLabel, { exact: false })
    : root.getByLabel(fieldLabel, { exact: true })
}

/** Ant Design Select — opções no portal; evitar wait visible (animação slide-up no CI). */
export async function selectAntOption(
  page: Page,
  fieldLabel: string | RegExp,
  optionName: string,
  scope?: Locator,
) {
  const root = scope ?? page
  await expect(async () => {
    const field = fieldByLabel(root, fieldLabel)
    await field.waitFor({ state: 'attached', timeout: 5_000 })
    await field.scrollIntoViewIfNeeded()
    await field.click()
    const dropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last()
    await dropdown.waitFor({ state: 'attached', timeout: 10_000 })
    const option = dropdown
      .locator('.ant-select-item-option')
      .filter({ hasText: optionName })
      .first()
    await option.waitFor({ state: 'attached', timeout: 10_000 })
    // Portal Ant Design: opção pode estar fora do viewport no headless CI.
    await option.evaluate((node) => {
      ;(node as HTMLElement).click()
    })
  }).toPass({ timeout: 20_000 })
}

/** Select Ant Design sem label (ex.: modal de documentos). */
export async function clickAntSelectOption(
  page: Page,
  trigger: Locator,
  optionName: string,
) {
  await trigger.scrollIntoViewIfNeeded()
  await trigger.click()
  const dropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last()
  await dropdown.waitFor({ state: 'attached', timeout: 15_000 })
  const option = dropdown
    .locator('.ant-select-item-option')
    .filter({ hasText: optionName })
    .first()
  await option.waitFor({ state: 'attached', timeout: 15_000 })
  await option.evaluate((node) => {
    ;(node as HTMLElement).click()
  })
}
