import type { CSSProperties, ReactNode } from 'react'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  LockOutlined,
  WarningOutlined,
} from '@ant-design/icons'

export type StatusTagVariant =
  | 'success'
  | 'attention'
  | 'danger'
  | 'info'
  | 'neutral'

const ICONS: Record<StatusTagVariant, ReactNode> = {
  success: <CheckCircleOutlined aria-hidden />,
  attention: <LockOutlined aria-hidden />,
  danger: <CloseCircleOutlined aria-hidden />,
  info: <InfoCircleOutlined aria-hidden />,
  neutral: <ExclamationCircleOutlined aria-hidden />,
}

interface StatusTagProps {
  variant: StatusTagVariant
  children: ReactNode
  /** Override icon (e.g. WarningOutlined for partial sync). */
  icon?: ReactNode
  className?: string
}

/**
 * Tag de status com ícone + texto (não depende só de cor).
 * Contraste melhor que `Tag color="warning"` do Ant Design com amarelo claro.
 */
export function StatusTag({ variant, children, icon, className }: StatusTagProps) {
  const mergedClass = ['status-tag', `status-tag--${variant}`, className].filter(Boolean).join(' ')
  return (
    <span className={mergedClass}>
      <span className="status-tag__icon">{icon ?? ICONS[variant]}</span>
      <span className="status-tag__label">{children}</span>
    </span>
  )
}

export function SessionStatusTag({ ready }: { ready: boolean }) {
  if (ready) {
    return <StatusTag variant="success">Conectado</StatusTag>
  }
  return <StatusTag variant="attention">Login necessário</StatusTag>
}

export function SyncOverallIcon({
  status,
  style,
  className: extraClass,
}: {
  status: 'running' | 'success' | 'partial' | 'failed'
  style?: CSSProperties
  className?: string
}) {
  const className = ['sync-status-icon', `sync-status-icon--${status}`, extraClass].filter(Boolean).join(' ')
  if (status === 'running') return <LoadingOutlined spin className={className} style={style} aria-hidden />
  if (status === 'success') return <CheckCircleOutlined className={className} style={style} aria-hidden />
  if (status === 'partial') return <WarningOutlined className={className} style={style} aria-hidden />
  return <CloseCircleOutlined className={className} style={style} aria-hidden />
}
