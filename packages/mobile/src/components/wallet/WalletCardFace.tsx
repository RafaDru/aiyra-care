import { StyleSheet, Text, View } from 'react-native'
import { walletBrandMeta, type WalletBrandKey } from '@/lib/wallet-format'

type Props = {
  brandKey: WalletBrandKey
  planLabel?: string | null
  holderName: string
  numberLabel: string
  numberValue: string
  statusLabel?: string
  statusTone?: 'active' | 'inactive' | 'pending'
}

export function WalletCardFace({
  brandKey,
  planLabel,
  holderName,
  numberLabel,
  numberValue,
  statusLabel,
  statusTone = 'active',
}: Props) {
  const meta = walletBrandMeta(brandKey)
  const badgeBg =
    statusTone === 'active' ? '#22c55e33' : statusTone === 'pending' ? '#ffffff33' : '#94a3b833'

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { backgroundColor: meta.headerBg }]}>
        <Text style={[styles.headerLabel, { color: meta.textColor }]}>{meta.label}</Text>
      </View>
      <View style={[styles.body, { backgroundColor: meta.bodyBg }]}>
        <Text style={[styles.subtitle, { color: meta.mutedColor }]}>{meta.subtitle}</Text>
        {planLabel && planLabel !== meta.subtitle ? (
          <Text style={[styles.plan, { color: meta.mutedColor }]}>{planLabel}</Text>
        ) : null}
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={[styles.fieldLabel, { color: meta.mutedColor }]}>{numberLabel}</Text>
            <Text style={[styles.number, { color: meta.textColor }]}>{numberValue}</Text>
            <Text style={[styles.holder, { color: meta.textColor }]}>{holderName}</Text>
          </View>
          {statusLabel ? (
            <View style={[styles.badge, { backgroundColor: badgeBg }]}>
              <Text style={[styles.badgeText, { color: meta.textColor }]}>{statusLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 16, overflow: 'hidden' },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  headerLabel: { fontWeight: '700', fontSize: 15 },
  body: { padding: 16, gap: 4 },
  subtitle: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  plan: { fontSize: 12, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  flex: { flex: 1, minWidth: 0 },
  fieldLabel: { fontSize: 11 },
  number: { fontSize: 16, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  holder: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
})
