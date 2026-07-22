import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout.js'
import { Dashboard } from './pages/dashboard.js'
import { PatientDetail } from './pages/patient/detail.js'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/patients/:id" element={<PatientDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
