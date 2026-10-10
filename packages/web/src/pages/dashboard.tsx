import { useEffect, useState, useMemo } from 'react'
import { subscribePatientCreateOpen } from '../lib/patient-create-bus.js'
import {
  Row,
  Col,
  Typography,
  Spin,
  Empty,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  App,
  Alert,
  Checkbox,
} from 'antd'
import { MaskedDatePicker } from '../components/ui/MaskedDatePicker.js'
import { MinorGuardianConsentFormItem } from '../components/legal/MinorGuardianConsentField.js'
import { isMinorBirthDate } from '../lib/patient-age.js'
import {
  PlusOutlined,
  FireOutlined,
  SmileOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api.js'
import type { Patient } from '../lib/api.types.js'
import { PageHeader } from '../components/ui/PageHeader.js'
import { DashboardDayToDaySection } from '../components/dashboard/DashboardDayToDaySection.js'
import { DayToDayDiscoveryHub } from '../components/dashboard/DayToDayDiscoveryHub.js'
import { PostOnboardingWelcomeBanner } from '../components/onboarding/PostOnboardingWelcomeBanner.js'
import { DashboardPeopleToolbar } from '../components/dashboard/DashboardPeopleToolbar.js'
import { DashboardPatientCard } from '../components/dashboard/DashboardPatientCard.js'
import { useAuth } from '../contexts/AuthContext.js'
import { useActiveCareCircle } from '../contexts/ActiveCareCircleContext.js'
import { reportApiClientError } from '../lib/client-errors.js'
import { useDashboardGroupMode } from '../hooks/useDashboardGroupMode.js'
import {
  groupPatientsForDashboard,
  groupByAge,
  patientCircleMeta,
  type DashboardLayoutSection,
} from '../lib/dashboard/group-patients-for-dashboard.js'
import { FAMILY_HUB_PATH } from '../lib/family-paths.js'
import { patientBirthDateFormRules } from '../lib/patient-birth-date-form-rules.js'

const { Title } = Typography

const AGE_HEADER: Record<string, { icon: React.ReactNode; color: string; i18nKey: string }> = {
  children: { icon: <SmileOutlined />, color: '#0D9488', i18nKey: 'dashboard.ageBand.children' },
  adolescents: { icon: <FireOutlined />, color: '#E11D48', i18nKey: 'dashboard.ageBand.adolescents' },
  adults: { icon: <UserSwitchOutlined />, color: '#4F46E5', i18nKey: 'dashboard.ageBand.adults' },
}

export function Dashboard() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { loading: authLoading, authUserId, configured: authConfigured } = useAuth()
  const { hasMultipleCircles, activeCircleId } = useActiveCareCircle()
  const [patients, setPatients] = useState<Patient[]>([])
  const [circleGroups, setCircleGroups] = useState<Array<{ id: string; name: string; patientIds: string[] }>>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const birthDateWatch = Form.useWatch('birthDate', form)
  const showMinorConsent = birthDateWatch
    ? isMinorBirthDate(birthDateWatch.toDate?.() ?? birthDateWatch)
    : false
  const showMarkAsSelf = birthDateWatch
    ? !isMinorBirthDate(birthDateWatch.toDate?.() ?? birthDateWatch)
    : false
  const navigate = useNavigate()

  const circleCount = circleGroups.length
  const { mode: groupMode, setMode: setGroupMode } = useDashboardGroupMode(circleCount)
  const showCareCircleField = circleGroups.length >= 2

  const load = () => {
    setLoadError(null)
    return Promise.allSettled([api.patients.list(), api.careCircles.dashboard()])
      .then(([patientsResult, circlesResult]) => {
        if (patientsResult.status === 'rejected') {
          setPatients([])
          setCircleGroups([])
          throw patientsResult.reason
        }
        setPatients(patientsResult.value)
        setCircleGroups(circlesResult.status === 'fulfilled' ? circlesResult.value : [])
      })
      .catch((err) => {
        setPatients([])
        setCircleGroups([])
        const message = err instanceof Error ? err.message : t('patient.loadListFailed')
        reportApiClientError('/patients', 0, { route: '/', message })
        setLoadError(message)
      })
  }
  useEffect(() => {
    if (authConfigured && (authLoading || !authUserId)) return
    load().finally(() => setLoading(false))
  }, [authConfigured, authLoading, authUserId])

  useEffect(() => subscribePatientCreateOpen(() => setModalOpen(true)), [])

  useEffect(() => {
    if (!modalOpen) return
    const defaultCircle =
      (hasMultipleCircles && activeCircleId) ||
      (circleGroups.length === 1 ? circleGroups[0].id : undefined)
    if (defaultCircle) {
      form.setFieldValue('careCircleId', defaultCircle)
    }
  }, [modalOpen, hasMultipleCircles, activeCircleId, circleGroups, form])

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      const birthDate = values.birthDate?.toDate?.()
      if (!birthDate || Number.isNaN(birthDate.getTime())) {
        form.setFields([{ name: 'birthDate', errors: [t('patient.form.birthDateInvalid')] }])
        return
      }
      if (isMinorBirthDate(birthDate)) {
        await api.compliance.accept({ kinds: ['minor_guardian_consent'] })
      }
      const created = await api.patients.create({
        name: values.name,
        birthDate: birthDate.toISOString(),
        gender: values.gender || undefined,
        weightKg: values.weightKg ? Number(values.weightKg) : undefined,
        heightCm: values.heightCm ? Number(values.heightCm) : undefined,
        cpf: values.cpf?.replace(/\D/g, '') || undefined,
        cns: values.cns?.replace(/\D/g, '') || undefined,
        markAsSelf: showMarkAsSelf && Boolean(values.markAsSelf),
      })
      const circleToLink =
        values.careCircleId ||
        (circleGroups.length === 1 ? circleGroups[0].id : undefined)
      if (circleToLink) {
        await api.careCircles.linkPatient(circleToLink, created.id)
      }
      message.success(t('patient.createSuccess'))
      setModalOpen(false)
      form.resetFields()
      load()
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error(err instanceof Error ? err.message : t('common.unknownError'))
    }
  }

  const circleMap = useMemo(() => {
    const map = new Map<string, { circleId: string; circleName: string }>()
    for (const g of circleGroups) {
      for (const patientId of g.patientIds) {
        map.set(patientId, { circleId: g.id, circleName: g.name })
      }
    }
    return map
  }, [circleGroups])

  const layoutSections = useMemo(
    () =>
      groupPatientsForDashboard({
        mode: groupMode,
        patients,
        circleGroups,
        hasMultipleCircles,
        activeCircleId: activeCircleId ?? null,
        unassignedTitle: t('family.circles.unassigned'),
        alphaSectionTitle: t('dashboard.alphaSectionTitle'),
      }),
    [groupMode, patients, circleGroups, hasMultipleCircles, activeCircleId, t],
  )

  const renderPatientGrid = (list: Patient[], showCircleTag: boolean) => (
    <Row gutter={[20, 20]}>
      {list.map((p) => (
        <Col xs={24} sm={12} lg={8} xl={6} key={p.id}>
          <DashboardPatientCard
            patient={p}
            onClick={() => navigate(`/patients/${p.id}`)}
            showCircleTag={showCircleTag}
            circleMeta={patientCircleMeta(p.id, circleMap)}
          />
        </Col>
      ))}
    </Row>
  )

  const renderAgeSubsections = (list: Patient[], showCircleTag: boolean) => {
    const byAge = groupByAge(list)
    return Object.entries(byAge).map(([cat, rows]) => {
      const cfg = AGE_HEADER[cat]
      if (!cfg) return null
      return (
        <div key={cat} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18, color: cfg.color }}>{cfg.icon}</span>
            <Title level={5} style={{ margin: 0, color: cfg.color }}>{t(cfg.i18nKey)}</Title>
            <Tag color={cfg.color}>{rows.length}</Tag>
          </div>
          {renderPatientGrid(rows, showCircleTag)}
        </div>
      )
    })
  }

  const renderSection = (section: DashboardLayoutSection) => {
    if (section.kind === 'family') {
      const showCircleTag = false
      const isUnassigned = section.key === 'unassigned'
      return (
        <div key={section.key} style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {!isUnassigned && <TeamOutlined style={{ fontSize: 22, color: '#4F46E5' }} />}
            <Title level={4} style={{ margin: 0 }}>{section.title}</Title>
            <Tag color={isUnassigned ? 'default' : 'geekblue'}>{section.patients.length}</Tag>
            {isUnassigned && (
              <Link to={FAMILY_HUB_PATH}>{t('family.circles.organizeInFamily')}</Link>
            )}
          </div>
          {renderAgeSubsections(section.patients, showCircleTag)}
        </div>
      )
    }

    if (section.kind === 'age') {
      const cfg = AGE_HEADER[section.category]
      if (!cfg) return null
      return (
        <div key={section.key} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 22, color: cfg.color }}>{cfg.icon}</span>
            <Title level={4} style={{ margin: 0, color: cfg.color }}>{t(cfg.i18nKey)}</Title>
            <Tag color={cfg.color}>{section.patients.length}</Tag>
          </div>
          {renderPatientGrid(section.patients, true)}
        </div>
      )
    }

    return (
      <div key={section.key} style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>{section.title}</Title>
          <Tag>{section.patients.length}</Tag>
        </div>
        {renderPatientGrid(section.patients, true)}
      </div>
    )
  }

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />

  return (
    <div>
      <PageHeader
        title={t('dashboard.peopleTitle')}
        subtitle={t('dashboard.peopleSubtitle')}
        extra={
          <Button
            type="default"
            icon={<PlusOutlined />}
            data-testid="dashboard-add-family"
            onClick={() => setModalOpen(true)}
          >
            {t('patient.addPerson')}
          </Button>
        }
      />

      <PostOnboardingWelcomeBanner />

      {patients.length === 0 && !loadError && <DayToDayDiscoveryHub hasPatients={false} />}
      {patients.length > 0 && <DashboardDayToDaySection />}

      {loadError && (
        <Alert
          type="error"
          showIcon
          message={t('patient.loadListErrorTitle')}
          description={loadError}
          action={
            <Button
              size="small"
              onClick={() => {
                setLoading(true)
                load().finally(() => setLoading(false))
              }}
            >
              {t('patient.loadListRetry')}
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <DashboardPeopleToolbar
        mode={groupMode}
        onModeChange={setGroupMode}
        visible={patients.length > 0 && !loadError}
      />

      {patients.length === 0 && !loadError ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          data-testid="dashboard-empty-family"
          description={
            <span>
              {t('patient.emptyFamily')}
              <br />
              <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, maxWidth: 420, marginInline: 'auto' }}>
                {t('patient.emptyFamilyWelcomeHint')}
              </Typography.Text>
              <Button type="link" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} style={{ marginTop: 8 }}>
                {t('patient.addPerson')}
              </Button>
            </span>
          }
          style={{ marginTop: 80 }}
        />
      ) : (
        layoutSections.map((section) => renderSection(section))
      )}

      <Modal
        title={t('patient.addPerson')}
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label={t('patient.form.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="birthDate" label={t('patient.form.birthDate')} rules={patientBirthDateFormRules(t)}>
            <MaskedDatePicker style={{ width: '100%' }} />
          </Form.Item>
          {showCareCircleField && (
            <Form.Item name="careCircleId" label={t('patient.form.careCircle')}>
              <Select
                allowClear
                placeholder={t('patient.form.careCirclePlaceholder')}
                options={circleGroups.map((g) => ({ value: g.id, label: g.name }))}
              />
            </Form.Item>
          )}
          <Form.Item name="gender" label={t('patient.form.gender')}>
            <Select
              options={[
                { value: 'male', label: t('patient.male') },
                { value: 'female', label: t('patient.female') },
              ]}
              allowClear
            />
          </Form.Item>
          <Form.Item name="weightKg" label={`${t('patient.form.weight')} (${t('patient.weight')})`}>
            <Input type="number" step="0.1" />
          </Form.Item>
          <Form.Item name="heightCm" label={`${t('patient.form.height')} (${t('patient.height')})`}>
            <Input type="number" step="0.1" />
          </Form.Item>
          <Form.Item
            name="cpf"
            label={t('patient.form.cpf')}
            rules={[
              {
                validator: (_, v) =>
                  !v || v.replace(/\D/g, '').length === 11
                    ? Promise.resolve()
                    : Promise.reject(t('patient.form.cpfInvalid')),
              },
            ]}
          >
            <Input placeholder={t('form.cpfMask')} maxLength={14} />
          </Form.Item>
          <Form.Item name="cns" label={t('patient.form.cns')}>
            <Input placeholder={t('form.cns')} maxLength={15} />
          </Form.Item>
          {showMarkAsSelf && (
            <Form.Item name="markAsSelf" valuePropName="checked" initialValue={false}>
              <Checkbox>{t('patient.markAsSelf')}</Checkbox>
            </Form.Item>
          )}
          {showMinorConsent && <MinorGuardianConsentFormItem />}
        </Form>
      </Modal>
    </div>
  )
}
