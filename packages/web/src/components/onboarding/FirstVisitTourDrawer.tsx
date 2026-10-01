import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Drawer, Space, Steps, Typography } from 'antd'
import {
  TeamOutlined,
  UserAddOutlined,
  ThunderboltOutlined,
  CommentOutlined,
} from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext.js'
import { useAvaPatientLens } from '../ava/useAvaPatientLens.js'
import {
  isFirstVisitTourCompleted,
  markFirstVisitTourCompleted,
} from '../../lib/first-visit-tour-storage.js'
import { trackProductEvent } from '../../lib/product-events.js'
import { requestQuickCaptureOpen } from '../../lib/quick-capture-bus.js'
import { requestPatientCreateOpen } from '../../lib/patient-create-bus.js'
import { requestAvaOpen } from '../../lib/ava-dock-bus.js'
import { COMPLIANCE_ACCEPT_PATH } from '../../lib/legal-paths.js'

const { Paragraph, Text } = Typography

const STEP_KEYS = ['family', 'addPerson', 'today', 'ava'] as const
type StepKey = typeof STEP_KEYS[number]

const STEP_ICONS = [
  <TeamOutlined />,
  <UserAddOutlined />,
  <ThunderboltOutlined />,
  <CommentOutlined />,
]

const BLOCKED_PREFIXES = ['/login', '/onboarding', COMPLIANCE_ACCEPT_PATH, '/invite']

function isBlockedRoute(pathname: string): boolean {
  return BLOCKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/** Guia leve de primeiros passos — drawer dismissível após onboarding. */
export function FirstVisitTourDrawer() {
  const { t } = useTranslation()
  const { configured, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { patients, patientId, loading } = useAvaPatientLens()

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  const shouldOffer = useMemo(() => {
    if (!configured || !user || loading) return false
    if (isFirstVisitTourCompleted()) return false
    if (isBlockedRoute(location.pathname)) return false
    return true
  }, [configured, user, loading, location.pathname])

  useEffect(() => {
    if (!shouldOffer) return
    const timer = window.setTimeout(() => setOpen(true), 600)
    return () => window.clearTimeout(timer)
  }, [shouldOffer])

  const completeTour = useCallback((reason: 'finished' | 'dismissed') => {
    markFirstVisitTourCompleted()
    trackProductEvent('first_visit_tour_completed', {
      step: reason,
      patient_count: patients.length,
    })
    setOpen(false)
  }, [patients.length])

  const runStepAction = useCallback((key: StepKey) => {
    switch (key) {
      case 'family':
        navigate('/family')
        break
      case 'addPerson':
        navigate('/')
        window.setTimeout(() => requestPatientCreateOpen(), 150)
        break
      case 'today':
        requestQuickCaptureOpen({ patientId: patientId ?? undefined })
        break
      case 'ava':
        if (patientId) {
          requestAvaOpen({ patientId, initialMessage: t('firstVisitTour.avaSeedMessage') })
        }
        break
      default:
        break
    }
  }, [navigate, patientId, t])

  const steps = STEP_KEYS.map((key, index) => ({
    key,
    title: t(`firstVisitTour.steps.${key}.title`),
    description: t(`firstVisitTour.steps.${key}.description`),
    icon: STEP_ICONS[index],
    disabled: key === 'ava' && !patientId,
  }))

  const currentKey = STEP_KEYS[step]
  const isLastStep = step >= STEP_KEYS.length - 1

  return (
    <Drawer
      title={t('firstVisitTour.title')}
      placement="right"
      width={360}
      open={open}
      onClose={() => completeTour('dismissed')}
      data-testid="first-visit-tour-drawer"
      extra={
        <Button type="link" size="small" onClick={() => completeTour('dismissed')}>
          {t('firstVisitTour.dismiss')}
        </Button>
      }
      footer={(
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            {t('firstVisitTour.back')}
          </Button>
          <Space>
            <Button onClick={() => runStepAction(currentKey)}>
              {t(`firstVisitTour.actions.${currentKey}`)}
            </Button>
            <Button
              type="primary"
              onClick={() => {
                if (isLastStep) {
                  completeTour('finished')
                  return
                }
                setStep((s) => Math.min(STEP_KEYS.length - 1, s + 1))
              }}
            >
              {isLastStep ? t('firstVisitTour.complete') : t('firstVisitTour.next')}
            </Button>
          </Space>
        </Space>
      )}
    >
      <Paragraph type="secondary" style={{ marginTop: 0 }}>
        {t('firstVisitTour.subtitle')}
      </Paragraph>
      {patients.length === 0 && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
          {t('firstVisitTour.noPatientsHint')}
        </Text>
      )}
      <Steps
        direction="vertical"
        size="small"
        current={step}
        onChange={setStep}
        items={steps.map((item) => ({
          title: item.title,
          description: item.description,
          icon: item.icon,
          disabled: item.disabled,
        }))}
      />
    </Drawer>
  )
}
