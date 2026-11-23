import type { ReactNode } from 'react'
import { Spin } from 'antd'
import './centered-loading.css'

type BlockProps = {
  size?: 'small' | 'default' | 'large'
  tip?: ReactNode
  className?: string
}

/** Spinner centralizado para página inteira (substitui margin hacks). */
export function CenteredPageLoading({ tip }: { tip?: ReactNode }) {
  return (
    <div className="centered-loading centered-loading--page" data-testid="centered-page-loading">
      <Spin size="large" tip={tip} />
    </div>
  )
}

/** Spinner centralizado em cartões, modais e blocos internos. */
export function CenteredBlockLoading({ size = 'large', tip, className }: BlockProps) {
  return (
    <div className={`centered-loading centered-loading--block${className ? ` ${className}` : ''}`}>
      <Spin size={size} tip={tip} />
    </div>
  )
}