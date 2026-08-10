import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Form, Modal, Select, Typography } from 'antd'
import { api } from '../../lib/api.js'
import type { ClinicalEntityType, ClinicalFlow, RelationType } from '../../lib/api.types.js'
import { ENTITY_TYPE_LABEL } from './health-thread-link-roles.js'
import {
  entityKey,
  fallbackRelationTypes,
  pickClinicalRelationCode,
  sortClinicalFlowNodes,
} from './entity-clinical-link-utils.js'
import { CLINICAL_SEQUENCE_COPY } from './clinical-sequence-copy.js'

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
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [typesError, setTypesError] = useState<string | null>(null)
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

  const resolvePair = useCallback(
    (fromValue?: string, toValue?: string) => {
      const from = entityOptions.find((o) => o.value === fromValue)
      const to = entityOptions.find((o) => o.value === toValue)
      if (!from || !to || fromValue === toValue) return null
      return { from, to }
    },
    [entityOptions],
  )

  const loadRelationTypes = useCallback(
    async (fromType: ClinicalEntityType, toType: ClinicalEntityType) => {
      setLoadingTypes(true)
      setTypesError(null)
      try {
        let types = await api.clinicalLinks.relationTypes(fromType, toType)
        if (types.length === 0) types = fallbackRelationTypes(fromType, toType)
        setRelationTypes(types)
        const pick = pickClinicalRelationCode(types, fromType, toType)
        if (pick) form.setFieldValue('relationCode', pick)
      } catch {
        const types = fallbackRelationTypes(fromType, toType)
        setRelationTypes(types)
        const pick = pickClinicalRelationCode(types, fromType, toType)
        if (pick) form.setFieldValue('relationCode', pick)
        setTypesError('Não foi possível carregar opções do servidor; usando padrões locais.')
      } finally {
        setLoadingTypes(false)
      }
    },
    [form],
  )

  const syncRelationTypes = useCallback(
    (fromValue?: string, toValue?: string) => {
      const pair = resolvePair(fromValue, toValue)
      if (!pair) {
        setRelationTypes([])
        form.setFieldValue('relationCode', undefined)
        return
      }
      loadRelationTypes(pair.from.entityType, pair.to.entityType)
    },
    [form, loadRelationTypes, resolvePair],
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

  useEffect(() => {
    if (!open) return
    syncRelationTypes(fromKey, toKey)
  }, [open, fromKey, toKey, syncRelationTypes])

  const handleClose = () => {
    form.resetFields()
    setRelationTypes([])
    setTypesError(null)
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

  const relationOptions = relationTypes.map((t) => ({
    value: t.code,
    label: t.description ? `${t.label} — ${t.description}` : t.label,
  }))

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
      <Form form={form} layout="vertical">
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
            onChange={() => form.setFieldValue('relationCode', undefined)}
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
                : !pairReady
                  ? CLINICAL_SEQUENCE_COPY.relationPlaceholder
                  : relationOptions.length === 0
                    ? 'Nenhuma opção para esta combinação'
                    : 'Selecione'
            }
            options={relationOptions}
            loading={loadingTypes}
            disabled={!pairReady || loadingTypes || relationOptions.length === 0}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
