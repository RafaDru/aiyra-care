import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.js'
import { ChOperatorAuthGate } from './ChOperatorLogin.js'
import { ChOperatorAuthProvider } from './contexts/ChOperatorAuthContext.js'
import { OpsThemeProvider } from './theme/ops-theme.js'
import './ops-console.css'
import './theme/ch-zones.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OpsThemeProvider>
      <ChOperatorAuthProvider>
        <ChOperatorAuthGate>
          <App />
        </ChOperatorAuthGate>
      </ChOperatorAuthProvider>
    </OpsThemeProvider>
  </StrictMode>,
)
