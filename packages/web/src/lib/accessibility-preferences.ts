export type AccessibilityMode = 'default' | 'highContrast' | 'deuteranopia'

const A11Y_MODE_KEY = 'aiyracare.a11yMode'

export function readAccessibilityMode(): AccessibilityMode {
  try {
    const raw = localStorage.getItem(A11Y_MODE_KEY)
    if (raw === 'highContrast' || raw === 'deuteranopia') return raw
  } catch { /* ignore */ }
  return 'default'
}

export function writeAccessibilityMode(mode: AccessibilityMode): void {
  localStorage.setItem(A11Y_MODE_KEY, mode)
}

export const ACCESSIBILITY_RESOURCES = [
  {
    id: 'govbr',
    label: 'eMAG — Modelo de Acessibilidade (Governo Federal)',
    url: 'https://www.gov.br/governodigital/pt-br/acessibilidade-e-usuario/acessibilidade-digital',
  },
  {
    id: 'w3c-wcag',
    label: 'WCAG 2.2 (W3C)',
    url: 'https://www.w3.org/WAI/standards-guidelines/wcag/',
  },
  {
    id: 'who',
    label: 'Daltonismo — informações (OMS)',
    url: 'https://www.who.int/news-room/questions-and-answers/item/blindness-and-vision-impairment',
  },
] as const
