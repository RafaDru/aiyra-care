import type { Page } from 'playwright'

export function formatMaterDeiCpf(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length !== 11) return digits
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

/** Flutter web esconde campos até ativar acessibilidade. */
export async function enableMaterDeiFlutterAccessibility(page: Page): Promise<void> {
  const enabled = await page.evaluate(() => {
    const btn = document.querySelector('[aria-label="Enable accessibility"]')
    if (!btn) return true
    ;(btn as HTMLElement).click()
    return false
  })
  if (!enabled) await page.waitForTimeout(2000)
  await page.getByLabel(/Digite seu CPF/i).first().waitFor({ state: 'visible', timeout: 20_000 })
}

export async function fillMaterDeiCredentials(page: Page, cpf: string, password: string): Promise<void> {
  const digits = cpf.replace(/\D/g, '')
  if (!digits) throw new Error('CPF Mater Dei vazio')
  if (!password) throw new Error('Senha Mater Dei vazia')

  await enableMaterDeiFlutterAccessibility(page)

  const cpfField = page.getByLabel(/Digite seu CPF/i).first()
  const pwdField = page.getByLabel(/Digite sua senha/i).first()

  await cpfField.click({ timeout: 10_000 })
  await cpfField.fill(formatMaterDeiCpf(digits))

  await pwdField.click({ timeout: 10_000 })
  await pwdField.fill(password)
}
