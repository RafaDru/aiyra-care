import { useState, type ReactNode } from 'react'
import { Typography } from 'antd'

const { Text } = Typography

export function LandingScreenshot({
  src,
  alt,
  fallback,
}: {
  src: string
  alt: string
  fallback?: ReactNode
}) {
  const [failed, setFailed] = useState(false)

  if (failed && fallback) {
    return <div className="landing-screenshot-fallback">{fallback}</div>
  }

  return (
    <img
      src={src}
      alt={alt}
      className="landing-screenshot"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

export function LandingScreenshotFrame({
  title,
  children,
}: {
  title?: string
  children: ReactNode
}) {
  return (
    <div className="landing-screenshot-frame">
      {title && (
        <Text type="secondary" className="landing-screenshot-frame-title">{title}</Text>
      )}
      <div className="landing-screenshot-frame-body">{children}</div>
    </div>
  )
}
