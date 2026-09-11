import type { Locator, Page } from '@playwright/test'

/** Ant Design Select — opções expõem role="option", não title. */
export async function selectAntOption(
  page: Page,
  fieldLabel: string,
  optionName: string,
  scope?: Locator,
) {
  const root = scope ?? page
  await root.getByLabel(fieldLabel, { exact: true }).click()
  const option = page.getByRole('option', { name: optionName })
  await option.waitFor({ state: 'visible', timeout: 8_000 })
  await option.click()
}
