import { Modal, Form, Input, DatePicker, Typography } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'

const { Text } = Typography

export interface AmilSyncOptions {
  amilMarcaOtica?: string
  amilUtilizationStart?: string
  amilUtilizationEnd?: string
}

interface Props {
  open: boolean
  loading?: boolean
  onCancel: () => void
  onConfirm: (opts: AmilSyncOptions) => void
}

interface FormValues {
  marcaOtica?: string
  period?: [Dayjs, Dayjs]
}

export function AmilSyncOptionsModal({ open, loading, onCancel, onConfirm }: Props) {
  const [form] = Form.useForm<FormValues>()

  const handleOk = async () => {
    const values = await form.validateFields()
    const opts: AmilSyncOptions = {}
    const marca = values.marcaOtica?.trim()
    if (marca) opts.amilMarcaOtica = marca
    if (values.period?.[0]) opts.amilUtilizationStart = values.period[0].format('YYYY-MM-DD')
    if (values.period?.[1]) opts.amilUtilizationEnd = values.period[1].format('YYYY-MM-DD')
    onConfirm(opts)
  }

  return (
    <Modal
      title="Sincronizar Amil — atendimentos"
      open={open}
      onCancel={onCancel}
      onOk={() => void handleOk()}
      confirmLoading={loading}
      okText="Sincronizar"
      cancelText="Cancelar"
      destroyOnHidden
      afterOpenChange={(visible) => {
        if (visible) {
          const end = dayjs()
          const start = end.subtract(2, 'month')
          form.setFieldsValue({ marcaOtica: undefined, period: [start, end] })
        }
      }}
    >
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Filtre o período de utilização (atendimentos realizados) e, opcionalmente, um beneficiário específico pela marca ótica.
        Deixe em branco para sincronizar todos.
      </Text>
      <Form form={form} layout="vertical">
        <Form.Item name="period" label="Período de utilização">
          <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>
        <Form.Item
          name="marcaOtica"
          label="Marca ótica (beneficiário)"
          extra="Opcional — número da carteirinha/marca ótica Amil"
        >
          <Input placeholder="Ex: 094995656" allowClear />
        </Form.Item>
      </Form>
    </Modal>
  )
}
