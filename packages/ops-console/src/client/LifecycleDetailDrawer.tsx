import { useEffect, useState } from 'react'
import { Drawer, Empty, Spin, Table, Tag, Typography } from 'antd'
import { opsApi } from './api.js'
import { OpsMarkdown } from './components/OpsMarkdown.js'
import type { EpicDetailPayload, FeatureMarkdownPayload } from './ops.types.js'

const { Text, Paragraph } = Typography

const STATUS_COLOR: Record<string, string> = {
  done: 'success',
  in_progress: 'processing',
  planned: 'default',
  blocked: 'error',
}

export type LifecycleDrawerState =
  | { kind: 'epic'; epicId: string }
  | { kind: 'feature'; featureId: string; itemDetail?: string; itemTitle?: string }
  | null

export function LifecycleDetailDrawer({
  state,
  onClose,
  onOpenFeature,
}: {
  state: LifecycleDrawerState
  onClose: () => void
  onOpenFeature: (featureId: string, meta?: { itemTitle?: string; itemDetail?: string }) => void
}) {
  const [epic, setEpic] = useState<EpicDetailPayload | null>(null)
  const [feature, setFeature] = useState<FeatureMarkdownPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!state) {
      setEpic(null)
      setFeature(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const load = async () => {
      try {
        if (state.kind === 'epic') {
          setFeature(null)
          setEpic(await opsApi.productLifecycleEpic(state.epicId))
        } else {
          setEpic(null)
          setFeature(await opsApi.productLifecycleFeature(state.featureId))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [state])

  const open = state != null
  const title =
    state?.kind === 'epic'
      ? epic?.title ?? 'Épico'
      : state?.itemTitle ?? feature?.title ?? 'Feature'

  const itemDetail = state?.kind === 'feature' ? state.itemDetail : undefined

  return (
    <Drawer
      title={title}
      width={Math.min(720, window.innerWidth - 24)}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      {loading && <Spin />}
      {error && <Text type="danger">{error}</Text>}

      {state?.kind === 'epic' && epic && !loading && (
        <div className="ops-drawer-stack">
          {epic.summary && <Paragraph>{epic.summary}</Paragraph>}
          <Text type="secondary">
            {epic.priority} · {epic.category} · {epic.statusLabel ?? epic.status}
          </Text>
          <Table
            size="small"
            style={{ marginTop: 16 }}
            pagination={false}
            rowKey="id"
            dataSource={epic.items}
            onRow={(row) => ({
              className: 'ops-row-clickable',
              onClick: () => onOpenFeature(row.id, { itemTitle: row.title, itemDetail: row.detail }),
            })}
            columns={[
              {
                title: 'Status',
                dataIndex: 'status',
                width: 110,
                render: (s: string) => <Tag color={STATUS_COLOR[s] ?? 'default'}>{s}</Tag>,
              },
              { title: 'Item', dataIndex: 'title' },
              {
                title: 'Detalhe',
                dataIndex: 'detail',
                ellipsis: true,
                render: (d?: string) => d ?? '—',
              },
            ]}
          />
        </div>
      )}

      {state?.kind === 'feature' && feature && !loading && (
        <div className="ops-drawer-stack">
          {itemDetail && (
            <Paragraph>
              <Text strong>Roadmap:</Text> {itemDetail}
            </Paragraph>
          )}
          <Text type="secondary" style={{ fontSize: 12 }}>{feature.doc}</Text>
          <OpsMarkdown content={feature.markdown} />
        </div>
      )}

      {state?.kind === 'feature' && !feature && !loading && !error && (
        <Empty description="Card não encontrado no índice" />
      )}
    </Drawer>
  )
}
