import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Tabs, Card, Avatar, Spin, Typography, Button, Tag, Popconfirm, App, Modal, Form, Input, Select, Descriptions, Divider, Space, Segmented, Upload, Badge } from 'antd'
import { MaskedDatePicker } from '../../components/ui/MaskedDatePicker.js'
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined, ManOutlined, WomanOutlined, UserOutlined, LinkOutlined, IdcardOutlined, FileProtectOutlined, HistoryOutlined, SyncOutlined, ApiOutlined, SafetyCertificateOutlined, MedicineBoxOutlined, FolderOutlined, CalendarOutlined, PhoneOutlined, UploadOutlined } from '@ant-design/icons'
import { SyncProgressModal } from '../../components/scraper/SyncProgressModal.js'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api.js'
import type { Patient, IntegrationLink } from '../../lib/api.types.js'
import { MeasurementsTab } from './tabs/MeasurementsTab.js'
import { CareReminderBanner } from '../../components/measurements/CareReminderBanner.js'
import { FamilySupportPanel } from '../../components/family-support/FamilySupportPanel.js'
import { useCareReminderNotifications } from '../../hooks/useCareReminderNotifications.js'
import { usePatientDomainFresh } from '../../hooks/useAccountFreshness.js'
import { markDomainSeen } from '../../lib/account-freshness.js'
import type { CareReminderRow } from '../../lib/api.types.js'
import { VaccinesTab } from './tabs/VaccinesTab.js'
import { MedicationsTab } from './tabs/MedicationsTab.js'
import { AllergiesTab } from './tabs/AllergiesTab.js'
import { ExamsTab } from './tabs/ExamsTab.js'
import { DocumentsTab } from './tabs/DocumentsTab.js'
import { PersonalDocumentsTab } from './tabs/PersonalDocumentsTab.js'
import { MedicalRecordsTab } from './tabs/MedicalRecordsTab.js'
import { DiagnosesTab } from './tabs/DiagnosesTab.js'
import { AuthorizationsTab } from './tabs/AuthorizationsTab.js'
import { WalletCardsTab } from './tabs/WalletCardsTab.js'
import { CoverageTab } from './tabs/CoverageTab.js'
import { IntegrationsTab, type IntegrationsTabHandle } from './tabs/IntegrationsTab.js'
import { AgendaTab } from './tabs/AgendaTab.js'
import { PatientContextPanel } from '../../components/patient/PatientContextPanel.js'
import { HealthThreadsPanel } from '../../components/patient/HealthThreadsPanel.js'
import { PatientAccessGrantsDrawer } from '../../components/family/PatientAccessGrantsDrawer.js'
import { useAuth } from '../../contexts/AuthContext.js'
import {
  SECTION_TABS,
  resolvePatientNav,
  tabToSection,
  defaultTabForSection,
  isPatientTabKey,
  PATIENT_SECTIONS,
  type PatientSection,
  type PatientTabKey,
} from '../../lib/patient-navigation.js'
import '../../components/patient/patient-basic-summary.css'
import '../../components/patient/patient-detail-nav.css'
import '../../components/ava/ava-dock.css'

const { Title, Text } = Typography

const CATEGORY_LABEL: Record<string, string> = {
  children: 'Criança',
  adolescents: 'Adolescente',
  adults: 'Adulto',
}

const SECTION_ICONS: Record<PatientSection, ReactNode> = {
  overview: <UserOutlined />,
  clinical: <MedicineBoxOutlined />,
  plan: <IdcardOutlined />,
  files: <FolderOutlined />,
}

const TAB_DATA_DOMAIN: Partial<Record<PatientTabKey, string>> = {
  agenda: 'timeline',
  wallet: 'wallet',
  exams: 'exams',
  records: 'documents',
  authorizations: 'wallet',
  documents: 'documents',
}

function freshTabLabel(fresh: boolean, children: ReactNode): ReactNode {
  return fresh ? <Badge dot>{children}</Badge> : children
}

