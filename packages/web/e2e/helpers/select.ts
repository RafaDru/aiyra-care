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
  const dropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
  await dropdown.waitFor({ state: 'visible', timeout: 8_000 })
  await dropdown.getByRole('option', { name: optionName }).click()
}
