import { useEffect, useMemo, useState } from 'react'
import { Button, Form, Modal, Select, Typography } from 'antd'
import { api } from '../../lib/api.js'
import type { ClinicalEntityType, ClinicalFlow, RelationType } from '../../lib/api.types.js'
import { ENTITY_TYPE_LABEL } from './health-thread-link-roles.js'

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
  const [relationTypes, setRelationTypes] = useState<RelationType[]>([])
  const [loading, setLoading] = useState(false)

  const entityOptions: EntityOption[] = useMemo(() => {
    if (!flow) return []
    return flow.nodes.map((n) => ({
      value: `${n.entityType}:${n.entityId}`,
      label: `${ENTITY_TYPE_LABEL[n.entityType] ?? n.entityType}: ${n.title}`,
      entityType: n.entityType,
      entityId: n.entityId,
    }))
  }, [flow])

  const fromKey = Form.useWatch('fromKey', form)
  const toKey = Form.useWatch('toKey', form)

  const fromEntity = entityOptions.find((o) => o.value === fromKey)
  const toEntity = entityOptions.find((o) => o.value === toKey)

  useEffect(() => {
    if (!open) return
    api.clinicalLinks
      .relationTypes(fromEntity?.entityType, toEntity?.entityType)
      .then(setRelationTypes)
      .catch(() => setRelationTypes([]))
  }, [open, fromEntity?.entityType, toEntity?.entityType])

  const handleClose = () => {
    form.resetFields()
    onClose()
  }

  const submit = async () => {
    const values = await form.validateFields()
    const from = entityOptions.find((o) => o.value === values.fromKey)
    const to = entityOptions.find((o) => o.value === values.toKey)
    if (!from || !to) return

    setLoading(true)
    try {
      await api.clinicalLinks.create(patientId, {
        fromEntityType: from.entityType,
        fromEntityId: from.entityId,
        toEntityType: to.entityType,
        toEntityId: to.entityId,
        relationCode: values.relationCode,
        healthThreadId: healthThreadId ?? null,
      })
      onCreated()
      handleClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Vínculo clínico entre entidades"
      onCancel={handleClose}
      onOk={() => submit()}
      okText="Criar vínculo"
      confirmLoading={loading}
      destroyOnClose
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
        Relaciona registros canônicos (ex.: consulta solicitou autorização). Projetado no grafo Neo4j para
        correlações e hipóteses de IA.
      </Text>
      <Form form={form} layout="vertical">
        <Form.Item name="fromKey" label="Origem" rules={[{ required: true }]}>
          <Select
            options={entityOptions}
            placeholder="De onde parte o vínculo"
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
        <Form.Item name="toKey" label="Destino" rules={[{ required: true }]}>
          <Select
            options={entityOptions}
            placeholder="O que foi demandado / resultou"
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
        <Form.Item name="relationCode" label="Tipo de relação" rules={[{ required: true }]}>
          <Select
            placeholder="Selecione origem e destino"
            options={relationTypes.map((t) => ({
              value: t.code,
              label: t.label,
            }))}
            disabled={relationTypes.length === 0}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
