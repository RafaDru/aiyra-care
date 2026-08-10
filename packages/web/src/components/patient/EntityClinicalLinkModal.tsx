import { useEffect, useState } from 'react'
import { Alert, Form, Input, Modal, Select, Typography } from 'antd'
import { api } from '../../lib/api.js'
import type { Authorization, ClinicalEntityType, Exam, MedicalRecord, RelationType } from '../../lib/api.types.js'
import { ENTITY_TYPE_LABEL } from './health-thread-link-roles.js'
import { CLINICAL_SEQUENCE_COPY } from './clinical-sequence-copy.js'
import { fallbackRelationTypes, pickClinicalRelationCode } from './entity-clinical-link-utils.js'

const { Text } = Typography

interface TargetOption {
  value: string
  label: string
  entityType: ClinicalEntityType
  entityId: string
}

interface EntityClinicalLinkModalProps {
  open: boolean
  patientId: string
  fromEntityType: ClinicalEntityType
  fromEntityId: string
  fromTitle: string
  onClose: () => void
  onCreated: () => void
}

export function EntityClinicalLinkModal({
  open,
  patientId,
  fromEntityType,
  fromEntityId,
  fromTitle,
  onClose,
  onCreated,
}: EntityClinicalLinkModalProps) {
  const [form] = Form.useForm()
  const [relationTypes, setRelationTypes] = useState<RelationType[]>([])
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [typesError, setTypesError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [targets, setTargets] = useState<TargetOption[]>([])

  const toKey = Form.useWatch('toKey', form)
  const toEntity = targets.find((t) => t.value === toKey)

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({ fromLabel: `${ENTITY_TYPE_LABEL[fromEntityType]}: ${fromTitle}` })
    Promise.all([
      api.exams.list(patientId),
      api.medicalRecords.list(patientId),
      api.authorizations.list(patientId),
    ])
      .then(([exams, records, auths]) => {
        const options: TargetOption[] = []
        for (const e of exams as Exam[]) {
          if (fromEntityType === 'exam' && e.id === fromEntityId) continue
          options.push({
            value: `exam:${e.id}`,
            label: `Exame: ${e.examType}`,
            entityType: 'exam',
            entityId: e.id,
          })
        }
        for (const r of records as MedicalRecord[]) {
          if (fromEntityType === 'medical_record' && r.id === fromEntityId) continue
          options.push({
            value: `medical_record:${r.id}`,
            label: `Consulta: ${r.doctorName ?? r.specialty ?? r.recordType}`,
            entityType: 'medical_record',
            entityId: r.id,
          })
        }
        for (const a of auths as Authorization[]) {
          if (fromEntityType === 'authorization' && a.id === fromEntityId) continue
          options.push({
            value: `authorization:${a.id}`,
            label: `Autorização: ${a.classification ?? a.procedureDescription ?? a.guideNumber ?? '—'}`,
            entityType: 'authorization',
            entityId: a.id,
          })
        }
        setTargets(options)
      })
      .catch(() => setTargets([]))
  }, [open, patientId, fromEntityType, fromEntityId, fromTitle, form])

  useEffect(() => {
    if (!open || !toEntity) {
      setRelationTypes([])
      return
    }
    setLoadingTypes(true)
    setTypesError(null)
    api.clinicalLinks
      .relationTypes(fromEntityType, toEntity.entityType)
      .then((types) => {
        const resolved = types.length > 0 ? types : fallbackRelationTypes(fromEntityType, toEntity.entityType)
        setRelationTypes(resolved)
        const pick = pickClinicalRelationCode(resolved, fromEntityType, toEntity.entityType)
        if (pick) form.setFieldValue('relationCode', pick)
      })
      .catch(() => {
        const resolved = fallbackRelationTypes(fromEntityType, toEntity.entityType)
        setRelationTypes(resolved)
        const pick = pickClinicalRelationCode(resolved, fromEntityType, toEntity.entityType)
        if (pick) form.setFieldValue('relationCode', pick)
        setTypesError('Não foi possível carregar opções do servidor; usando padrões locais.')
      })
      .finally(() => setLoadingTypes(false))
  }, [open, fromEntityType, toEntity, form])

  const handleClose = () => {
    form.resetFields()
    setTypesError(null)
    onClose()
  }

  const submit = async () => {
    const values = await form.validateFields()
    const to = targets.find((t) => t.value === values.toKey)
    if (!to) return

    let relationCode = values.relationCode as string | undefined
    if (!relationCode) {
      relationCode = pickClinicalRelationCode(relationTypes, fromEntityType, to.entityType)
      if (relationCode) form.setFieldValue('relationCode', relationCode)
    }
    if (!relationCode) return

    setLoading(true)
    try {
      await api.clinicalLinks.create(patientId, {
        fromEntityType,
        fromEntityId,
        toEntityType: to.entityType,
        toEntityId: to.entityId,
        relationCode,
      })
      onCreated()
      handleClose()
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = Boolean(toKey && relationTypes.length > 0 && !loadingTypes)

  return (
    <Modal
      open={open}
      title={CLINICAL_SEQUENCE_COPY.entityModalTitle}
      onCancel={handleClose}
      onOk={() => submit()}
      okText={CLINICAL_SEQUENCE_COPY.submit}
      confirmLoading={loading}
      okButtonProps={{ disabled: !canSubmit }}
      destroyOnClose
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
        {CLINICAL_SEQUENCE_COPY.entityModalHint}
      </Text>
      {typesError && (
        <Alert type="warning" message={typesError} style={{ marginBottom: 12 }} showIcon />
      )}
      <Form form={form} layout="vertical">
        <Form.Item name="fromLabel" label={CLINICAL_SEQUENCE_COPY.fromLabel}>
          <Input disabled />
        </Form.Item>
        <Form.Item name="toKey" label={CLINICAL_SEQUENCE_COPY.toLabel} rules={[{ required: true, message: 'Escolha o registro destino' }]}>
          <Select
            options={targets}
            placeholder="Selecione o registro destino"
            showSearch
            optionFilterProp="label"
            onChange={() => form.setFieldValue('relationCode', undefined)}
          />
        </Form.Item>
        <Form.Item
          name="relationCode"
          label={CLINICAL_SEQUENCE_COPY.relationLabel}
          rules={[{ required: true, message: 'Escolha o que aconteceu entre eles' }]}
        >
          <Select
            placeholder={
              loadingTypes
                ? CLINICAL_SEQUENCE_COPY.relationLoading
                : !toKey
                  ? CLINICAL_SEQUENCE_COPY.relationPlaceholder
                  : relationTypes.length === 0
                    ? 'Nenhuma opção para esta combinação'
                    : 'Selecione'
            }
            loading={loadingTypes}
            options={relationTypes.map((t) => ({
              value: t.code,
              label: t.description ? `${t.label} — ${t.description}` : t.label,
            }))}
            disabled={!toKey || loadingTypes || relationTypes.length === 0}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
