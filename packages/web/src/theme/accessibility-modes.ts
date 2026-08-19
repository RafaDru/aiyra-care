import type { AccessibilityMode } from '../lib/accessibility-preferences.js'
import { AIYRACARE_DARK, AIYRACARE_TOKENS } from './aiyracare-tokens.js'

/** Overrides de token Ant Design por modo de acessibilidade. */
export function accessibilityTokenOverrides(
  mode: AccessibilityMode,
  darkMode: boolean,
): Record<string, string> {
  if (mode === 'default') {
    return {
      colorWarning: '#B45309',
      colorWarningBg: '#FFFBEB',
      colorWarningBorder: '#F59E0B',
    }
  }

  const surface = darkMode ? AIYRACARE_DARK : AIYRACARE_TOKENS

  if (mode === 'highContrast') {
    return {
      colorWarning: darkMode ? '#FCD34D' : '#92400E',
      colorWarningBg: darkMode ? '#422006' : '#FEF3C7',
      colorWarningBorder: darkMode ? '#F59E0B' : '#B45309',
      colorSuccess: darkMode ? '#34D399' : '#047857',
      colorSuccessBg: darkMode ? '#064E3B' : '#ECFDF5',
      colorError: darkMode ? '#F87171' : '#B91C1C',
      colorErrorBg: darkMode ? '#450A0A' : '#FEE2E2',
      colorBorder: darkMode ? '#94A3B8' : '#334155',
      colorTextBase: surface.colorTextBase,
    }
  }

  // deuteranopia — evita verde/vermelho como único diferencial de status
  return {
    colorSuccess: darkMode ? '#38BDF8' : '#0369A1',
    colorSuccessBg: darkMode ? '#0C4A6E' : '#E0F2FE',
    colorWarning: darkMode ? '#FB923C' : '#C2410C',
    colorWarningBg: darkMode ? '#431407' : '#FFEDD5',
    colorWarningBorder: darkMode ? '#F97316' : '#EA580C',
    colorError: darkMode ? '#F472B6' : '#9D174D',
    colorErrorBg: darkMode ? '#500724' : '#FCE7F3',
    colorInfo: darkMode ? '#A78BFA' : '#6D28D9',
    colorBorder: surface.colorBorder,
  }
}