export function PatientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { message } = App.useApp()
  const { t } = useTranslation()
  const { loading: authLoading, authUserId, configured: authConfigured } = useAuth()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [parents, setParents] = useState<Patient[]>([])
  const [children, setChildren] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm] = Form.useForm()
  const [allPatients, setAllPatients] = useState<Patient[]>([])
  const [integrationLinks, setIntegrationLinks] = useState<IntegrationLink[]>([])
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [linkPortal, setLinkPortal] = useState<'unimed' | 'amil' | 'bradesco_saude' | 'mater_dei' | 'hermes_pardini'>('unimed')
  const [linkForm] = Form.useForm()
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [syncJobId, setSyncJobId] = useState<string | null>(null)
  const [syncPortalType, setSyncPortalType] = useState<'unimed' | 'amil' | 'mater_dei' | 'hermes_pardini' | null>(null)
  const [openThreadId, setOpenThreadId] = useState<string | null>(null)
  const [monitoringAction, setMonitoringAction] = useState<{
    kind: 'vitals' | 'medication'
    reminderId: string
    healthThreadId?: string | null
  } | null>(null)
  const integrationsTabRef = useRef<IntegrationsTabHandle>(null)

  useCareReminderNotifications(patient?.id ?? '', Boolean(patient?.id))

  const walletFresh = usePatientDomainFresh(patient?.id, 'wallet')
  const examsFresh = usePatientDomainFresh(patient?.id, 'exams')
  const recordsFresh = usePatientDomainFresh(patient?.id, 'documents')
  const documentsFresh = usePatientDomainFresh(patient?.id, 'documents')
  const agendaFresh = usePatientDomainFresh(patient?.id, 'timeline')

  const { section: activeSection, tab: activeTab } = resolvePatientNav(
    searchParams.get('section'),
    searchParams.get('tab'),
  )
  const sectionTabKeys = SECTION_TABS[activeSection]
  const highlightEntityId = searchParams.get('highlight')
  const highlightCard = searchParams.get('card')

  const setActiveTab = useCallback((key: string) => {
    if (!isPatientTabKey(key)) return
    if (patient?.id) {
      const domain = TAB_DATA_DOMAIN[key]
      if (domain) markDomainSeen(patient.id, domain)
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      const section = tabToSection(key)
      if (section === 'overview' && key === 'basic') {
        next.delete('section')
        next.delete('tab')
      } else {
        next.set('section', section)
        if (key === 'basic') next.delete('tab')
        else next.set('tab', key)
      }
      if (key !== 'wallet') next.delete('card')
      return next
    }, { replace: true })
  }, [setSearchParams, patient?.id])

  const setActiveSection = useCallback((section: PatientSection) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      const prevTab = prev.get('tab')
      const candidate = isPatientTabKey(prevTab) ? prevTab : 'basic'
      const tab: PatientTabKey = SECTION_TABS[section].includes(candidate) ? candidate : defaultTabForSection(section)
      if (section === 'overview' && tab === 'basic') {
        next.delete('section')
        next.delete('tab')
      } else {
        next.set('section', section)
        if (tab === 'basic') next.delete('tab')
        else next.set('tab', tab)
      }
      if (tab !== 'wallet') next.delete('card')
      return next
    }, { replace: true })
  }, [setSearchParams])

  const openWalletCard = useCallback((portalKey: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('section', 'plan')
      next.set('tab', 'wallet')
      next.set('card', portalKey)
      return next
    }, { replace: true })
  }, [setSearchParams])

  const load = () => {
    if (!id) return
    Promise.all([
      api.patients.get(id),
      api.patients.list(),
      api.integrationLinks.list(id),
    ]).then(([p, list, links]) => {
      setPatient(p)
      setAllPatients(list)
      setParents(list.filter(x => p.parentIds.includes(x.id)))
      setChildren(list.filter(x => x.parentIds.includes(p.id)))
      setIntegrationLinks(links)
    }).catch((err) => {
      const msg = err instanceof Error ? err.message : t('patient.notFound')
      message.error(msg)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!id) return
    if (authConfigured && (authLoading || !authUserId)) return
    load()
  }, [id, authLoading, authUserId, authConfigured])

  const SYNCABLE_PORTALS = new Set(['unimed', 'amil', 'mater_dei', 'hermes_pardini'])
  const CPF_LOGIN_PORTALS = new Set(['amil', 'bradesco_saude', 'mater_dei', 'hermes_pardini'])

  const formatCpf = (cpf: string) => {
    const digits = cpf.replace(/\D/g, '')
    if (digits.length !== 11) return cpf
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  }

  const openLinkModal = async (portal: 'unimed' | 'amil' | 'bradesco_saude' | 'mater_dei' | 'hermes_pardini') => {
    setLinkPortal(portal)
    linkForm.resetFields()
    setLinkModalOpen(true)

    const defaults: { email?: string; cardNumber?: string } = {}
    if (CPF_LOGIN_PORTALS.has(portal) && patient?.cpf) {
      defaults.email = formatCpf(patient.cpf)
    }

    if (id) {
      try {
        const memberships = await api.planMemberships.list(id)
        const match = memberships.find((m) =>
          m.plan?.operator === portal || m.source === portal,
        )
        if (match?.memberNumber) defaults.cardNumber = match.memberNumber
      } catch {
        // optional prefill — ignore
      }
    }

    if (defaults.email || defaults.cardNumber) {
      linkForm.setFieldsValue(defaults)
    }
  }

  const startSync = async (
    linkId: string,
    portalTypeHint?: string,
    opts?: { silent?: boolean; force?: boolean },
  ) => {
    const link = integrationLinks.find((l) => l.id === linkId)
    const portalType = portalTypeHint ?? link?.portalType
    if (!opts?.silent) {
      setSyncingId(linkId)
      if (portalType && SYNCABLE_PORTALS.has(portalType)) {
        setSyncPortalType(portalType as 'unimed' | 'amil' | 'mater_dei' | 'hermes_pardini')
      }
    }
    try {
      const r = await api.integrationLinks.sync(linkId, { silent: opts?.silent, force: opts?.force })
      if (r.skipped) {
        if (!opts?.silent && r.reason === 'session_required') {
          message.info('Conecte ao portal com Sincronizar (primeira vez ou sessão expirada)')
        }
        return
      }
      if (!opts?.silent) {
        setSyncJobId(r.jobId!)
      }
    } catch (e) {
      if (opts?.silent) {
        const msg = e instanceof Error ? e.message : String(e)
        if (/login|autentic|chrome|cdp|sess[aã]o|credenciais|portal do cliente|abra o/i.test(msg)) {
          message.warning('Sincronização silenciosa falhou — pode ser necessário abrir o portal ou o Chrome (CDP)')
        }
        console.warn('Silent sync failed', e)
      } else {
        message.error(e instanceof Error ? e.message : 'Erro na sincronização')
        setSyncPortalType(null)
      }
    } finally {
      if (!opts?.silent) setSyncingId(null)
    }
  }

  const handleEditOpen = () => {
    if (!patient) return
    editForm.setFieldsValue({
      name: patient.name,
      birthDate: patient.birthDate ? dayjs(patient.birthDate) : undefined,
      gender: patient.gender,
      bloodType: patient.bloodType,
      weightKg: patient.weightKg,
      heightCm: patient.heightCm,
      parentIds: patient.parentIds,
      cpf: patient.cpf,
      cns: patient.cns,
      photoUrl: patient.photoUrl,
    })
    setEditOpen(true)
  }

  const handleEditSave = async () => {
    try {
      const values = await editForm.validateFields()
      await api.patients.update(id!, {
        name: values.name,
        birthDate: values.birthDate?.toISOString(),
        gender: values.gender || undefined,
        bloodType: values.bloodType || undefined,
        weightKg: values.weightKg ? Number(values.weightKg) : undefined,
        heightCm: values.heightCm ? Number(values.heightCm) : undefined,
        parentIds: values.parentIds || [],
        cpf: values.cpf?.replace(/\D/g, '') || undefined,
        cns: values.cns?.replace(/\D/g, '') || undefined,
        photoUrl: values.photoUrl?.trim() || undefined,
      })
      message.success('Dados atualizados')
      setEditOpen(false)
      load()
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error(err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />
  if (!patient) return <Text type="danger">{t('patient.notFound')}</Text>

  const age = calcAge(patient.birthDate, t)

  const tabLabel = (key: PatientTabKey): ReactNode => {
    switch (key) {
      case 'basic': return <><UserOutlined /> {t('tabs.basic')}</>
      case 'agenda': return freshTabLabel(agendaFresh, <><CalendarOutlined /> {t('tabs.agenda')}</>)
      case 'personal-documents': return <><FileProtectOutlined /> {t('tabs.personalDocuments')}</>
      case 'wallet': return freshTabLabel(walletFresh, <><IdcardOutlined /> {t('tabs.wallet')}</>)
      case 'coverage': return <><SafetyCertificateOutlined /> {t('tabs.coverage')}</>
      case 'integrations': return <><ApiOutlined /> {t('tabs.integrations')}</>
      case 'growth': return t('tabs.growth')
      case 'vaccines': return t('tabs.vaccines')
      case 'medications': return t('tabs.medications')
      case 'allergies': return t('tabs.allergies')
      case 'exams': return freshTabLabel(examsFresh, t('tabs.exams'))
      case 'records': return freshTabLabel(recordsFresh, t('tabs.records'))
      case 'authorizations': return freshTabLabel(walletFresh, t('tabs.authorizations'))
      case 'diagnoses': return t('tabs.diagnoses')
      case 'documents': return freshTabLabel(documentsFresh, t('tabs.documents'))
    }
  }

  const renderTabContent = (key: PatientTabKey) => {
    switch (key) {
      case 'basic':
        return (
          <>
            <div className="patient-basic-summary-row">
              <div className="patient-basic-summary-row__clinical">
                <PatientContextPanel patientId={patient.id} onOpenThread={setOpenThreadId} />
              </div>
              <div className="patient-basic-summary-row__threads">
                <HealthThreadsPanel
                  patientId={patient.id}
                  layout="sidebar"
                  openThreadId={openThreadId}
                  onOpenThreadIdChange={setOpenThreadId}
                />
              </div>
            </div>
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="Nome">{patient.name}</Descriptions.Item>
              <Descriptions.Item label="Data de Nascimento">{patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('pt-BR') : '-'}</Descriptions.Item>
              <Descriptions.Item label="Sexo">{patient.gender === 'male' ? t('patient.male') : patient.gender === 'female' ? t('patient.female') : '-'}</Descriptions.Item>
              <Descriptions.Item label="Tipo Sanguíneo">{patient.bloodType || '-'}</Descriptions.Item>
              <Descriptions.Item label="Peso">{patient.weightKg ? `${patient.weightKg} ${t('patient.weight')}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="Altura">{patient.heightCm ? `${patient.heightCm} ${t('patient.height')}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="CPF">{patient.cpf ? `${patient.cpf.slice(0, 3)}.${patient.cpf.slice(3, 6)}.${patient.cpf.slice(6, 9)}-${patient.cpf.slice(9)}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="CNS">{patient.cns || '-'}</Descriptions.Item>
              <Descriptions.Item label="Idade">{age}</Descriptions.Item>
              <Descriptions.Item label="Categoria">
                <Tag color="geekblue">{CATEGORY_LABEL[patient.ageCategory] || patient.ageCategory}</Tag>
              </Descriptions.Item>
            </Descriptions>
            {(parents.length > 0 || children.length > 0) && (
              <>
                <Divider><LinkOutlined /> Relações Familiares</Divider>
                {parents.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>Pais/Responsáveis:</Text>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      {parents.map((p) => (
                        <Tag key={p.id} color="purple" style={{ cursor: 'pointer' }} onClick={() => navigate(`/patients/${p.id}`)}>
                          {p.name}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}
                {children.length > 0 && (
                  <div>
                    <Text strong>Filhos:</Text>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      {children.map((p) => (
                        <Tag key={p.id} color="cyan" style={{ cursor: 'pointer' }} onClick={() => navigate(`/patients/${p.id}`)}>
                          {p.name}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <Divider />
            <Space>
              <Button type="primary" icon={<EditOutlined />} onClick={handleEditOpen}>Editar Dados</Button>
            </Space>
          </>
        )
      case 'agenda':
        return <AgendaTab patientId={patient.id} />
      case 'personal-documents':
        return <PersonalDocumentsTab patientId={patient.id} />
      case 'wallet':
        return (
          <WalletCardsTab
            patient={patient}
            links={integrationLinks}
            linkedChildrenCount={children.length}
            highlightCard={highlightCard}
            onCardUpdated={load}
          />
        )
      case 'coverage':
        return (
          <CoverageTab
            patient={patient}
            links={integrationLinks}
            onViewCard={openWalletCard}
          />
        )
      case 'integrations':
        return (
          <IntegrationsTab
            ref={integrationsTabRef}
            patient={patient}
            links={integrationLinks}
            onRemoved={load}
            onLinkPortal={(portal) => { void openLinkModal(portal) }}
            onCardUpdated={load}
            linkedChildrenCount={children.length}
          />
        )
      case 'growth':
        return (
          <MeasurementsTab
            patientId={patient.id}
            patientName={patient.name}
            birthDate={patient.birthDate}
            gender={patient.gender}
            monitoringAction={monitoringAction}
            onMonitoringActionHandled={() => setMonitoringAction(null)}
          />
        )
      case 'vaccines':
        return <VaccinesTab patientId={patient.id} />
      case 'medications':
        return <MedicationsTab patientId={patient.id} />
      case 'allergies':
        return <AllergiesTab patientId={patient.id} />
      case 'exams':
        return <ExamsTab patientId={patient.id} highlightEntityId={highlightEntityId} />
      case 'records':
        return <MedicalRecordsTab patientId={patient.id} highlightEntityId={highlightEntityId} />
      case 'authorizations':
        return <AuthorizationsTab patientId={patient.id} highlightEntityId={highlightEntityId} />
      case 'diagnoses':
        return <DiagnosesTab patientId={patient.id} />
      case 'documents':
        return <DocumentsTab patientId={patient.id} onPatientUpdated={load} onOpenExamsTab={() => setActiveTab('exams')} />
    }
  }

  const subTabItems = sectionTabKeys.map((key) => ({
    key,
    label: tabLabel(key),
    children: <div style={{ padding: 24 }}>{renderTabContent(key)}</div>,
  }))

  const sectionOptions = PATIENT_SECTIONS.map((section) => ({
    value: section,
    label: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {SECTION_ICONS[section]}
        {t(`sections.${section}`)}
      </span>
    ),
  }))

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginBottom: 16 }}>
        {t('common.back')}
      </Button>

      <Card style={{ borderRadius: 16, marginBottom: 20, overflow: 'clip' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <Avatar size={96} src={patient.photoUrl} style={{ backgroundColor: patient.gender === 'female' ? '#EC4899' : '#4F46E5', fontSize: 40 }}>
            {patient.name.charAt(0).toUpperCase()}
          </Avatar>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Title level={4} style={{ margin: 0 }}>{patient.name}</Title>
              <Button
                size="small"
                danger
                type="primary"
                icon={<PhoneOutlined />}
                onClick={() => navigate(`/emergency?patientId=${patient.id}`)}
              >
                {t('nav.emergency')}
              </Button>
              <Button size="small" icon={<EditOutlined />} onClick={handleEditOpen} />
              <PatientAccessGrantsDrawer patientId={patient.id} patientName={patient.name} />
              {patient.isOwner !== false && (
              <Popconfirm title={t('patient.deleteConfirm')} onConfirm={async () => { try { await api.patients.delete(patient.id); message.success('OK'); navigate('/') } catch (e) { message.error(e instanceof Error ? e.message : 'Erro ao excluir') } }}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
              )}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Tag>{age}</Tag>
              <Tag color="geekblue">{CATEGORY_LABEL[patient.ageCategory] || patient.ageCategory}</Tag>
              {patient.gender === 'male' && <Tag icon={<ManOutlined />} color="blue">{t('patient.male')}</Tag>}
              {patient.gender === 'female' && <Tag icon={<WomanOutlined />} color="pink">{t('patient.female')}</Tag>}
              {patient.weightKg && <Tag color="green">{patient.weightKg} {t('patient.weight')}</Tag>}
              {patient.heightCm && <Tag color="cyan">{patient.heightCm} {t('patient.height')}</Tag>}
              {patient.bloodType && <Tag color="purple">{t('patient.bloodType')} {patient.bloodType}</Tag>}
            </div>
          </div>
        </div>
      </Card>

      <CareReminderBanner
        patientId={patient.id}
        onMeasure={(r: CareReminderRow) => {
          setMonitoringAction({ kind: 'vitals', reminderId: r.id, healthThreadId: r.healthThreadId })
          setActiveTab('growth')
        }}
        onMedication={(r: CareReminderRow) => {
          setMonitoringAction({ kind: 'medication', reminderId: r.id, healthThreadId: r.healthThreadId })
          setActiveTab('growth')
        }}
        onSusReimport={async (r: CareReminderRow) => {
          try {
            const result = await api.patients.conectesusSync(patient.id)
            await api.careReminders.complete(r.id)
            const parts = [
              result.importedVaccines ? `${result.importedVaccines} vacinas` : null,
              result.importedExams ? `${result.importedExams} exames` : null,
            ].filter(Boolean)
            if (result.skipped === 'session_required') {
              message.warning('Faça login gov.br em Integrações antes de reimportar')
              setActiveTab('integrations')
            } else if (parts.length) {
              message.success(`SUS: importados ${parts.join(' e ')}`)
            } else {
              message.info('SUS: nenhum dado novo')
            }
            load()
          } catch (e) {
            message.error(e instanceof Error ? e.message : 'Erro ao reimportar SUS')
          }
        }}
      />

      <FamilySupportPanel patientId={patient.id} />

      <Card style={{ borderRadius: 16, overflow: 'visible' }} styles={{ body: { padding: 0, overflow: 'visible' } }}>
        {sectionTabKeys.length > 1 ? (
          <Tabs
            className="patient-sub-tabs"
            size="large"
            activeKey={activeTab}
            onChange={setActiveTab}
            destroyInactiveTabPane
            items={subTabItems}
            renderTabBar={(props, DefaultTabBar) => (
              <div className="patient-detail-sticky-nav">
                <div className="patient-section-nav">
                  <Segmented
                    block
                    size="large"
                    value={activeSection}
                    onChange={(value) => setActiveSection(value as PatientSection)}
                    options={sectionOptions}
                  />
                </div>
                <DefaultTabBar {...props} />
              </div>
            )}
          />
        ) : (
          <>
            <div className="patient-detail-sticky-nav">
              <div className="patient-section-nav">
                <Segmented
                  block
                  size="large"
                  value={activeSection}
                  onChange={(value) => setActiveSection(value as PatientSection)}
                  options={sectionOptions}
                />
              </div>
            </div>
            <div style={{ padding: 24 }}>{renderTabContent(activeTab)}</div>
          </>
        )}
      </Card>

      <Modal title={`Vincular ${
        linkPortal === 'unimed' ? 'Unimed BH'
          : linkPortal === 'amil' ? 'Amil'
            : linkPortal === 'mater_dei' ? 'Meu Mater Dei'
              : linkPortal === 'hermes_pardini' ? 'Grupo Fleury — Precision Care'
              : 'Bradesco Saúde'
      }`} open={linkModalOpen} confirmLoading={syncingId !== null} onOk={async () => {
        try {
          const values = await linkForm.validateFields()
          const login = CPF_LOGIN_PORTALS.has(linkPortal)
            ? String(values.email || '').replace(/\D/g, '')
            : values.email
          const link = await api.integrationLinks.create({
            patientId: id!,
            portalType: linkPortal,
            email: login,
            password: values.password,
            cardNumber: values.cardNumber?.replace(/\s/g, '') || undefined,
          })
          setLinkModalOpen(false)
          load()
          if (SYNCABLE_PORTALS.has(linkPortal)) {
            message.success('Portal vinculado! Iniciando primeira sincronização...')
            await startSync(link.id)
          } else {
            message.success('Portal vinculado!')
          }
        } catch (err) {
          if (err && typeof err === 'object' && 'errorFields' in err) return
          message.error(err instanceof Error ? err.message : 'Erro ao vincular')
        }
      }} onCancel={() => setLinkModalOpen(false)} okText={SYNCABLE_PORTALS.has(linkPortal) ? 'Vincular e sincronizar' : 'Vincular'} cancelText={t('common.cancel')} width={400}>
        <Form form={linkForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="email"
            label={
              linkPortal === 'unimed' ? 'E-mail de acesso'
                : linkPortal === 'mater_dei' ? 'CPF (Meu Mater Dei)'
                  : linkPortal === 'hermes_pardini' ? 'CPF ou código do cliente'
                  : linkPortal === 'amil' ? 'CPF'
                    : 'CPF / usuário'
            }
            rules={
              linkPortal === 'unimed'
                ? [{ required: true, type: 'email', message: 'Informe o e-mail' }]
                : CPF_LOGIN_PORTALS.has(linkPortal)
                  ? [
                      { required: true, message: linkPortal === 'hermes_pardini' ? 'Informe CPF ou código' : 'Informe o CPF' },
                      {
                        validator: (_, value) => {
                          const digits = String(value || '').replace(/\D/g, '')
                          if (linkPortal === 'hermes_pardini' && digits.length >= 1) return Promise.resolve()
                          if (digits.length === 11) return Promise.resolve()
                          return Promise.reject(new Error('CPF deve ter 11 dígitos'))
                        },
                      },
                    ]
                  : [{ required: true }]
            }
            extra={
              linkPortal === 'hermes_pardini'
                ? 'Portal unificado: CPF e código SMS/WhatsApp no Chrome. Senha do protocolo como alternativa.'
                : CPF_LOGIN_PORTALS.has(linkPortal) && patient?.cpf
                  ? 'Pré-preenchido com o CPF do paciente'
                  : undefined
            }
          >
            <Input
              placeholder={
                linkPortal === 'unimed' ? 'seu@email.com'
                  : '000.000.000-00'
              }
              inputMode={CPF_LOGIN_PORTALS.has(linkPortal) ? 'numeric' : undefined}
            />
          </Form.Item>
          <Form.Item name="password" label="Senha" rules={[{ required: true }]}>
            <Input.Password placeholder="Senha do portal" />
          </Form.Item>
          <Form.Item name="cardNumber" label="Nº da Carteirinha (opcional)">
            <Input placeholder="Número da carteirinha" />
          </Form.Item>
        </Form>
      </Modal>

      <SyncProgressModal
        jobId={syncJobId}
        portalType={syncPortalType}
        holderPatientId={patient.id}
        onDone={() => { setSyncJobId(null); setSyncPortalType(null); load() }}
        onError={(msg) => { message.error(msg, 8) }}
        onResync={() => {
          const portal = syncPortalType ?? 'amil'
          const link = integrationLinks.find((l) => l.portalType === portal)
          if (link) startSync(link.id)
        }}
      />

      <Modal title="Editar Dados do Paciente" open={editOpen} onOk={handleEditSave} onCancel={() => setEditOpen(false)} okText={t('common.save')} cancelText={t('common.cancel')} width={560}>
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="birthDate" label="Data de Nascimento" rules={[{ required: true }]}>
            <MaskedDatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="gender" label="Sexo">
            <Select options={[{ value: 'male', label: t('patient.male') }, { value: 'female', label: t('patient.female') }]} allowClear />
          </Form.Item>
          <Form.Item name="bloodType" label="Tipo Sanguíneo">
            <Select options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(v => ({ value: v, label: v }))} allowClear />
          </Form.Item>
          <Form.Item name="weightKg" label={`Peso (${t('patient.weight')})`}><Input type="number" step="0.1" /></Form.Item>
          <Form.Item name="heightCm" label={`Altura (${t('patient.height')})`}><Input type="number" step="0.1" /></Form.Item>
          <Form.Item name="cpf" label="CPF"><Input placeholder="000.000.000-00" maxLength={14} /></Form.Item>
          <Form.Item name="cns" label="CNS"><Input placeholder="Nº do Cartão SUS" maxLength={15} /></Form.Item>
          <Form.Item name="photoUrl" label="Foto de Perfil / Avatar (Upload ou URL)">
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item name="photoUrl" noStyle>
                <Input placeholder="Cole a URL ou faça upload de imagem (máx. 2 MB)" allowClear />
              </Form.Item>
              <Upload
                accept="image/png,image/jpeg,image/webp,image/gif"
                showUploadList={false}
                beforeUpload={(file) => {
                  const isLt2M = file.size / 1024 / 1024 < 2
                  if (!isLt2M) {
                    message.error('A imagem de perfil deve ser menor que 2 MB')
                    return Upload.LIST_IGNORE
                  }
                  const reader = new FileReader()
                  reader.onload = (e) => {
                    const base64 = e.target?.result as string
                    if (base64) {
                      editForm.setFieldValue('photoUrl', base64)
                      message.success('Imagem carregada')
                    }
                  }
                  reader.readAsDataURL(file)
                  return false
                }}
              >
                <Button icon={<UploadOutlined />}>Upload</Button>
              </Upload>
            </Space.Compact>
          </Form.Item>
          <Form.Item name="parentIds" label="Pais/Responsáveis">
            <Select
              mode="multiple"
              placeholder="Selecione os pais/responsáveis"
              options={allPatients.filter(p => p.id !== patient?.id).map(p => ({ value: p.id, label: `${p.name} (${CATEGORY_LABEL[p.ageCategory] || p.ageCategory})` }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

function calcAge(birthDate: string, t: (k: string) => string): string {
  if (!birthDate) return '-'
  const ms = Date.now() - new Date(birthDate).getTime()
  if (ms < 0) return '-'
  const months = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44))
  return months < 24 ? `${months} ${t('patient.months')}` : `${Math.floor(months / 12)} ${t('patient.age')}`
}
