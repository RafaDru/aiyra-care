import { useEffect, useState } from 'react'
import { Alert, Form, Input, Modal, Select, Typography } from 'antd'
import { api } from '../../lib/api.js'
import type { Authorization, ClinicalEntityType, Exam, MedicalRecord } from '../../lib/api.types.js'
import { ENTITY_TYPE_LABEL } from './health-thread-link-roles.js'
import { CLINICAL_SEQUENCE_COPY } from './clinical-sequence-copy.js'
import { pickClinicalRelationCode } from './entity-clinical-link-utils.js'
import { buildClinicalEntityTargetOptions } from './clinical-entity-target-options.js'
import { ClinicalEntityTargetPicker } from './ClinicalEntityTargetPicker.js'
import { ClinicalRelationTypeField } from './ClinicalRelationTypeField.js'
import { useClinicalRelationTypes } from './useClinicalRelationTypes.js'

const { Text } = Typography

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
  const [loading, setLoading] = useState(false)
  const [targets, setTargets] = useState(
    () => [] as ReturnType<typeof buildClinicalEntityTargetOptions>,
  )

  const toKey = Form.useWatch('toKey', form)
  const toEntity = targets.find((t) => t.value === toKey)

  const { relationTypes, loadingTypes, typesError, reset } = useClinicalRelationTypes(
    open,
    fromEntityType,
    toEntity?.entityType,
    form,
  )

  useEffect(() => {
    if (!open) return
    form.setFieldsValue({ fromLabel: `${ENTITY_TYPE_LABEL[fromEntityType]}: ${fromTitle}` })
    Promise.all([
      api.exams.list(patientId),
      api.medicalRecords.list(patientId),
      api.authorizations.list(patientId),
    ])
      .then(([exams, records, auths]) => {
        setTargets(
          buildClinicalEntityTargetOptions(
            exams as Exam[],
            records as MedicalRecord[],
            auths as Authorization[],
            { entityType: fromEntityType, entityId: fromEntityId },
          ),
        )
      })
      .catch(() => setTargets([]))
  }, [open, patientId, fromEntityType, fromEntityId, fromTitle, form])

  const handleClose = () => {
    form.resetFields()
    reset()
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
      width={640}
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
      <Form
        form={form}
        layout="vertical"
        onValuesChange={(changed) => {
          if ('toKey' in changed) form.setFieldValue('relationCode', undefined)
        }}
      >
        <Form.Item name="fromLabel" label={CLINICAL_SEQUENCE_COPY.fromLabel}>
          <Input disabled />
        </Form.Item>
        <Form.Item
          name="toKey"
          label={CLINICAL_SEQUENCE_COPY.toLabel}
          rules={[{ required: true, message: 'Escolha o registro destino' }]}
        >
          <ClinicalEntityTargetPicker
            options={targets}
            placeholder={CLINICAL_SEQUENCE_COPY.targetPickerPlaceholder}
          />
        </Form.Item>
        <ClinicalRelationTypeField
          relationTypes={relationTypes}
          loading={loadingTypes}
          ready={Boolean(toKey)}
        />
      </Form>
    </Modal>
  )
}
