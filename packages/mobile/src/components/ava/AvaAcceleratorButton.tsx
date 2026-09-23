import { Pressable, StyleSheet, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { AvaEntityPin } from '@/lib/ava-entity-pin'
import { requestAvaOpen } from '@/lib/ava-dock-bus'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = {
  patientId: string
  initialMessage: string
  entityPin?: AvaEntityPin
  compact?: boolean
}

/** Acelerador G1 — abre dock global com lente, pergunta e entityPin. */
export function AvaAcceleratorButton({ patientId, initialMessage, entityPin, compact }: Props) {
  const { t } = useTranslation()
  const { tokens } = useAiyraTheme()

  return (
    <Pressable
      onPress={() =>
        requestAvaOpen({
          patientId,
          initialMessage,
          entityPin,
          autoSend: true,
        })
      }
      style={({ pressed }) => [
        styles.btn,
        compact ? styles.compact : null,
        { opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={{ color: tokens.colorPrimary, fontWeight: '600', fontSize: compact ? 13 : 14 }}>
        {t('ava.accelerator')}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 6 },
  compact: { paddingVertical: 2 },
})
