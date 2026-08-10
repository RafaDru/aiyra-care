import { Card, Divider, Typography } from 'antd'
import {
  SyncJobHistoryCard,
  SyncJobLiveCard,
  type SyncJobHistorySnapshot,
} from '../scraper/SyncJobCardView.js'
import type { IntegrationSyncHistoryEntry } from '../../hooks/useIntegrationSyncHistory.js'
import type { SyncJobOverallStatus } from '../../lib/sync-job-progress.js'
import type { WalletDockJob } from '../scraper/WalletSyncDock.js'

const { Text } = Typography

function entryToSnapshot(entry: IntegrationSyncHistoryEntry): SyncJobHistorySnapshot {
  return {
    portalType: entry.portalType,
    status: entry.status,
    step: entry.step,
    message: entry.message,
    stepDetails: entry.stepDetails,
    finishedAt: entry.finishedAt,
    noveltyText: entry.noveltyText,
    result: entry.result,
  }
}

interface Props {
  dockJobs: WalletDockJob[]
  groupedHistory: Array<{ dateLabel: string; items: IntegrationSyncHistoryEntry[] }>
  activeHistory: IntegrationSyncHistoryEntry[]
  onJobTerminal: (jobId: string, status: SyncJobOverallStatus) => void
}

export function IntegrationsSyncSidebar({
  dockJobs,
  groupedHistory,
  activeHistory,
  onJobTerminal,
}: Props) {
  const dockLinkIds = new Set(dockJobs.map((j) => j.linkId))
  const historyWithoutDock = groupedHistory.map((g) => ({
    ...g,
    items: g.items.filter((e) => !dockLinkIds.has(e.linkId) || !e.isActive),
  })).filter((g) => g.items.length > 0)

  return (
    <div
      style={{
        width: 300,
        flexShrink: 0,
        position: 'sticky',
        top: 12,
        alignSelf: 'flex-start',
        maxHeight: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Card
        size="small"
        title="Sincronizações"
        styles={{
          body: {
            padding: '10px 12px',
            overflowY: 'auto',
            flex: 1,
            maxHeight: 'calc(100vh - 160px)',
          },
        }}
        style={{ flex: 1 }}
      >
        {dockJobs.length > 0 && (
          <>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
              Em andamento
            </Text>
            {dockJobs.map((job) => (
              <SyncJobLiveCard
                key={job.jobId}
                jobId={job.jobId}
                portalType={job.portalType}
                onTerminal={(status) => onJobTerminal(job.jobId, status)}
              />
            ))}
            <Divider style={{ margin: '12px 0' }} />
          </>
        )}

        {activeHistory.length > 0 && dockJobs.length === 0 && (
          <>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
              Em andamento
            </Text>
            {activeHistory.map((entry) => (
              entry.jobId && entry.isActive ? (
                <SyncJobLiveCard
                  key={entry.jobId}
                  jobId={entry.jobId}
                  portalType={entry.portalType}
                />
              ) : (
                <SyncJobHistoryCard key={entry.linkId} snapshot={entryToSnapshot(entry)} />
              )
            ))}
            <Divider style={{ margin: '12px 0' }} />
          </>
        )}

        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
          Últimas sincronizações
        </Text>

        {historyWithoutDock.length === 0 ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Nenhuma sincronização registrada ainda.
          </Text>
        ) : (
          historyWithoutDock.map((group) => (
            <div key={group.dateLabel} style={{ marginBottom: 10 }}>
              <Text
                strong
                style={{ fontSize: 11, display: 'block', marginBottom: 6, color: '#64748b' }}
              >
                {group.dateLabel}
              </Text>
              {group.items.map((entry) => (
                <SyncJobHistoryCard
                  key={`${entry.linkId}-${entry.finishedAt?.toISOString() ?? entry.jobId ?? 'x'}`}
                  snapshot={entryToSnapshot(entry)}
                />
              ))}
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
