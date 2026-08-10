import { Card, Space } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import { SyncJobLiveCard } from './SyncJobCardView.js'
import type { SyncJobOverallStatus } from '../../lib/sync-job-progress.js'

export interface WalletDockJob {
  jobId: string
  linkId: string
  portalType: import('../../lib/sync-portal-profile.js').SyncablePortalType
}

interface Props {
  jobs: WalletDockJob[]
  onJobTerminal: (jobId: string, status: SyncJobOverallStatus) => void
}

export function WalletSyncDock({ jobs, onJobTerminal }: Props) {
  if (!jobs.length) return null

  return (
    <div
      style={{
        width: 300,
        flexShrink: 0,
        position: 'sticky',
        top: 12,
        alignSelf: 'flex-start',
      }}
    >
      <Card
        size="small"
        title={
          <Space>
            <LoadingOutlined spin />
            <span>Sincronizando ({jobs.length})</span>
          </Space>
        }
        styles={{ body: { padding: '8px 10px', maxHeight: 'min(70vh, 640px)', overflowY: 'auto' } }}
      >
        {jobs.map((job) => (
          <SyncJobLiveCard
            key={job.jobId}
            jobId={job.jobId}
            portalType={job.portalType}
            onTerminal={(status) => onJobTerminal(job.jobId, status)}
          />
        ))}
      </Card>
    </div>
  )
}
