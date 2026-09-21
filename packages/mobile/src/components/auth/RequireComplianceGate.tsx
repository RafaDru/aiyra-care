import { useEffect, useState, type ReactNode } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Redirect, usePathname } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { onComplianceAccepted } from '@/lib/compliance-events'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

const COMPLIANCE_ACCEPT_PATH = '/compliance/accept'

/**
 * Espelho de `RequireCompliance` (web): uma verificação por sessão/conta;
 * redireciona para aceite legal quando `GET /compliance/status` indica pendência.
 */
export function RequireComplianceGate({ children }: { children: ReactNode }) {
  const { configured, loading: authLoading, authUserId, needsProfile } = useAuth()
  const pathname = usePathname()
  const { tokens } = useAiyraTheme()
  const [checking, setChecking] = useState(true)
  const [compliant, setCompliant] = useState(true)

  useEffect(() => {
    if (!configured || !authUserId) {
      setChecking(false)
      setCompliant(true)
      return
    }
    let cancelled = false
    setChecking(true)
    api.compliance
      .status()
      .then((s) => {
        if (!cancelled) setCompliant(s.compliant)
      })
      .catch(() => {
        if (!cancelled) setCompliant(true)
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [configured, authUserId])

  useEffect(() => onComplianceAccepted(() => setCompliant(true)), [])

  if (!configured) return children

  if (authLoading || checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: tokens.colorBgLayout }}>
        <ActivityIndicator color={tokens.colorPrimary} />
      </View>
    )
  }

  const onComplianceScreen = pathname.includes('compliance/accept')

  if (!compliant && !onComplianceScreen) {
    return <Redirect href="/(app)/compliance/accept" />
  }

  if (compliant && needsProfile && !pathname.includes('onboarding')) {
    return <Redirect href="/(app)/onboarding" />
  }

  return children
}

export { COMPLIANCE_ACCEPT_PATH }
