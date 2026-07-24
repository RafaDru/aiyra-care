import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout.js'
import { Dashboard } from './pages/dashboard.js'
import { PatientDetail } from './pages/patient/detail.js'
import { SessionPage } from './pages/session.js'
import { IntegrationsPage } from './pages/integrations.js'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/patients/:id" element={<PatientDetail />} />
          <Route path="/session" element={<SessionPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
