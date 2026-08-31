import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App as AntAppProvider } from 'antd'
import { App } from './App.js'
import { AppErrorBoundary } from './components/errors/AppErrorBoundary.js'
import { AuthProvider } from './contexts/AuthContext.js'
import { LlmActivityProvider } from './contexts/LlmActivityContext.js'
import { ThemeProvider } from './theme/ThemeProvider.js'
import './i18n/index.js'
import './styles/globals.css'
import './styles/app-sider.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AntAppProvider>
        <AuthProvider>
          <LlmActivityProvider>
            <AppErrorBoundary>
              <App />
            </AppErrorBoundary>
          </LlmActivityProvider>
        </AuthProvider>
      </AntAppProvider>
    </ThemeProvider>
  </StrictMode>,
)
