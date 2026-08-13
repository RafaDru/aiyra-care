import { useMemo, useState } from 'react'
import { Button, Collapse, List, Modal, Tag, Typography } from 'antd'
import type { PatientContext } from '../../lib/api.types.js'
import { PENDENCY_KIND_LABEL } from './pendency-kind-label.js'

const { Text } = Typography

const PREVIEW_COUNT = 3

type Pendency = PatientContext['pendencies'][number]

interface Props {
  pendencies: Pendency[]
}

function groupPendencies(pendencies: Pendency[]): Array<{ kind: string; items: Pendency[] }> {
  const map = new Map<string, Pendency[]>()
  for (const item of pendencies) {
    const list = map.get(item.kind) ?? []
    list.push(item)
    map.set(item.kind, list)
  }
  return [...map.entries()].map(([kind, items]) => ({ kind, items }))
}

export function PatientPendenciesSection({ pendencies }: Props) {
  const [modalGroup, setModalGroup] = useState<{ kind: string; items: Pendency[] } | null>(null)

  const groups = useMemo(() => groupPendencies(pendencies), [pendencies])

  const defaultActiveKeys = useMemo(
    () =>
      groups
        .filter((g) => g.kind !== 'document_ocr' || g.items.length <= PREVIEW_COUNT)
        .map((g) => g.kind),
    [groups],
  )

  if (pendencies.length === 0) return null

  const collapseItems = groups.map(({ kind, items }) => ({
    key: kind,
    label: `${PENDENCY_KIND_LABEL[kind] ?? kind} (${items.length})`,
    children: (
      <>
        <List
          size="small"
          dataSource={items.slice(0, PREVIEW_COUNT)}
          renderItem={(item) => (
            <List.Item style={{ paddingLeft: 0, paddingRight: 0 }}>
              <div>
                <Tag>{PENDENCY_KIND_LABEL[item.kind] ?? item.kind}</Tag>
                <Text>{item.title}</Text>
                {item.detail && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.detail}</Text>
                  </div>
                )}
              </div>
            </List.Item>
          )}
        />
        {items.length > PREVIEW_COUNT && (
          <Button type="link" size="small" style={{ paddingLeft: 0 }} onClick={() => setModalGroup({ kind, items })}>
            Ver todas ({items.length})
          </Button>
        )}
      </>
    ),
  }))

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Text strong>Pendências</Text>
        <Collapse
          size="small"
          style={{ marginTop: 8 }}
          items={collapseItems}
          defaultActiveKey={defaultActiveKeys}
        />
      </div>

      <Modal
        title={
          modalGroup
            ? `${PENDENCY_KIND_LABEL[modalGroup.kind] ?? modalGroup.kind} (${modalGroup.items.length})`
            : ''
        }
        open={modalGroup != null}
        onCancel={() => setModalGroup(null)}
        footer={null}
        width={640}
      >
        {modalGroup && (
          <List
            size="small"
            dataSource={modalGroup.items}
            renderItem={(item) => (
              <List.Item>
                <div>
                  <Text strong>{item.title}</Text>
                  {item.detail && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>{item.detail}</Text>
                    </div>
                  )}
                </div>
              </List.Item>
            )}
          />
        )}
      </Modal>
    </>
  )
}
