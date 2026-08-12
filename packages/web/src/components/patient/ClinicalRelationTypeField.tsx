import { Form, Select } from 'antd'
import type { RelationType } from '../../lib/api.types.js'
import { CLINICAL_SEQUENCE_COPY } from './clinical-sequence-copy.js'

interface ClinicalRelationTypeFieldProps {
  relationTypes: RelationType[]
  loading: boolean
  ready: boolean
  name?: string
}

export function ClinicalRelationTypeField({
  relationTypes,
  loading,
  ready,
  name = 'relationCode',
}: ClinicalRelationTypeFieldProps) {
  const options = relationTypes.map((t) => ({
    value: t.code,
    label: t.description ? `${t.label} — ${t.description}` : t.label,
  }))

  return (
    <Form.Item
      name={name}
      label={CLINICAL_SEQUENCE_COPY.relationLabel}
      rules={[{ required: true, message: 'Escolha o que aconteceu entre eles' }]}
    >
      <Select
        placeholder={
          loading
            ? CLINICAL_SEQUENCE_COPY.relationLoading
            : !ready
              ? CLINICAL_SEQUENCE_COPY.relationPlaceholder
              : options.length === 0
                ? 'Nenhuma opção para esta combinação'
                : 'Selecione'
        }
        options={options}
        loading={loading}
        disabled={!ready || loading || options.length === 0}
      />
    </Form.Item>
  )
}
