import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { ConfigProvider, theme } from 'antd'
import { palettes, type PaletteKey } from './colors.js'
import { loadOpenDesignTokens, tokensToAntDesignTheme } from './open-design-bridge.js'

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
    const odTokens = loadOpenDesignTokens()
    const odTheme = tokensToAntDesignTheme(odTokens, paletteKey)
    const p = palettes[paletteKey]

    return {
      algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        colorPrimary: odTheme.colorPrimary,
        colorBgLayout: darkMode ? odTokens.darkColors['--brand-bg'] : odTheme.colorBgLayout,
        colorBgContainer: darkMode ? odTokens.darkColors['--brand-surface'] : odTheme.colorBgContainer,
        colorTextBase: darkMode ? odTokens.darkColors['--brand-text'] : odTheme.colorTextBase,
        colorTextSecondary: darkMode ? odTokens.darkColors['--brand-text-secondary'] : odTheme.colorTextSecondary,
        colorBorder: darkMode ? odTokens.darkColors['--brand-border'] : odTheme.colorBorder,
        borderRadius: odTheme.borderRadius,
        fontFamily: odTheme.fontFamily,
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
