import { useEffect, useRef, type ReactNode } from 'react'
import { Button, Space } from 'antd'
import { CompressOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

type Props = {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  extraActions?: ReactNode
}

export function MeasurementChartFullscreenHost({
  open,
  title,
  subtitle,
  onClose,
  children,
  extraActions,
}: Props) {
  const { t } = useTranslation()
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !hostRef.current) return

    const el = hostRef.current
    const run = async () => {
      try {
        if (document.fullscreenElement !== el) {
          await el.requestFullscreen()
        }
      } catch {
        /* fallback: fixed overlay still usable */
      }
    }
    run()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        onClose()
      }
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [open, onClose])

  const exitFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined)
    }
    onClose()
  }

  if (!open) return null

  return (
    <div ref={hostRef} className="measurement-fullscreen-host" role="dialog" aria-modal="true">
      <header className="measurement-fullscreen-host__header">
        <div>
          <div className="measurement-fullscreen-host__title">{title}</div>
          {subtitle && <div className="measurement-fullscreen-host__subtitle">{subtitle}</div>}
        </div>
        <Space>
          {extraActions}
          <Button
            type="primary"
            icon={<CompressOutlined />}
            onClick={() => exitFullscreen()}
          >
            {t('measurement.exitFullscreen')}
          </Button>
        </Space>
      </header>
      <div className="measurement-fullscreen-host__body">
        <div className="measurement-fullscreen-host__chart">{children}</div>
      </div>
    </div>
  )
}
