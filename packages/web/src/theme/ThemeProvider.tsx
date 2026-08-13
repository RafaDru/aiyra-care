import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { ConfigProvider, theme } from 'antd'
import ptBR from 'antd/locale/pt_BR'
import enUS from 'antd/locale/en_US'
import { useTranslation } from 'react-i18next'
import { AIYRACARE_DARK, AIYRACARE_TOKENS } from './aiyracare-tokens.js'
import { darkPalette, palettes } from './colors.js'

interface ThemeContextValue {
  darkMode: boolean
  toggleDarkMode: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  darkMode: false,
  toggleDarkMode: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

const DARK_MODE_KEY = 'aiyracare-dark-mode'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation()
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(DARK_MODE_KEY) === '1')

  useEffect(() => {
    localStorage.setItem(DARK_MODE_KEY, darkMode ? '1' : '0')
    const root = document.documentElement
    const tokens = darkMode ? { ...AIYRACARE_TOKENS, ...AIYRACARE_DARK } : AIYRACARE_TOKENS
    const palette = darkMode ? darkPalette : palettes.aiyra
    root.style.setProperty('--primary', tokens.colorPrimary)
    root.style.setProperty('--primary-light', darkMode ? AIYRACARE_DARK.colorPrimaryHover : AIYRACARE_TOKENS.colorPrimaryHover)
    root.style.setProperty('--primary-dark', darkMode ? AIYRACARE_DARK.colorPrimaryActive : AIYRACARE_TOKENS.colorPrimaryActive)
    root.style.setProperty('--secondary', tokens.colorInfo)
    root.style.setProperty('--warning', AIYRACARE_TOKENS.colorWarning)
    root.style.setProperty('--background', tokens.colorBgLayout)
    root.style.setProperty('--card-bg', tokens.colorBgContainer)
    root.style.setProperty('--border', tokens.colorBorder)
    root.style.setProperty('--text-secondary', tokens.colorTextSecondary)
    root.style.setProperty('--brand-bg', palette.bg)
    root.style.setProperty('--brand-surface', palette.cardBg)
    root.style.setProperty('--brand-border', palette.border)
    root.style.setProperty('--sidebar-bg', palette.sidebarGradient)
    root.style.setProperty('--sidebar-border', palette.sidebarBorder)
    root.style.setProperty('--sidebar-shadow', palette.sidebarShadow)
    root.style.setProperty(
      '--sidebar-menu-selected',
      darkMode ? 'rgba(168, 85, 247, 0.2)' : 'rgba(147, 51, 234, 0.12)',
    )
  }, [darkMode])

  const toggleDarkMode = useCallback(() => setDarkMode((v) => !v), [])

  const themeConfig = useMemo(() => {
    const surface = darkMode ? AIYRACARE_DARK : AIYRACARE_TOKENS
    return {
      algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        colorPrimary: surface.colorPrimary,
        colorPrimaryHover: surface.colorPrimaryHover,
        colorPrimaryActive: surface.colorPrimaryActive,
        colorInfo: surface.colorInfo,
        colorLink: surface.colorLink,
        colorWarning: AIYRACARE_TOKENS.colorWarning,
        colorSuccess: AIYRACARE_TOKENS.colorSuccess,
        colorError: AIYRACARE_TOKENS.colorError,
        borderRadius: AIYRACARE_TOKENS.borderRadius,
        fontFamily: AIYRACARE_TOKENS.fontFamily,
        padding: AIYRACARE_TOKENS.padding,
        paddingLG: AIYRACARE_TOKENS.paddingLG,
        paddingXL: AIYRACARE_TOKENS.paddingXL,
        colorBgLayout: surface.colorBgLayout,
        colorBgContainer: surface.colorBgContainer,
        colorTextBase: surface.colorTextBase,
        colorTextSecondary: surface.colorTextSecondary,
        colorBorder: surface.colorBorder,
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
  }, [darkMode])

  const antLocale = i18n.language.startsWith('en') ? enUS : ptBR

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      <ConfigProvider theme={themeConfig} locale={antLocale}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}
