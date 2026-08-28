import type { ReactNode } from 'react'
import { Col, Row, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { LANDING_PHOTOS } from '../../lib/landing-media.js'

const { Title, Paragraph } = Typography

export function LandingShowcaseSection({
  id,
  title,
  body,
  imageKey,
  reverse,
  children,
}: {
  id: string
  title: string
  body: string
  imageKey: keyof typeof LANDING_PHOTOS
  reverse?: boolean
  children: ReactNode
}) {
  const { t } = useTranslation()
  const photo = LANDING_PHOTOS[imageKey]
  return (
    <section className="landing-section landing-showcase" id={id}>
      <Row gutter={[32, 32]} align="middle">
        <Col xs={24} md={12} order={reverse ? 2 : 1}>
          <Title level={3}>{title}</Title>
          <Paragraph type="secondary" style={{ fontSize: 16 }}>{body}</Paragraph>
        </Col>
        <Col xs={24} md={12} order={reverse ? 1 : 2}>
          <div className="landing-showcase-visual">
            <img
              src={photo.src}
              alt={t(photo.altKey)}
              className="landing-showcase-photo"
              loading="lazy"
            />
            <div className="landing-showcase-mock">{children}</div>
          </div>
        </Col>
      </Row>
    </section>
  )
}
