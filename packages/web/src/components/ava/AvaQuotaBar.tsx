import { Progress, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { LlmUsageQuota } from '../../lib/api.types.js'
import './ava-quota-bar.css'

interface Props {
  quota: LlmUsageQuota
  lastModel?: string | null
}

export function AvaQuotaBar({ quota, lastModel }: Props) {
  const { t } = useTranslation()
  const percent = Math.min(100, Math.max(0, quota.usagePercent))

  const strokeColor =
    quota.status === 'exhausted'
      ? '#ef4444'
      : quota.status === 'warn'
        ? { '0%': '#f59e0b', '100%': '#ef4444' }
        : { '0%': '#ff3da8', '100%': '#9333ea' }

  return (
    <div className="ava-quota-bar">
      <div className="ava-quota-bar__header">
        <Typography.Text className="ava-quota-bar__title">
          {t('ava.quotaUsageLabel')}
        </Typography.Text>
        <Typography.Text type="secondary" className="ava-quota-bar__percent">
          {percent}%
        </Typography.Text>
      </div>
      <Progress
        percent={percent}
        showInfo={false}
        size="small"
        status={quota.status === 'exhausted' ? 'exception' : undefined}
        strokeColor={strokeColor}
        trailColor="var(--ant-color-fill-secondary, rgba(0,0,0,0.06))"
        className="ava-quota-bar__progress"
      />
      <Typography.Text type="secondary" className="ava-quota-bar__detail">
        {t('ava.quotaUsageDetail', {
          credits: quota.creditsEquivalentRemaining,
          tokens: quota.totalTokensRemaining,
        })}
        {lastModel ? ` · ${lastModel}` : ''}
      </Typography.Text>
    </div>
  )
}
