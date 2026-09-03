import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.js'
import { OpsThemeProvider } from './theme/ops-theme.js'
import './ops-console.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OpsThemeProvider>
      <App />
    </OpsThemeProvider>
  </StrictMode>,
)
