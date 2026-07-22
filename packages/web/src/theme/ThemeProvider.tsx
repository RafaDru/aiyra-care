import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { ConfigProvider, theme } from 'antd'
import { palettes, type PaletteKey } from './colors.js'

interface ThemeContextValue {
  palette: PaletteKey
  setPalette: (key: PaletteKey) => void
  darkMode: boolean
  toggleDarkMode: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  palette: 'indigo',
  setPalette: () => {},
  darkMode: false,
  toggleDarkMode: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [paletteKey, setPaletteKey] = useState<PaletteKey>('indigo')
  const [darkMode, setDarkMode] = useState(false)

  const toggleDarkMode = useCallback(() => setDarkMode((v) => !v), [])
  const setPalette = useCallback((key: PaletteKey) => setPaletteKey(key), [])

  const themeConfig = useMemo(() => {
    const p = palettes[paletteKey]
    return {
      algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        colorPrimary: p.primary,
        colorBgLayout: darkMode ? '#0f0f0f' : p.bg,
        colorBgContainer: darkMode ? '#1a1a1a' : p.cardBg,
        colorTextBase: darkMode ? '#f1f5f9' : p.text,
        colorTextSecondary: darkMode ? '#94a3b8' : p.textSecondary,
        colorBorder: darkMode ? '#334155' : p.border,
        borderRadius: 12,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      },
    }
  }, [paletteKey, darkMode])

  return (
    <ThemeContext.Provider value={{ palette: paletteKey, setPalette, darkMode, toggleDarkMode }}>
      <ConfigProvider theme={themeConfig}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}
