import { useEffect, useMemo, useState } from 'react'
import { CalendarOutlined } from '@ant-design/icons'
import { Alert, Form, Modal, Select, Space, Tag, Typography } from 'antd'
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
  typeLabel: string
  dateFormatted: string
  title: string
  subtitle: string
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

function renderFlowOption(opt: EntityOption) {
  return (
    <div style={{ padding: '2px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <Space size={6} align="center" style={{ flex: 1, minWidth: 0 }}>
          <Tag color="blue" style={{ margin: 0, fontSize: 11, fontWeight: 600 }}>
            {opt.typeLabel}
          </Tag>
          {opt.dateFormatted && (
            <Tag color="cyan" icon={<CalendarOutlined />} style={{ margin: 0, fontSize: 11 }}>
              {opt.dateFormatted}
            </Tag>
          )}
          <Text strong style={{ fontSize: 13, wordBreak: 'break-word' }}>
            {opt.title}
          </Text>
        </Space>
      </div>
      {opt.subtitle && (
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2, paddingLeft: 2 }}>
          {opt.subtitle}
        </Text>
      )}
    </div>
  )
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
    return flow.nodes.map((n) => {
      const typeLabel = ENTITY_TYPE_LABEL[n.entityType] ?? n.entityType
      const dateFormatted = n.date ? new Date(n.date).toLocaleDateString('pt-BR') : ''
      const title = n.title
      const subtitle = n.subtitle || ''
      const searchVal = `${dateFormatted} ${typeLabel} ${title} ${subtitle}`.toLowerCase()

      return {
        value: entityKey(n.entityType, n.entityId),
        label: searchVal,
        typeLabel,
        dateFormatted,
        title,
        subtitle,
        entityType: n.entityType,
        entityId: n.entityId,
      }
    })
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

  const selectOptions = entityOptions.map((opt) => ({
    value: opt.value,
    label: opt.label,
    rawOption: opt,
  }))

  return (
    <Modal
      open={open}
      width={640}
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
            options={selectOptions}
            placeholder="Ex.: consulta com a médica"
            showSearch
            optionFilterProp="label"
            dropdownStyle={{ minWidth: 360, maxWidth: '90vw' }}
            optionRender={(option) => {
              const raw = (option.data as { rawOption?: EntityOption }).rawOption
              return raw ? renderFlowOption(raw) : option.label
            }}
          />
        </Form.Item>
        <Form.Item
          name="toKey"
          label={CLINICAL_SEQUENCE_COPY.toLabel}
          rules={[{ required: true, message: 'Escolha o que veio depois' }]}
        >
          <Select
            options={selectOptions.filter((o) => o.value !== fromKey)}
            placeholder="Ex.: pedido de autorização de exame"
            showSearch
            optionFilterProp="label"
            dropdownStyle={{ minWidth: 360, maxWidth: '90vw' }}
            optionRender={(option) => {
              const raw = (option.data as { rawOption?: EntityOption }).rawOption
              return raw ? renderFlowOption(raw) : option.label
            }}
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
