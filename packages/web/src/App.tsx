import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout.js'
import { RequireAuth } from './components/auth/RequireAuth.js'
import { Dashboard } from './pages/dashboard.js'
import { PatientDetail } from './pages/patient/detail.js'
import { SessionPage } from './pages/session.js'
import { IntegrationsPage } from './pages/integrations.js'
import { LoginPage } from './pages/login.js'
import { OnboardingPage } from './pages/onboarding.js'
import { SettingsPage } from './pages/settings.js'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients/:id" element={<PatientDetail />} />
            <Route path="/session" element={<SessionPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
