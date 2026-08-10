import { useEffect, useState } from 'react'
import { Badge, Button, Popover, Space, Tag, Typography, message } from 'antd'
import { LinkOutlined } from '@ant-design/icons'
import { api } from '../../lib/api.js'
import { CLINICAL_SEQUENCE_COPY } from './clinical-sequence-copy.js'
import type { ClinicalEntityLink, ClinicalEntityType } from '../../lib/api.types.js'
import { EntityClinicalLinkModal } from './EntityClinicalLinkModal.js'

const { Text } = Typography

interface EntityClinicalLinksCellProps {
  patientId: string
  entityType: ClinicalEntityType
  entityId: string
  entityTitle: string
  linkCount: number
  onUpdated?: () => void
}

export function EntityClinicalLinksCell({
  patientId,
  entityType,
  entityId,
  entityTitle,
  linkCount,
  onUpdated,
}: EntityClinicalLinksCellProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [links, setLinks] = useState<ClinicalEntityLink[]>([])
  const [loadingLinks, setLoadingLinks] = useState(false)

  const loadLinks = () => {
    setLoadingLinks(true)
    api.clinicalLinks
      .list(patientId, entityType, entityId)
      .then(setLinks)
      .catch(() => setLinks([]))
      .finally(() => setLoadingLinks(false))
  }

  useEffect(() => {
    if (linkCount > 0) loadLinks()
    else setLinks([])
  }, [patientId, entityType, entityId, linkCount])

  const popoverContent =
    links.length === 0 ? (
      <Text type="secondary" style={{ fontSize: 12 }}>Nenhuma associação ainda</Text>
    ) : (
      <div style={{ maxWidth: 280 }}>
        {links.map((link) => {
          const isFrom = link.fromEntityId === entityId && link.fromEntityType === entityType
          const direction = isFrom ? '→' : '←'
          const label = link.relationLabel ?? link.relationCode
          return (
            <div key={link.id} style={{ marginBottom: 8 }}>
              <Tag style={{ marginBottom: 4 }}>{label}</Tag>
              <Text style={{ fontSize: 12 }}>
                {direction} {isFrom ? link.toEntityType : link.fromEntityType}
              </Text>
              <Button
                type="link"
                size="small"
                danger
                style={{ padding: 0, height: 'auto', fontSize: 11 }}
                onClick={async () => {
                  try {
                    await api.clinicalLinks.delete(link.id)
                    message.success(CLINICAL_SEQUENCE_COPY.removed)
                    loadLinks()
                    onUpdated?.()
                  } catch (e) {
                    message.error(e instanceof Error ? e.message : 'Erro ao remover')
                  }
                }}
              >
                remover
              </Button>
            </div>
          )
        })}
      </div>
    )

  return (
    <>
      <Space size={4}>
        <Popover
          title={CLINICAL_SEQUENCE_COPY.popoverTitle}
          content={loadingLinks ? 'Carregando…' : popoverContent}
          trigger="click"
        >
          <Badge count={linkCount} size="small" offset={[-2, 2]}>
            <Button type="text" size="small" icon={<LinkOutlined />} aria-label="Vínculos" />
          </Badge>
        </Popover>
        <Button type="link" size="small" onClick={() => setModalOpen(true)} style={{ padding: 0 }}>
          {CLINICAL_SEQUENCE_COPY.associate}
        </Button>
      </Space>

      <EntityClinicalLinkModal
        open={modalOpen}
        patientId={patientId}
        fromEntityType={entityType}
        fromEntityId={entityId}
        fromTitle={entityTitle}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          message.success(CLINICAL_SEQUENCE_COPY.created)
          loadLinks()
          onUpdated?.()
        }}
      />
    </>
  )
}
