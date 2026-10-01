import { useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AvaChatPanel } from './AvaChatPanel'
import { AvaPatientLensPicker } from './AvaPatientLensPicker'
import type { AvaOpenRequest } from '@/lib/ava-entity-pin'
import { subscribeAvaOpen } from '@/lib/ava-dock-bus'
import { useAvaPatientLens } from '@/hooks/useAvaPatientLens'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

/** Presença global da Ava: FAB + modal de chat com lente de paciente (paridade G1/G4 web). */
export function AvaGlobalDock() {
  const { tokens } = useAiyraTheme()
  const insets = useSafeAreaInsets()
  const {
    patients,
    patientId,
    activePatient,
    routePatientId,
    loading,
    setPatientId,
    lensOverridesRoute,
  } = useAvaPatientLens()

  const [open, setOpen] = useState(false)
  const [openRequest, setOpenRequest] = useState<AvaOpenRequest | null>(null)
  const [openRequestEpoch, setOpenRequestEpoch] = useState(0)
  const [chatEpoch, setChatEpoch] = useState(0)

  useEffect(() => {
    return subscribeAvaOpen((req) => {
      setPatientId(req.patientId)
      setOpenRequest(req)
      setOpenRequestEpoch((n) => n + 1)
      setOpen(true)
    })
  }, [setPatientId])

  useEffect(() => {
    if (!openRequest) return
    setOpen(true)
  }, [openRequest, openRequestEpoch])

  const handleClose = () => {
    setOpen(false)
    setOpenRequest(null)
  }

  const handlePatientChange = (id: string) => {
    if (id === patientId) return
    setPatientId(id)
    setChatEpoch((n) => n + 1)
  }

  if (loading || !patientId) return null

  const initialMessage = openRequest?.initialMessage
  const entityPin = openRequest?.entityPin
  const autoSend = openRequest?.autoSend

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir chat da Ava"
        onPress={() => setOpen(true)}
        style={[
          styles.fab,
          {
            backgroundColor: tokens.colorPrimary,
            bottom: Math.max(insets.bottom, 16) + 56,
            right: 16,
            shadowColor: '#000',
          },
        ]}
      >
        <Text style={styles.fabLabel}>Ava</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <View style={[styles.sheet, { backgroundColor: tokens.colorBgLayout, paddingTop: insets.top + 8 }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: tokens.colorTextBase }]}>Ava</Text>
              <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
                {activePatient?.name ?? 'Companion'}
              </Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={{ color: tokens.colorPrimary, fontSize: 16, fontWeight: '600' }}>Fechar</Text>
            </Pressable>
          </View>

          <AvaPatientLensPicker
            patients={patients}
            patientId={patientId}
            routePatientId={routePatientId}
            lensOverridesRoute={lensOverridesRoute}
            onSelect={handlePatientChange}
          />

          <View style={styles.chat} key={`${patientId}-${chatEpoch}`}>
            <AvaChatPanel
              patientId={patientId}
              initialMessage={initialMessage}
              entityPin={entityPin}
              autoSend={autoSend}
            />
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 100,
  },
  fabLabel: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sheet: { flex: 1, paddingHorizontal: 16, paddingBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  chat: { flex: 1, minHeight: 200 },
})
