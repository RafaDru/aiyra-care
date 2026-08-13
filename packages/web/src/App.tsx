import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout.js'
import { RequireAuth } from './components/auth/RequireAuth.js'
import { RequireCompliance } from './components/auth/RequireCompliance.js'
import { Dashboard } from './pages/dashboard.js'
import { PatientDetail } from './pages/patient/detail.js'
import { IntegrationsPage } from './pages/integrations.js'
import { LoginPage } from './pages/login.js'
import { OnboardingPage } from './pages/onboarding.js'
import { SettingsLayout } from './layouts/SettingsLayout.js'
import { SettingsGeneralPage } from './pages/settings/general.js'
import { SettingsAccountPage } from './pages/settings/account.js'
import { SettingsPlanPage } from './pages/settings/plan.js'
import { SettingsLegalPage } from './pages/settings/legal.js'
import { RoadmapPage } from './pages/roadmap.js'
import { ComplianceAcceptPage } from './pages/compliance-accept.js'
import { LegalDocumentPage } from './pages/legal-document.js'
import { CookieConsentBanner } from './components/legal/CookieConsentBanner.js'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/termos" element={<LegalDocumentPage kind="terms_of_use" />} />
        <Route path="/privacidade" element={<LegalDocumentPage kind="privacy_policy" />} />
        <Route path="/cookies" element={<LegalDocumentPage kind="cookie_policy" />} />
        <Route path="/consentimento-menor" element={<LegalDocumentPage kind="minor_guardian_consent" />} />
        <Route element={<RequireAuth />}>
          <Route path="/compliance/accept" element={<ComplianceAcceptPage />} />
          <Route element={<RequireCompliance />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/patients/:id" element={<PatientDetail />} />
              <Route path="/session" element={<Navigate to="/roadmap#dev-sessions" replace />} />
              <Route path="/integrations" element={<IntegrationsPage />} />
              <Route path="/roadmap" element={<RoadmapPage />} />
              <Route path="/settings" element={<SettingsLayout />}>
                <Route index element={<Navigate to="general" replace />} />
                <Route path="general" element={<SettingsGeneralPage />} />
                <Route path="account" element={<SettingsAccountPage />} />
                <Route path="plan" element={<SettingsPlanPage />} />
                <Route path="legal" element={<SettingsLegalPage />} />
              </Route>
            </Route>
          </Route>
        </Route>
      </Routes>
      <CookieConsentBanner />
    </BrowserRouter>
  )
}
