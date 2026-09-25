import { useCallback, useEffect, useMemo, useState } from 'react'
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SectionCard } from '@/components/family/SectionCard'
import { StatePanel } from '@/components/StatePanel'
import { api } from '@/lib/api'
import type { Exam } from '@/lib/api.types'
import { formatExamDate, formatExamSource } from '@/lib/exam-format'
import { webPatientSectionTabUrl } from '@/lib/web-app-url'
import { useAiyraTheme } from '@/theme/useAiyraTheme'

type Props = {
  patientId: string
}

function sortExamsNewestFirst(rows: Exam[]): Exam[] {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.examDate).getTime()
    const tb = new Date(b.examDate).getTime()
    return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta)
  })
}

export function PatientExamsTab({ patientId }: Props) {
  const { tokens } = useAiyraTheme()
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const rows = await api.exams.list(patientId)
      setExams(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar exames')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [patientId])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const sorted = useMemo(() => sortExamsNewestFirst(exams), [exams])

  const openWebExams = () => void Linking.openURL(webPatientSectionTabUrl(patientId, 'clinical', 'exams'))

  if (loading && exams.length === 0 && !error) {
    return <StatePanel tokens={tokens} loading />
  }

  if (error && exams.length === 0) {
    return <StatePanel tokens={tokens} error={error} onRetry={() => void load()} />
  }

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
      <View>
        <Text style={[styles.title, { color: tokens.colorTextBase }]}>Exames</Text>
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 14 }}>
          Resumo somente leitura — laudos, marcadores e upload ficam no app web.
        </Text>
      </View>

      <Pressable
        onPress={openWebExams}
        style={[styles.webHint, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
      >
        <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
          Adicionar exame, PDF e dashboard de marcadores: use o navegador.
        </Text>
        <Text style={{ color: tokens.colorPrimary, fontWeight: '600', fontSize: 14 }}>Abrir Exames no navegador</Text>
      </Pressable>

      {sorted.length === 0 ? (
        <SectionCard title="Lista">
          <Text style={{ color: tokens.colorTextSecondary }}>
            Nenhum exame registrado para este perfil. Sincronize integrações ou cadastre manualmente no web.
          </Text>
        </SectionCard>
      ) : (
        <SectionCard title={`${sorted.length} exame${sorted.length === 1 ? '' : 's'}`}>
          <View style={styles.list}>
            {sorted.map((exam) => (
              <View
                key={exam.id}
                style={[styles.row, { borderColor: tokens.colorBorder, backgroundColor: tokens.colorBgContainer }]}
              >
                <Text style={[styles.examName, { color: tokens.colorTextBase }]} numberOfLines={2}>
                  {exam.examType}
                </Text>
                <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }}>
                  {formatExamDate(exam.examDate)}
                  {exam.laboratory ? ` · ${exam.laboratory}` : ''}
                </Text>
                {exam.resultSummary ? (
                  <Text style={{ color: tokens.colorTextSecondary, fontSize: 13 }} numberOfLines={3}>
                    {exam.resultSummary}
                  </Text>
                ) : null}
                <Text style={{ color: tokens.colorTextSecondary, fontSize: 12 }}>
                  Origem: {formatExamSource(exam.source)}
                </Text>
              </View>
            ))}
          </View>
        </SectionCard>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  webHint: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  list: { gap: 10 },
  row: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  examName: { fontSize: 16, fontWeight: '600' },
})
