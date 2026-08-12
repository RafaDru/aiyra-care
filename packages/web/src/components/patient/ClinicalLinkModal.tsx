import { useEffect, useMemo, useState } from 'react'
import { Alert, Form, Modal, Select, Typography } from 'antd'
import { api } from '../../lib/api.js'
import type { ClinicalEntityType, ClinicalFlow } from '../../lib/api.types.js'
import { ENTITY_TYPE_LABEL } from './health-thread-link-roles.js'
import {
  entityKey,
  pickClinicalRelationCode,
  sortClinicalFlowNodes,
} from './entity-clinical-link-utils.js'
import { CLINICAL_SEQUENCE_COPY } from './clinical-sequence-copy.js'
import { ClinicalRelationTypeField } from './ClinicalRelationTypeField.js'
import { useClinicalRelationTypes } from './useClinicalRelationTypes.js'

const { Text } = Typography

interface EntityOption {
  value: string
  label: string
  entityType: ClinicalEntityType
  entityId: string
}

interface ClinicalLinkModalProps {
  open: boolean
  patientId: string
  healthThreadId?: string
  flow: ClinicalFlow | null
  onClose: () => void
  onCreated: () => void
}

export function ClinicalLinkModal({
  open,
  patientId,
  healthThreadId,
  flow,
  onClose,
  onCreated,
}: ClinicalLinkModalProps) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const entityOptions: EntityOption[] = useMemo(() => {
    if (!flow) return []
    return flow.nodes.map((n) => ({
      value: entityKey(n.entityType, n.entityId),
      label: `${ENTITY_TYPE_LABEL[n.entityType] ?? n.entityType}: ${n.title}`,
      entityType: n.entityType,
      entityId: n.entityId,
    }))
  }, [flow])

  const fromKey = Form.useWatch('fromKey', form)
  const toKey = Form.useWatch('toKey', form)

  const fromEntity = entityOptions.find((o) => o.value === fromKey)
  const toEntity = entityOptions.find((o) => o.value === toKey)

  const { relationTypes, loadingTypes, typesError, reset } = useClinicalRelationTypes(
    open,
    fromEntity?.entityType,
    toEntity?.entityType,
    form,
  )

  useEffect(() => {
    if (!open) return
    if (!flow || flow.nodes.length < 2) return

    const sorted = sortClinicalFlowNodes(flow.nodes)
    const from = sorted[0]
    const to = sorted[1]
    if (!from || !to) return

    form.setFieldsValue({
      fromKey: entityKey(from.entityType, from.entityId),
      toKey: entityKey(to.entityType, to.entityId),
      relationCode: undefined,
    })
  }, [open, flow, form])

  const handleClose = () => {
    form.resetFields()
    reset()
    onClose()
  }

  const submit = async () => {
    const values = await form.validateFields()
    const from = entityOptions.find((o) => o.value === values.fromKey)
    const to = entityOptions.find((o) => o.value === values.toKey)
    if (!from || !to) return

    let relationCode = values.relationCode as string | undefined
    if (!relationCode) {
      relationCode = pickClinicalRelationCode(relationTypes, from.entityType, to.entityType)
      if (relationCode) form.setFieldValue('relationCode', relationCode)
    }
    if (!relationCode) return

    setSubmitting(true)
    try {
      await api.clinicalLinks.create(patientId, {
        fromEntityType: from.entityType,
        fromEntityId: from.entityId,
        toEntityType: to.entityType,
        toEntityId: to.entityId,
        relationCode,
        healthThreadId: healthThreadId ?? null,
      })
      onCreated()
      handleClose()
    } finally {
      setSubmitting(false)
    }
  }

  const pairReady = Boolean(fromKey && toKey && fromKey !== toKey)
  const canSubmit = pairReady && relationTypes.length > 0 && !loadingTypes

  return (
    <Modal
      open={open}
      title={CLINICAL_SEQUENCE_COPY.modalTitle}
      onCancel={handleClose}
      onOk={() => submit()}
      okText={CLINICAL_SEQUENCE_COPY.submit}
      confirmLoading={submitting}
      okButtonProps={{ disabled: !canSubmit }}
      destroyOnClose
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
        {CLINICAL_SEQUENCE_COPY.modalHint}
      </Text>
      {typesError && (
        <Alert type="warning" message={typesError} style={{ marginBottom: 12 }} showIcon />
      )}
      <Form
        form={form}
        layout="vertical"
        onValuesChange={(changed) => {
          if ('fromKey' in changed || 'toKey' in changed) {
            form.setFieldValue('relationCode', undefined)
          }
        }}
      >
        <Form.Item
          name="fromKey"
          label={CLINICAL_SEQUENCE_COPY.fromLabel}
          rules={[{ required: true, message: 'Escolha o que aconteceu antes' }]}
        >
          <Select
            options={entityOptions}
            placeholder="Ex.: consulta com a médica"
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
        <Form.Item
          name="toKey"
          label={CLINICAL_SEQUENCE_COPY.toLabel}
          rules={[{ required: true, message: 'Escolha o que veio depois' }]}
        >
          <Select
            options={entityOptions.filter((o) => o.value !== fromKey)}
            placeholder="Ex.: pedido de autorização de exame"
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
        <ClinicalRelationTypeField
          relationTypes={relationTypes}
          loading={loadingTypes}
          ready={pairReady}
        />
      </Form>
    </Modal>
  )
}
