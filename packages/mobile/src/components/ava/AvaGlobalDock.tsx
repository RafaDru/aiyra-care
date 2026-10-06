import { useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AvaChatPanel } from './AvaChatPanel'
import { AvaConversationToolbar } from './AvaConversationToolbar'
import { AvaPatientLensPicker } from './AvaPatientLensPicker'
import type { AvaOpenRequest } from '@/lib/ava-entity-pin'
import { subscribeAvaOpen } from '@/lib/ava-dock-bus'
import { useAvaPatientLens } from '@/hooks/useAvaPatientLens'
import {
  DUAL_ENTRY_EDGE_INSET,
  DUAL_ENTRY_FAB_BOTTOM_OFFSET,
  DUAL_ENTRY_FAB_RADIUS,
  DUAL_ENTRY_FAB_SHADOW,
  DUAL_ENTRY_Z_INDEX_AVA,
} from '@/lib/dual-entry-layout'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

/** Presença global da Ava: FAB + modal de chat com lente de paciente (paridade G1/G4 web). */
export function AvaGlobalDock() {
  const { t } = useTranslation()
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
  const [conversationId, setConversationId] = useState<string | null>(null)

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
    setConversationId(null)
    setChatEpoch((n) => n + 1)
  }

  const handleNewChatSession = () => {
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
        accessibilityLabel={t('ava.openChat')}
        onPress={() => setOpen(true)}
        style={[
          styles.fab,
          DUAL_ENTRY_FAB_SHADOW,
          {
            backgroundColor: tokens.colorPrimary,
            bottom: Math.max(insets.bottom, 16) + DUAL_ENTRY_FAB_BOTTOM_OFFSET,
            right: DUAL_ENTRY_EDGE_INSET,
            borderRadius: DUAL_ENTRY_FAB_RADIUS,
          },
        ]}
      >
        <Text style={styles.fabLabel}>{t('ava.title')}</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
        <View style={[styles.sheet, { backgroundColor: tokens.colorBgLayout, paddingTop: insets.top + 8 }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: tokens.colorTextBase }]}>{t('ava.title')}</Text>
              <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
                {activePatient?.name ?? t('ava.lensNoPatient')}
              </Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={12} accessibilityRole="button">
              <Text style={{ color: tokens.colorPrimary, fontSize: 16, fontWeight: '600' }}>
                {t('common.close')}
              </Text>
            </Pressable>
          </View>

          <AvaPatientLensPicker
            patients={patients}
            patientId={patientId}
            routePatientId={routePatientId}
            lensOverridesRoute={lensOverridesRoute}
            onSelect={handlePatientChange}
          />

          <AvaConversationToolbar
            patientId={patientId}
            conversationId={conversationId}
            onConversationIdChange={setConversationId}
            onConversationsChanged={handleNewChatSession}
          />

          <View style={styles.chat} key={`${patientId}-${chatEpoch}-${conversationId ?? 'new'}`}>
            <AvaChatPanel
              patientId={patientId}
              conversationId={conversationId}
              onConversationIdChange={setConversationId}
              initialMessage={initialMessage}
              entityPin={entityPin}
              autoSend={autoSend}
              onAcceleratorConsumed={() => setOpenRequest(null)}
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
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: DUAL_ENTRY_Z_INDEX_AVA,
  },
  fabLabel: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sheet: { flex: 1, paddingHorizontal: 16, paddingBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  chat: { flex: 1, minHeight: 200 },
})
