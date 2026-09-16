import { useEffect, useState, useMemo } from 'react'
import { Button, Form, Input, InputNumber, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { api } from '../../../lib/api.js'
import { usePatientEntity } from '../../../hooks/use-patient-entity.js'
import { EntityFormModal } from '../../../components/ui/EntityFormModal.js'
import { VaccineDashboard } from '../../../components/vaccine/VaccineDashboard.js'
import { SusPublicHealthBanner } from '../../../components/integrations/SusPublicHealthBanner.js'
import { PublicHealthIntegrationModal } from '../../../components/integrations/PublicHealthIntegrationModal.js'
import { QuickClinicalUploadButton } from '../../../components/document/QuickClinicalUploadButton.js'
import { MaskedDatePicker } from '../../../components/ui/MaskedDatePicker.js'
import { CarePlaceAutocomplete } from '../../../components/ui/CarePlaceAutocomplete.js'
import type { Vaccine, VaccineScheduleItem } from '../../../lib/api.types.js'

interface Props { patientId: string }

function vaccineFormValues(v: Vaccine) {
  return {
    vaccineName: v.vaccineName,
    doseNumber: v.doseNumber ?? undefined,
    applicationDate: dayjs(v.applicationDate),
    nextDoseDate: v.nextDoseDate ? dayjs(v.nextDoseDate) : undefined,
    appliedBy: v.appliedBy ?? undefined,
    batchNumber: v.batchNumber ?? undefined,
    clinic: v.clinic ?? undefined,
    notes: v.notes ?? undefined,
  }
}

function VaccineFormFields() {
  const { t } = useTranslation()
  return (
    <>
      <Form.Item name="vaccineName" label={t('vaccine.name')} rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="doseNumber" label={t('vaccine.dose')}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="applicationDate" label={t('vaccine.applicationDate')} rules={[{ required: true }]}>
        <MaskedDatePicker style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="nextDoseDate" label={t('vaccine.nextDose')}>
        <MaskedDatePicker style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="appliedBy" label={t('vaccine.appliedBy')}><Input /></Form.Item>
      <Form.Item name="batchNumber" label={t('vaccine.batch')}><Input /></Form.Item>
      <Form.Item name="clinic" label={t('vaccine.clinic')}>
        <CarePlaceAutocomplete />
      </Form.Item>
      <Form.Item name="notes" label={t('vaccine.notes')}><Input.TextArea rows={2} /></Form.Item>
    </>
  )
}

function buildVaccinePayload(values: Record<string, unknown>) {
  return {
    vaccineName: values.vaccineName as string,
    doseNumber: values.doseNumber as number | undefined,
    applicationDate: (values.applicationDate as dayjs.Dayjs).toISOString(),
    nextDoseDate: (values.nextDoseDate as dayjs.Dayjs | undefined)?.toISOString(),
    appliedBy: (values.appliedBy as string | undefined) || undefined,
    batchNumber: (values.batchNumber as string | undefined) || undefined,
    clinic: (values.clinic as string | undefined) || undefined,
    notes: (values.notes as string | undefined) || undefined,
  }
}

export function VaccinesTab({ patientId }: Props) {
  const { t } = useTranslation()
  const { data, loading, reload } = usePatientEntity<Vaccine>(api.vaccines.list, patientId)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Vaccine | null>(null)
  const [schedule, setSchedule] = useState<VaccineScheduleItem[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [birthDate, setBirthDate] = useState<string | null>(null)
  const [susModalOpen, setSusModalOpen] = useState(false)
  const [patientCpf, setPatientCpf] = useState<string | null>(null)

  const editInitial = useMemo(
    () => (editing ? vaccineFormValues(editing) : undefined),
    [editing],
  )

  useEffect(() => {
    if (!patientId) return
    api.patients.get(patientId).then((p) => {
      setBirthDate(p.birthDate)
      setPatientCpf(p.cpf ?? null)
    }).catch(() => {
      setBirthDate(null)
      setPatientCpf(null)
    })
  }, [patientId])

  useEffect(() => {
    setScheduleLoading(true)
    api.patients.vaccineSchedule(patientId)
      .then(setSchedule)
      .catch(() => setSchedule([]))
      .finally(() => setScheduleLoading(false))
  }, [patientId, data.length])

  const handleEditVaccine = (vaccineId: string) => {
    const vaccine = data.find((v) => v.id === vaccineId)
    if (vaccine?.source === 'manual') setEditing(vaccine)
  }

  return (
    <>
      <SusPublicHealthBanner
        patientId={patientId}
        patientCpf={patientCpf}
        onReimport={() => setSusModalOpen(true)}
        onImported={reload}
      />

      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            {t('vaccine.new')}
          </Button>
          <QuickClinicalUploadButton patientId={patientId} documentType="vaccine_card" onRecordsUpdated={reload} />
        </Space>
      </div>

      <VaccineDashboard
        applied={data}
        schedule={schedule}
        birthDate={birthDate}
        loading={loading || scheduleLoading}
        onEditVaccine={handleEditVaccine}
      />

      <EntityFormModal
        open={open}
        title={t('vaccine.new')}
        successMsg={t('vaccine.success')}
        onClose={() => setOpen(false)}
        onSubmit={(values) => api.vaccines.create({
          patientId,
          ...buildVaccinePayload(values),
        }).then(reload)}
      >
        <VaccineFormFields />
      </EntityFormModal>

      <EntityFormModal
        key={editing?.id ?? 'edit'}
        open={!!editing}
        title={t('vaccine.edit')}
        successMsg={t('vaccine.updated')}
        initialValues={editInitial}
        onClose={() => setEditing(null)}
        onSubmit={(values) => {
          if (!editing) return Promise.resolve()
          return api.vaccines.update(editing.id, buildVaccinePayload(values)).then(reload)
        }}
      >
        <VaccineFormFields />
      </EntityFormModal>

      <PublicHealthIntegrationModal
        open={susModalOpen}
        portal="conectesus"
        patientId={patientId}
        onClose={() => setSusModalOpen(false)}
        onImported={reload}
      />
    </>
  )
}
