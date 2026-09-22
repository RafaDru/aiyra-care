import { useCallback, useEffect, useMemo, useState } from 'react'
import * as DocumentPicker from 'expo-document-picker'
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { SectionCard } from '@/components/family/SectionCard'
import { StatePanel } from '@/components/StatePanel'
import { useToast } from '@/contexts/ToastContext'
import { api } from '@/lib/api'
import type { PatientDocument, PatientDocumentType } from '@/lib/api.types'
import { webPatientSectionTabUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

const PERSONAL_TYPES: PatientDocumentType[] = ['certidao_nascimento', 'rg', 'cpf_card', 'cnh', 'other']
const CLINICAL_TYPES: PatientDocumentType[] = ['prescription', 'exam', 'report', 'vaccine_card', 'other']

type Props = {
  patientId: string
  mode: 'personal' | 'clinical'
}

export function PatientDocumentsPanel({ patientId, mode }: Props) {
  const { t } = useTranslation()
  const toast = useToast()
  const { tokens } = useAiyraTheme()
  const [docs, setDocs] = useState<PatientDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [uploading, setUploading] = useState(false)

  const allowedTypes = mode === 'personal' ? PERSONAL_TYPES : CLINICAL_TYPES
  const defaultType = mode === 'personal' ? 'other' : 'report'

  const load = useCallback(async () => {
    setError(null)
    try {
      setDocs(await api.documents.list(patientId))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('patient.documents.loadError'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [patientId, t])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const filtered = useMemo(
    () => docs.filter((d) => allowedTypes.includes(d.documentType)),
    [docs, allowedTypes],
  )

  const openWeb = () => {
    const tab = mode === 'personal' ? 'personal-documents' : 'documents'
    void Linking.openURL(webPatientSectionTabUrl(patientId, mode === 'personal' ? 'overview' : 'files', tab))
  }

  const pickAndUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    setUploading(true)
    try {
      await api.documents.upload(patientId, defaultType, {
        uri: asset.uri,
        name: asset.name ?? 'documento',
        mimeType: asset.mimeType,
      })
      toast.success(t('patient.documents.uploaded'))
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('patient.documents.uploadError'))
    } finally {
      setUploading(false)
    }
  }

  const confirmDelete = (doc: PatientDocument) => {
    Alert.alert(t('patient.documents.deleteTitle'), doc.originalFilename, [
      { text: t('patient.documents.cancel'), style: 'cancel' },
      {
        text: t('patient.documents.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await api.documents.delete(doc.id)
              toast.success(t('patient.documents.deleted'))
              await load()
            } catch (err) {
              toast.error(err instanceof Error ? err.message : t('patient.documents.uploadError'))
            }
          })()
        },
      },
    ])
  }

  if (loading && filtered.length === 0 && !error) return <StatePanel tokens={tokens} loading />
  if (error && filtered.length === 0) return <StatePanel tokens={tokens} error={error} onRetry={() => void load()} />

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            void load()
          }}
          tintColor={tokens.colorPrimary}
        />
      }
    >
      <Text style={{ color: tokens.colorTextSecondary, fontSize: 14 }}>
        {mode === 'personal' ? t('patient.documents.subtitlePersonal') : t('patient.documents.subtitleClinical')}
      </Text>

      <Pressable
        disabled={uploading}
        onPress={() => void pickAndUpload()}
        style={[styles.primaryBtn, { backgroundColor: tokens.colorPrimary, opacity: uploading ? 0.6 : 1 }]}
      >
        <Text style={styles.primaryBtnLabel}>
          {uploading ? t('patient.documents.uploading') : t('patient.documents.upload')}
        </Text>
      </Pressable>

      <Pressable
        onPress={openWeb}
        style={[styles.webHint, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
      >
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>{t('patient.documents.webHintTx')}</Text>
        <Text style={{ color: tokens.colorPrimary, fontWeight: '600' }}>{t('patient.documents.openWeb')}</Text>
      </Pressable>

      {filtered.length === 0 ? (
        <SectionCard title={t('clinical.listTitle')}>
          <Text style={{ color: tokens.colorTextSecondary }}>{t('patient.documents.empty')}</Text>
        </SectionCard>
      ) : (
        <SectionCard title={t('patient.documents.listCount', { count: filtered.length })}>
          <View style={styles.list}>
            {filtered.map((doc) => (
              <Pressable
                key={doc.id}
                onLongPress={() => confirmDelete(doc)}
                style={[styles.row, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
              >
                <Text style={{ color: tokens.colorTextBase, fontWeight: '600' }} numberOfLines={2}>
                  {doc.originalFilename}
                </Text>
                <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
                  {t(`patient.documents.type_${doc.documentType}`)}
                </Text>
                <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>{t('patient.documents.longPressDelete')}</Text>
              </Pressable>
            ))}
          </View>
        </SectionCard>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  primaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtnLabel: { color: '#fff', fontWeight: '700', fontSize: 16 },
  webHint: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  list: { gap: 10 },
  row: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
})
