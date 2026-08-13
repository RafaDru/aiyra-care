import { useMemo, useState } from 'react'
import { Table, Button, Form, InputNumber, Input, Typography } from 'antd'
import { MaskedDatePicker } from '../../../components/ui/MaskedDatePicker.js'
import { PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { api } from '../../../lib/api.js'
import { usePatientEntity } from '../../../hooks/use-patient-entity.js'
import { EntityFormModal } from '../../../components/ui/EntityFormModal.js'
import type { GrowthRecord } from '../../../lib/api.types.js'
import type { Dayjs } from 'dayjs'

interface Props { patientId: string }

function formatChartDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

export function GrowthTab({ patientId }: Props) {
  const { t } = useTranslation()
  const { data, loading, reload } = usePatientEntity<GrowthRecord>(api.growthRecords.list, patientId)
  const [open, setOpen] = useState(false)

  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => new Date(a.recordDate).getTime() - new Date(b.recordDate).getTime())
      .map((r) => ({
        date: r.recordDate,
        label: formatChartDate(r.recordDate),
        weightKg: r.weightKg,
        heightCm: r.heightCm,
        headCircumferenceCm: r.headCircumferenceCm,
        bmi: r.bmi,
      }))
  }, [data])

  const hasChart = chartData.some((d) => d.weightKg != null || d.heightCm != null || d.headCircumferenceCm != null)

  const columns = [
    { title: t('growth.date'), dataIndex: 'recordDate', render: (v: string) => new Date(v).toLocaleDateString() },
    { title: t('growth.weight'), dataIndex: 'weightKg', render: (v: number | null) => v ?? '-' },
    { title: t('growth.height'), dataIndex: 'heightCm', render: (v: number | null) => v ?? '-' },
    { title: t('growth.headCircumference'), dataIndex: 'headCircumferenceCm', render: (v: number | null) => v ?? '-' },
    { title: t('growth.bmi'), dataIndex: 'bmi', render: (v: number | null) => v?.toFixed(1) ?? '-' },
    { title: t('growth.percentileWeight'), dataIndex: 'percentileWeight', render: (v: number | null) => v ?? '-' },
    { title: t('growth.percentileHeight'), dataIndex: 'percentileHeight', render: (v: number | null) => v ?? '-' },
  ]

  return (
    <>
      {hasChart && (
        <div style={{ marginBottom: 24 }}>
          <Typography.Title level={5} style={{ marginTop: 0 }}>{t('growth.charts')}</Typography.Title>
          <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {chartData.some((d) => d.weightKg != null) && (
              <div style={{ height: 220 }}>
                <Typography.Text type="secondary">{t('growth.weight')}</Typography.Text>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={['auto', 'auto']} width={40} tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date ? new Date(payload[0].payload.date as string).toLocaleDateString('pt-BR') : ''} />
                    <Line type="monotone" dataKey="weightKg" name={t('growth.weight')} stroke="#1677ff" dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {chartData.some((d) => d.heightCm != null) && (
              <div style={{ height: 220 }}>
                <Typography.Text type="secondary">{t('growth.height')}</Typography.Text>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={['auto', 'auto']} width={40} tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date ? new Date(payload[0].payload.date as string).toLocaleDateString('pt-BR') : ''} />
                    <Line type="monotone" dataKey="heightCm" name={t('growth.height')} stroke="#52c41a" dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {chartData.some((d) => d.headCircumferenceCm != null) && (
              <div style={{ height: 220 }}>
                <Typography.Text type="secondary">{t('growth.headCircumference')}</Typography.Text>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={['auto', 'auto']} width={40} tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date ? new Date(payload[0].payload.date as string).toLocaleDateString('pt-BR') : ''} />
                    <Line type="monotone" dataKey="headCircumferenceCm" name={t('growth.headCircumference')} stroke="#722ed1" dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          {chartData.some((d) => d.weightKg != null && d.heightCm != null) && (
            <div style={{ height: 240, marginTop: 16 }}>
              <Typography.Text type="secondary">{t('growth.chartCombined')}</Typography.Text>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="weight" orientation="left" width={40} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="height" orientation="right" width={40} tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date ? new Date(payload[0].payload.date as string).toLocaleDateString('pt-BR') : ''} />
                  <Legend />
                  <Line yAxisId="weight" type="monotone" dataKey="weightKg" name={t('growth.weight')} stroke="#1677ff" dot={{ r: 3 }} connectNulls />
                  <Line yAxisId="height" type="monotone" dataKey="heightCm" name={t('growth.height')} stroke="#52c41a" dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>{t('growth.new')}</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={false} size="small" />
      <EntityFormModal
        open={open}
        title={t('growth.new')}
        successMsg={t('growth.success')}
        onClose={() => setOpen(false)}
        onSubmit={(values) => api.growthRecords.create({ patientId, ...values, recordDate: (values.recordDate as Dayjs).toISOString() }).then(reload)}
      >
        <Form.Item name="recordDate" label={t('growth.date')} rules={[{ required: true }]}>
          <MaskedDatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="weightKg" label={t('growth.weight')}><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="heightCm" label={t('growth.height')}><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="headCircumferenceCm" label={t('growth.headCircumference')}><InputNumber min={0} step={0.1} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="notes" label={t('growth.notes')}><Input.TextArea rows={2} /></Form.Item>
      </EntityFormModal>
    </>
  )
}
