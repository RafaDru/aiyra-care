import { Descriptions, Space, Tag, Typography } from 'antd'
import {
  incidentApplicationLabel,
  incidentDispatchStatusLabel,
  incidentOriginLabel,
  incidentPlannedMaintenanceActive,
  INCIDENT_PLANNED_MAINTENANCE_LABEL,
  incidentPipelineLabel,
  incidentPipelineTagColor,
  incidentSourceFootnote,
  INCIDENT_LANE_LABEL,
  INCIDENT_PRIORITY_LABEL,
  INCIDENT_QUEUE_STATUS_LABEL,
} from '../ch-incident-display.js'
import { defectStatusLabel } from '../ch-defect-display.js'
import { buildDefectDeepLink, buildIncidentRefDeepLink } from '../ch-ops-deep-link.js'
import { ChCopyableRefTag } from './ChCopyableRefTag.js'
import { ChDetailSection } from './ChDetailSection.js'
import { ChPipelineTimeline } from './ChPipelineTimeline.js'
import { buildIncidentCycleSteps } from '../ch-pipeline-display.js'
import { InvestigationIdTag } from './InvestigationIdTag.js'
import { inferOpsReferenceHref } from '../ch-ops-deep-link.js'
import type { OpsAnalysisQueueItem } from '../ops.types.js'

const { Text, Paragraph, Link } = Typography

export function ChIncidentDetailBody({ row }: { row: OpsAnalysisQueueItem }) {
  const sourceNote = incidentSourceFootnote(row)
  const tierLabel =
    row.deploymentTier === 'production'
      ? 'Produção'
      : row.deploymentTier === 'preview'
        ? 'Preview'
        : row.deploymentTier

  return (
    <div style={{ maxWidth: 720 }}>
      <ChPipelineTimeline steps={buildIncidentCycleSteps(row)} title="Ciclo INC" />
      <ChDetailSection title="Resumo">
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="Título">{row.title}</Descriptions.Item>
          <Descriptions.Item label="Prioridade">
            {INCIDENT_PRIORITY_LABEL[row.priority]}
          </Descriptions.Item>
          <Descriptions.Item label="Pipeline">
            <Tag color={incidentPipelineTagColor(row)}>{incidentPipelineLabel(row)}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Atualizado">
            {new Date(row.updatedAt).toLocaleString('pt-BR')}
          </Descriptions.Item>
          <Descriptions.Item label="Contexto">
            {incidentApplicationLabel(row)} · {INCIDENT_LANE_LABEL[row.lane]} · {tierLabel}
          </Descriptions.Item>
        </Descriptions>
      </ChDetailSection>

      <ChDetailSection title="Triagem">
        <Space size={[4, 4]} wrap style={{ marginBottom: 8 }}>
          <Tag>{INCIDENT_QUEUE_STATUS_LABEL[row.status]}</Tag>
          <Tag>{incidentOriginLabel(row)}</Tag>
          {incidentPlannedMaintenanceActive(row) && (
            <Tag color="orange">{INCIDENT_PLANNED_MAINTENANCE_LABEL}</Tag>
          )}
        </Space>
        {row.errorSummary && (
          <Paragraph>
            <Text strong>Resumo:</Text> {row.errorSummary}
          </Paragraph>
        )}
        {row.remediationSummary && (
          <Paragraph>
            <Text strong>Próximo passo:</Text> {row.remediationSummary}
          </Paragraph>
        )}
        {row.analysisLastError && (
          <Paragraph type="danger">
            <Text strong>Erro na triagem:</Text> {row.analysisLastError}
          </Paragraph>
        )}
        {row.analysisArtifactPath && (
          <Paragraph>
            <Text strong>Artefato:</Text> <Text code>{row.analysisArtifactPath}</Text>
          </Paragraph>
        )}
        {row.prUrl && (
          <Paragraph>
            <Text strong>PR:</Text>{' '}
            <Link href={row.prUrl} target="_blank" rel="noreferrer">{row.prUrl}</Link>
          </Paragraph>
        )}
      </ChDetailSection>

      {row.linkedDefects && row.linkedDefects.length > 0 && (
        <ChDetailSection title="Vínculos">
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
            {row.linkedDefects.map((def) => (
              <li key={def.id} style={{ marginBottom: 6 }}>
                <Space size={6} wrap>
                  <ChCopyableRefTag
                    code={def.referenceCode ?? def.id.slice(0, 8)}
                    href={buildDefectDeepLink(def.id)}
                    compact
                  />
                  <Tag>{defectStatusLabel(def.status)}</Tag>
                </Space>
              </li>
            ))}
          </ul>
        </ChDetailSection>
      )}

      <ChDetailSection title="Dispatch">
        {row.dispatch ? (
          <>
            <Text>{incidentDispatchStatusLabel(row.dispatch.status)}</Text>
            {row.dispatch.attemptCount > 0 && (
              <Text type="secondary"> · {row.dispatch.attemptCount} tentativa(s)</Text>
            )}
            {row.dispatch.forwardedAt && (
              <div>
                <Text type="secondary">
                  Enviado em {new Date(row.dispatch.forwardedAt).toLocaleString('pt-BR')}
                </Text>
              </div>
            )}
            {row.dispatch.lastError && (
              <Paragraph type="danger" style={{ marginTop: 4, marginBottom: 0 }}>
                {row.dispatch.lastError}
              </Paragraph>
            )}
          </>
        ) : (
          <Text type="secondary">Ainda não há registro de envio para triagem.</Text>
        )}
      </ChDetailSection>

      {row.recurrenceOfReferenceCode && (
        <ChDetailSection title="Reincidência">
          <Link href={buildIncidentRefDeepLink(row.recurrenceOfReferenceCode)}>
            <ChCopyableRefTag
              code={row.recurrenceOfReferenceCode}
              href={buildIncidentRefDeepLink(row.recurrenceOfReferenceCode)}
              compact
            />
          </Link>
        </ChDetailSection>
      )}

      <ChDetailSection title="Técnico">
        {row.referenceCode && (
          <Paragraph style={{ marginBottom: 8 }}>
            <ChCopyableRefTag
              code={row.referenceCode}
              href={inferOpsReferenceHref(row.referenceCode)}
              compact
            />
          </Paragraph>
        )}
        <InvestigationIdTag investigationId={row.id} showFull showCopy />
        {sourceNote && (
          <Text type="secondary" style={{ display: 'block', marginTop: 6 }}>{sourceNote}</Text>
        )}
      </ChDetailSection>
    </div>
  )
}
