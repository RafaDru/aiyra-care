import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/contexts/AuthContext'
import { useAvaPatientLens } from '@/hooks/useAvaPatientLens'
import {
  DUAL_ENTRY_EDGE_INSET,
  DUAL_ENTRY_FAB_BOTTOM_OFFSET,
  DUAL_ENTRY_FAB_RADIUS,
  DUAL_ENTRY_FAB_SHADOW,
} from '@/lib/dual-entry-layout'
import {
  subscribeQuickCaptureOpen,
  type QuickCaptureKind,
} from '@/lib/quick-capture-bus'
import { useAiyraTheme } from '@/theme/useAiyraTheme'
import { QuickCaptureSheet } from './QuickCaptureSheet'

/** FAB secundário de registro rápido (dual entry — ver `docs/mobile-dual-entry-ux-spec` no Project store). */
export function QuickCaptureGlobal() {
  const { t } = useTranslation()
  const { configured, session } = useAuth()
  const { tokens } = useAiyraTheme()
  const insets = useSafeAreaInsets()
  const { patients, patientId, routePatientId, loading, setPatientId } = useAvaPatientLens()
  const [open, setOpen] = useState(false)
  const [initialKind, setInitialKind] = useState<QuickCaptureKind | undefined>()

  useEffect(() => {
    return subscribeQuickCaptureOpen((req) => {
      if (req.patientId) setPatientId(req.patientId)
      setInitialKind(req.kind)
      setOpen(true)
    })
  }, [setPatientId])

  if (!configured || !session || loading || !patientId) return null

  const bottom = Math.max(insets.bottom, 16) + DUAL_ENTRY_FAB_BOTTOM_OFFSET

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('quickCapture.triggerA11y')}
        onPress={() => {
          setInitialKind(undefined)
          setOpen(true)
        }}
        style={[
          styles.fab,
          DUAL_ENTRY_FAB_SHADOW,
          {
            bottom,
            left: DUAL_ENTRY_EDGE_INSET,
            borderColor: tokens.colorPrimary,
            backgroundColor: tokens.colorBgContainer,
            borderRadius: DUAL_ENTRY_FAB_RADIUS,
          },
        ]}
      >
        <Text style={{ color: tokens.colorPrimary, fontWeight: '800', fontSize: 22 }}>+</Text>
      </Pressable>
      <QuickCaptureSheet
        visible={open}
        onClose={() => setOpen(false)}
        patients={patients}
        patientId={patientId}
        routePatientId={routePatientId}
        onPatientChange={setPatientId}
        initialKind={initialKind}
      />
    </>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
    elevation: 3,
  },
})
