import { ConfigProvider, theme } from 'antd'
import ptBR from 'antd/locale/pt_BR'
import type { ReactNode } from 'react'
import { AIYRACARE_TOKENS } from '../../../../web/src/theme/aiyracare-tokens.js'

const OPS_COMPONENTS = {
  Card: {
    borderRadiusLG: AIYRACARE_TOKENS.borderRadius,
    paddingLG: 20,
  },
  Table: {
    headerBg: '#F1F5F9',
    borderColor: AIYRACARE_TOKENS.colorBorder,
  },
  Tabs: {
    titleFontSize: 14,
    horizontalMargin: '0',
  },
}

export function OpsThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      locale={ptBR}
      theme={{
        cssVar: { key: 'ops' },
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: AIYRACARE_TOKENS.colorPrimary,
          colorPrimaryHover: AIYRACARE_TOKENS.colorPrimaryHover,
          colorPrimaryActive: AIYRACARE_TOKENS.colorPrimaryActive,
          colorInfo: AIYRACARE_TOKENS.colorInfo,
          colorLink: AIYRACARE_TOKENS.colorLink,
          colorSuccess: AIYRACARE_TOKENS.colorSuccess,
          colorError: AIYRACARE_TOKENS.colorError,
          colorWarning: '#B45309',
          borderRadius: AIYRACARE_TOKENS.borderRadius,
          fontFamily: AIYRACARE_TOKENS.fontFamily,
          colorBgLayout: AIYRACARE_TOKENS.colorBgLayout,
          colorBgContainer: AIYRACARE_TOKENS.colorBgContainer,
          colorText: AIYRACARE_TOKENS.colorTextBase,
          colorTextSecondary: AIYRACARE_TOKENS.colorTextSecondary,
          colorBorder: AIYRACARE_TOKENS.colorBorder,
          padding: AIYRACARE_TOKENS.padding,
          paddingLG: AIYRACARE_TOKENS.paddingLG,
        },
        components: OPS_COMPONENTS,
      }}
    >
      {children}
    </ConfigProvider>
  )
}

export { AIYRACARE_TOKENS }
