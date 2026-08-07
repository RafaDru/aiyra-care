import {
  MedicineBoxOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { AIYRACARE_TOKENS } from '../../theme/aiyracare-tokens.js'

export const TIMELINE_KIND_META: Record<
  string,
  { label: string; color: string; bg: string; Icon: typeof CalendarOutlined }
> = {
  consultation: { label: 'Consulta', color: '#9333EA', bg: '#F3E8FF', Icon: MedicineBoxOutlined },
  extrato: { label: 'Extrato', color: '#64748B', bg: '#F1F5F9', Icon: FileTextOutlined },
  exam: { label: 'Exame', color: '#2563EB', bg: '#EFF6FF', Icon: ExperimentOutlined },
  vaccine: { label: 'Vacina', color: '#059669', bg: '#ECFDF5', Icon: MedicineBoxOutlined },
  authorization: { label: 'Autorização', color: '#FF3DA8', bg: '#FCE7F3', Icon: SafetyCertificateOutlined },
  medication_start: { label: 'Medicamento', color: '#7C3AED', bg: '#EDE9FE', Icon: ThunderboltOutlined },
  thread_note: { label: 'Trilha', color: '#9333EA', bg: '#F3E8FF', Icon: UnorderedListOutlined },
}

export const TIMELINE_KIND_OPTIONS = Object.entries(TIMELINE_KIND_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}))

export function timelineKindMeta(kind: string) {
  return (
    TIMELINE_KIND_META[kind] ?? {
      label: kind,
      color: AIYRACARE_TOKENS.colorPrimary,
      bg: '#F3E8FF',
      Icon: CalendarOutlined,
    }
  )
}
