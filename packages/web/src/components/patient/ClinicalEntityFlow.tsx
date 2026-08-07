import { Tag, Typography } from 'antd'
import { LinkOutlined } from '@ant-design/icons'
import type { ClinicalFlow, ClinicalFlowEdge, ClinicalFlowNode } from '../../lib/api.types.js'
import { ENTITY_TYPE_LABEL } from './health-thread-link-roles.js'
import { AIYRACARE_TOKENS } from '../../theme/aiyracare-tokens.js'

const { Text } = Typography

const NODE_ORDER: Record<string, number> = {
  medical_record: 0,
  authorization: 1,
  exam: 2,
  medication: 3,
  diagnosis: 4,
  vaccine: 5,
  health_thread: 6,
}

function sortNodes(nodes: ClinicalFlowNode[]): ClinicalFlowNode[] {
  return [...nodes].sort((a, b) => {
    const oa = NODE_ORDER[a.entityType] ?? 9
    const ob = NODE_ORDER[b.entityType] ?? 9
    if (oa !== ob) return oa - ob
    return (a.date ?? '').localeCompare(b.date ?? '')
  })
}

function buildLanes(nodes: ClinicalFlowNode[], edges: ClinicalFlowEdge[]) {
  const sorted = sortNodes(nodes)
  const lanes: ClinicalFlowNode[][] = []

  for (const node of sorted) {
    const parentEdge = edges.find((e) => e.toEntityId === node.entityId && e.toEntityType === node.entityType)
    if (!parentEdge) {
      lanes.push([node])
      continue
    }
    const parentLane = lanes.find((lane) =>
      lane.some((n) => n.entityId === parentEdge.fromEntityId && n.entityType === parentEdge.fromEntityType),
    )
    if (parentLane) {
      parentLane.push(node)
    } else {
      lanes.push([node])
    }
  }

  return lanes
}

interface ClinicalEntityFlowProps {
  flow: ClinicalFlow
  onRemoveLink?: (linkId: string) => void
}

export function ClinicalEntityFlow({ flow, onRemoveLink }: ClinicalEntityFlowProps) {
  if (flow.nodes.length === 0) {
    return (
      <Text type="secondary" style={{ fontSize: 12 }}>
        Vincule consulta, autorização e exame à trilha e crie relações clínicas entre eles.
      </Text>
    )
  }

  const lanes = buildLanes(flow.nodes, flow.edges)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <LinkOutlined style={{ color: AIYRACARE_TOKENS.colorPrimary }} />
        <Text strong style={{ fontSize: 13 }}>Fluxo clínico</Text>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lanes.map((lane, laneIdx) => (
          <div key={laneIdx} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            {lane.map((node, nodeIdx) => {
              const edge =
                nodeIdx > 0
                  ? flow.edges.find(
                      (e) =>
                        e.toEntityId === node.entityId &&
                        e.toEntityType === node.entityType &&
                        e.fromEntityId === lane[nodeIdx - 1].entityId &&
                        e.fromEntityType === lane[nodeIdx - 1].entityType,
                    )
                  : laneIdx > 0
                    ? flow.edges.find(
                        (e) =>
                          e.toEntityId === node.entityId &&
                          e.toEntityType === node.entityType,
                      )
                    : undefined

              return (
                <div key={`${node.entityType}:${node.entityId}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {edge && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 72 }}>
                      <Text type="secondary" style={{ fontSize: 10, textAlign: 'center' }}>
                        {edge.relationLabel}
                      </Text>
                      <div
                        style={{
                          height: 2,
                          width: 48,
                          background: `linear-gradient(90deg, ${AIYRACARE_TOKENS.colorPrimary}, ${AIYRACARE_TOKENS.colorInfo})`,
                          opacity: 0.5,
                        }}
                      />
                      {onRemoveLink && (
                        <button
                          type="button"
                          onClick={() => onRemoveLink(edge.id)}
                          style={{
                            fontSize: 10,
                            border: 'none',
                            background: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          remover
                        </button>
                      )}
                    </div>
                  )}
                  <div
                    style={{
                      border: '1px solid var(--border, #e2e8f0)',
                      borderRadius: 10,
                      padding: '8px 10px',
                      minWidth: 140,
                      maxWidth: 200,
                      background: node.inThread
                        ? 'linear-gradient(135deg, rgba(147,51,234,0.06), transparent)'
                        : 'var(--surface, #fff)',
                    }}
                  >
                    <Tag style={{ margin: 0, fontSize: 10, marginBottom: 4 }}>
                      {ENTITY_TYPE_LABEL[node.entityType] ?? node.entityType}
                    </Tag>
                    <Text strong style={{ display: 'block', fontSize: 12, lineHeight: 1.35 }}>
                      {node.title}
                    </Text>
                    {node.subtitle && (
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                        {node.subtitle}
                      </Text>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
