import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { ConfigProvider, theme } from 'antd'
import ptBR from 'antd/locale/pt_BR'
import enUS from 'antd/locale/en_US'
import { useTranslation } from 'react-i18next'
import { AIYRACARE_DARK, AIYRACARE_TOKENS } from './aiyracare-tokens.js'
import { darkPalette, palettes } from './colors.js'
import {
  type AccessibilityMode,
  readAccessibilityMode,
  writeAccessibilityMode,
} from '../lib/accessibility-preferences.js'
import { accessibilityTokenOverrides } from './accessibility-modes.js'

interface ThemeContextValue {
  darkMode: boolean
  toggleDarkMode: () => void
  accessibilityMode: AccessibilityMode
  setAccessibilityMode: (mode: AccessibilityMode) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  darkMode: false,
  toggleDarkMode: () => {},
  accessibilityMode: 'default',
  setAccessibilityMode: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

const DARK_MODE_KEY = 'aiyracare-dark-mode'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation()
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(DARK_MODE_KEY) === '1')
  const [accessibilityMode, setAccessibilityModeState] = useState<AccessibilityMode>(() => readAccessibilityMode())

  const setAccessibilityMode = useCallback((mode: AccessibilityMode) => {
    setAccessibilityModeState(mode)
    writeAccessibilityMode(mode)
  }, [])

  useEffect(() => {
    localStorage.setItem(DARK_MODE_KEY, darkMode ? '1' : '0')
    const root = document.documentElement
    root.setAttribute('data-a11y-mode', accessibilityMode)
    const tokens = darkMode ? { ...AIYRACARE_TOKENS, ...AIYRACARE_DARK } : AIYRACARE_TOKENS
    const a11y = accessibilityTokenOverrides(accessibilityMode, darkMode)
    const palette = darkMode ? darkPalette : palettes.aiyra
    root.style.setProperty('--primary', tokens.colorPrimary)
    root.style.setProperty('--primary-light', darkMode ? AIYRACARE_DARK.colorPrimaryHover : AIYRACARE_TOKENS.colorPrimaryHover)
    root.style.setProperty('--primary-dark', darkMode ? AIYRACARE_DARK.colorPrimaryActive : AIYRACARE_TOKENS.colorPrimaryActive)
    root.style.setProperty('--secondary', tokens.colorInfo)
    root.style.setProperty('--warning', a11y.colorWarning ?? AIYRACARE_TOKENS.colorWarning)
    root.style.setProperty('--background', tokens.colorBgLayout)
    root.style.setProperty('--card-bg', tokens.colorBgContainer)
    root.style.setProperty('--border', tokens.colorBorder)
    root.style.setProperty('--text-secondary', tokens.colorTextSecondary)
    root.style.setProperty('--brand-bg', palette.bg)
    root.style.setProperty('--brand-surface', 'cardBg' in palette ? palette.cardBg : palette.surface)
    root.style.setProperty('--brand-border', palette.border)
    root.style.setProperty('--sidebar-bg', palette.sidebarGradient)
    root.style.setProperty('--sidebar-border', palette.sidebarBorder)
    root.style.setProperty('--sidebar-shadow', palette.sidebarShadow)
    root.style.setProperty(
      '--sidebar-menu-selected',
      darkMode ? 'rgba(168, 85, 247, 0.2)' : 'rgba(147, 51, 234, 0.12)',
    )
    root.style.setProperty('--status-attention-bg', a11y.colorWarningBg ?? '#FFFBEB')
    root.style.setProperty('--status-attention-fg', a11y.colorWarning ?? '#B45309')
    root.style.setProperty('--status-attention-border', a11y.colorWarningBorder ?? '#F59E0B')
    root.style.setProperty('--status-success-bg', a11y.colorSuccessBg ?? '#ECFDF5')
    root.style.setProperty('--status-success-fg', a11y.colorSuccess ?? AIYRACARE_TOKENS.colorSuccess)
    root.style.setProperty('--status-danger-bg', a11y.colorErrorBg ?? '#FEE2E2')
    root.style.setProperty('--status-danger-fg', a11y.colorError ?? AIYRACARE_TOKENS.colorError)
  }, [darkMode, accessibilityMode])

  const toggleDarkMode = useCallback(() => setDarkMode((v) => !v), [])

  const themeConfig = useMemo(() => {
    const surface = darkMode ? AIYRACARE_DARK : AIYRACARE_TOKENS
    const a11y = accessibilityTokenOverrides(accessibilityMode, darkMode)
    return {
      algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        colorPrimary: surface.colorPrimary,
        colorPrimaryHover: surface.colorPrimaryHover,
        colorPrimaryActive: surface.colorPrimaryActive,
        colorInfo: a11y.colorInfo ?? surface.colorInfo,
        colorLink: surface.colorLink,
        colorWarning: a11y.colorWarning ?? '#B45309',
        colorSuccess: a11y.colorSuccess ?? AIYRACARE_TOKENS.colorSuccess,
        colorError: a11y.colorError ?? AIYRACARE_TOKENS.colorError,
        borderRadius: AIYRACARE_TOKENS.borderRadius,
        fontFamily: AIYRACARE_TOKENS.fontFamily,
        padding: AIYRACARE_TOKENS.padding,
        paddingLG: AIYRACARE_TOKENS.paddingLG,
        paddingXL: AIYRACARE_TOKENS.paddingXL,
        colorBgLayout: surface.colorBgLayout,
        colorBgContainer: surface.colorBgContainer,
        colorTextBase: a11y.colorTextBase ?? surface.colorTextBase,
        colorTextSecondary: surface.colorTextSecondary,
        colorBorder: a11y.colorBorder ?? surface.colorBorder,
      },
      components: {
        Card: {
          paddingLG: AIYRACARE_TOKENS.paddingLG,
        },
        Button: {
          paddingInline: 20,
          paddingInlineLG: 24,
        },
      },
    }
  }, [darkMode, accessibilityMode])

  const antLocale = i18n.language.startsWith('en') ? enUS : ptBR

  return (
    <ThemeContext.Provider value={{
      darkMode,
      toggleDarkMode,
      accessibilityMode,
      setAccessibilityMode,
    }}>
      <ConfigProvider theme={themeConfig} locale={antLocale}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}
