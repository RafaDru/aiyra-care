import { useCallback, useEffect, useState } from 'react'
import { Button, Spin, Tag, Typography, message } from 'antd'
import {
  ArrowRightOutlined,
  ArrowLeftOutlined,
  ExportOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api.js'
import type { ClinicalEntityLink, ClinicalEntityType } from '../../lib/api.types.js'
import { buildPatientEntityHref } from '../../lib/clinical-entity-navigation.js'
import { CLINICAL_SEQUENCE_COPY } from './clinical-sequence-copy.js'
import { ENTITY_TYPE_LABEL } from './health-thread-link-roles.js'
import { EntityClinicalLinkModal } from './EntityClinicalLinkModal.js'
import './clinical-entity-highlight.css'

const { Text, Paragraph } = Typography

interface EntityClinicalLinksExpandedPanelProps {
  patientId: string
  entityType: ClinicalEntityType
  entityId: string
  entityTitle: string
  onUpdated?: () => void
}

function formatPeerDate(date?: string) {
  if (!date) return null
  try {
    return new Date(date).toLocaleDateString('pt-BR')
  } catch {
    return null
  }
}

export function EntityClinicalLinksExpandedPanel({
  patientId,
  entityType,
  entityId,
  entityTitle,
  onUpdated,
}: EntityClinicalLinksExpandedPanelProps) {
  const navigate = useNavigate()
  const [links, setLinks] = useState<ClinicalEntityLink[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const loadLinks = useCallback(() => {
    setLoading(true)
    api.clinicalLinks
      .list(patientId, entityType, entityId)
      .then(setLinks)
      .catch(() => setLinks([]))
      .finally(() => setLoading(false))
  }, [patientId, entityType, entityId])

  useEffect(() => {
    loadLinks()
  }, [loadLinks])

  const goToPeer = (peerType: ClinicalEntityType, peerId: string) => {
    const href = buildPatientEntityHref(patientId, peerType, peerId)
    if (!href) {
      message.info('Este tipo ainda não tem aba dedicada no perfil.')
      return
    }
    navigate(href)
  }

  if (loading) {
    return (
      <div className="clinical-links-expanded">
        <Spin size="small" />
      </div>
    )
  }

  return (
    <div className="clinical-links-expanded">
      <Text strong style={{ display: 'block', marginBottom: 4 }}>
        {CLINICAL_SEQUENCE_COPY.expandTitle}
      </Text>
      <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
        {CLINICAL_SEQUENCE_COPY.expandHint}
      </Paragraph>

      {links.length === 0 ? (
        <Text type="secondary">{CLINICAL_SEQUENCE_COPY.expandEmpty}</Text>
      ) : (
        links.map((link) => {
          const peer = link.peerEntity
          if (!peer) return null
          const directionLabel =
            link.direction === 'outgoing'
              ? CLINICAL_SEQUENCE_COPY.peerOutgoing
              : CLINICAL_SEQUENCE_COPY.peerIncoming
          const href = buildPatientEntityHref(patientId, peer.entityType, peer.entityId)
          const dateStr = formatPeerDate(peer.date)

          return (
            <div key={link.id} style={{ marginBottom: 12 }}>
              <div
                style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 6 }}
              >
                <Tag color="processing">{link.relationLabel ?? link.relationCode}</Tag>
                <Tag icon={link.direction === 'outgoing' ? <ArrowRightOutlined /> : <ArrowLeftOutlined />}>
                  {directionLabel}
                </Tag>
                <Tag>{ENTITY_TYPE_LABEL[peer.entityType] ?? peer.entityType}</Tag>
              </div>
              <button
                type="button"
                className="clinical-link-peer-card"
                onClick={() => goToPeer(peer.entityType, peer.entityId)}
                disabled={!href}
              >
                <Text strong style={{ display: 'block' }}>{peer.title}</Text>
                {peer.subtitle && (
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    {peer.subtitle}
                  </Text>
                )}
                {dateStr && (
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                    {dateStr}
                  </Text>
                )}
                {href && (
                  <Text style={{ fontSize: 12, marginTop: 6, color: 'var(--primary)' }}>
                    <ExportOutlined /> {CLINICAL_SEQUENCE_COPY.goToEntity}
                  </Text>
                )}
              </button>
              <Button
                type="link"
                size="small"
                danger
                style={{ padding: 0, height: 'auto', fontSize: 11, marginTop: 4 }}
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
                remover associação
              </Button>
            </div>
          )
        })
      )}

      <Button
        type="dashed"
        size="small"
        icon={<PlusOutlined />}
        style={{ marginTop: 12 }}
        onClick={() => setModalOpen(true)}
      >
        {CLINICAL_SEQUENCE_COPY.associate}
      </Button>

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
    </div>
  )
}
