import type { ReactNode } from 'react'
import { AuthWizardShell } from './AuthWizardShell.js'

/** Layout login / compliance — tokens Open Design via AuthWizardShell. */
export function AuthPageLayout({ children }: { children: ReactNode }) {
  return <AuthWizardShell variant="auth">{children}</AuthWizardShell>
}
