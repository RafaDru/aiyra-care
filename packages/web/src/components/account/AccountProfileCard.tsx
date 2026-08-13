import { useEffect, useState } from 'react'
import {
  App,
  Button,
  Card,
  Collapse,
  Form,
  Input,
  Select,
  Space,
  Typography,
} from 'antd'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { api } from '../../lib/api.js'
import type { AccountProfileView, UpdateAccountProfileInput } from '../../lib/api.types.js'
import { MaskedDatePicker } from '../ui/MaskedDatePicker.js'

const { Title, Text } = Typography

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

type FormValues = {
  fullName?: string
  birthDate?: dayjs.Dayjs | null
  gender?: string
  cpf?: string
  bio?: string
  phone?: string
  phoneSecondary?: string
  whatsapp?: string
  preferredContact?: string
  city?: string
  state?: string
  country?: string
  timezone?: string
  locale?: string
  websiteUrl?: string
  linkedinUrl?: string
  instagramUrl?: string
  xUrl?: string
  facebookUrl?: string
}

function digitsOnly(value: string | undefined): string | undefined {
  if (!value) return undefined
  const d = value.replace(/\D/g, '')
  return d || undefined
}

function formatCpfInput(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function viewToForm(profile: AccountProfileView): FormValues {
  const p = profile.profile
  return {
    fullName: p.fullName ?? profile.displayName ?? undefined,
    birthDate: p.birthDate ? dayjs(p.birthDate) : null,
    gender: p.gender ?? undefined,
    cpf: p.cpf ? formatCpfInput(p.cpf) : undefined,
    bio: p.bio ?? undefined,
    phone: p.phone ?? undefined,
    phoneSecondary: p.phoneSecondary ?? undefined,
    whatsapp: p.whatsapp ?? undefined,
    preferredContact: p.preferredContact ?? undefined,
    city: p.city ?? undefined,
    state: p.state ?? undefined,
    country: p.country ?? 'BR',
    timezone: p.timezone ?? undefined,
    locale: p.locale ?? undefined,
    websiteUrl: p.websiteUrl ?? undefined,
    linkedinUrl: p.linkedinUrl ?? undefined,
    instagramUrl: p.instagramUrl ?? undefined,
    xUrl: p.xUrl ?? undefined,
    facebookUrl: p.facebookUrl ?? undefined,
  }
}

function formToPayload(values: FormValues): UpdateAccountProfileInput {
  const payload: UpdateAccountProfileInput = {}
  if (values.fullName !== undefined) payload.fullName = values.fullName.trim()
  if (values.birthDate) payload.birthDate = values.birthDate.format('YYYY-MM-DD')
  if (values.gender) payload.gender = values.gender as UpdateAccountProfileInput['gender']
  const cpf = digitsOnly(values.cpf)
  if (cpf) payload.cpf = cpf
  if (values.bio !== undefined) payload.bio = values.bio
  if (values.phone !== undefined) payload.phone = values.phone
  if (values.phoneSecondary !== undefined) payload.phoneSecondary = values.phoneSecondary
  if (values.whatsapp !== undefined) payload.whatsapp = values.whatsapp
  if (values.preferredContact) {
    payload.preferredContact = values.preferredContact as UpdateAccountProfileInput['preferredContact']
  }
  if (values.city !== undefined) payload.city = values.city
  if (values.state) payload.state = values.state
  if (values.country) payload.country = values.country
  if (values.timezone !== undefined) payload.timezone = values.timezone
  if (values.locale) payload.locale = values.locale
  if (values.websiteUrl !== undefined) payload.websiteUrl = values.websiteUrl
  if (values.linkedinUrl !== undefined) payload.linkedinUrl = values.linkedinUrl
  if (values.instagramUrl !== undefined) payload.instagramUrl = values.instagramUrl
  if (values.xUrl !== undefined) payload.xUrl = values.xUrl
  if (values.facebookUrl !== undefined) payload.facebookUrl = values.facebookUrl
  return payload
}

export function AccountProfileCard() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [form] = Form.useForm<FormValues>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    api.auth.getProfile()
      .then((profile) => {
        setEmail(profile.email)
        form.setFieldsValue(viewToForm(profile))
      })
      .catch(() => message.error(t('accountProfile.loadError')))
      .finally(() => setLoading(false))
  }, [form, message, t])

  const onSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const updated = await api.auth.updateProfile(formToPayload(values))
      form.setFieldsValue(viewToForm(updated))
      message.success(t('accountProfile.saveOk'))
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error(err instanceof Error ? err.message : t('accountProfile.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const genderOptions = [
    { value: 'male', label: t('accountProfile.genderMale') },
    { value: 'female', label: t('accountProfile.genderFemale') },
    { value: 'other', label: t('accountProfile.genderOther') },
    { value: 'prefer_not', label: t('accountProfile.genderPreferNot') },
  ]

  const contactOptions = [
    { value: 'email', label: t('accountProfile.contactEmail') },
    { value: 'phone', label: t('accountProfile.contactPhone') },
    { value: 'whatsapp', label: t('accountProfile.contactWhatsapp') },
  ]

  const localeOptions = [
    { value: 'pt-BR', label: t('settings.lang.pt') },
    { value: 'en', label: t('settings.lang.en') },
  ]

  return (
    <Card loading={loading}>
      <Title level={5} style={{ marginTop: 0 }}>{t('accountProfile.title')}</Title>
      <Text type="secondary">{t('accountProfile.subtitle')}</Text>

      {email && (
        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          {t('accountPlan.email')}: {email}
        </Text>
      )}

      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Collapse
          defaultActiveKey={['basic', 'contact']}
          items={[
            {
              key: 'basic',
              label: t('accountProfile.sectionBasic'),
              children: (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Form.Item
                    name="fullName"
                    label={t('accountProfile.fullName')}
                    rules={[{ min: 2, message: t('accountProfile.fullNameMin') }]}
                  >
                    <Input placeholder={t('accountProfile.fullNamePlaceholder')} />
                  </Form.Item>
                  <Form.Item name="birthDate" label={t('accountProfile.birthDate')}>
                    <MaskedDatePicker placeholder={t('onboarding.birthDate')} />
                  </Form.Item>
                  <Form.Item name="gender" label={t('accountProfile.gender')}>
                    <Select allowClear options={genderOptions} placeholder={t('onboarding.gender')} />
                  </Form.Item>
                  <Form.Item
                    name="cpf"
                    label={t('accountProfile.cpf')}
                    rules={[
                      {
                        validator: (_, value) => {
                          const d = digitsOnly(value)
                          if (!d) return Promise.resolve()
                          if (d.length !== 11) return Promise.reject(new Error(t('onboarding.cpfInvalid')))
                          return Promise.resolve()
                        },
                      },
                    ]}
                  >
                    <Input
                      placeholder="000.000.000-00"
                      onChange={(e) => {
                        const masked = formatCpfInput(e.target.value)
                        form.setFieldValue('cpf', masked)
                      }}
                    />
                  </Form.Item>
                  <Form.Item name="bio" label={t('accountProfile.bio')}>
                    <Input.TextArea rows={3} placeholder={t('accountProfile.bioPlaceholder')} />
                  </Form.Item>
                </Space>
              ),
            },
            {
              key: 'contact',
              label: t('accountProfile.sectionContact'),
              children: (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Form.Item name="phone" label={t('accountProfile.phone')}>
                    <Input placeholder={t('accountProfile.phonePlaceholder')} />
                  </Form.Item>
                  <Form.Item name="phoneSecondary" label={t('accountProfile.phoneSecondary')}>
                    <Input placeholder={t('accountProfile.phonePlaceholder')} />
                  </Form.Item>
                  <Form.Item name="whatsapp" label={t('accountProfile.whatsapp')}>
                    <Input placeholder={t('accountProfile.phonePlaceholder')} />
                  </Form.Item>
                  <Form.Item name="preferredContact" label={t('accountProfile.preferredContact')}>
                    <Select allowClear options={contactOptions} />
                  </Form.Item>
                  <Form.Item name="city" label={t('accountProfile.city')}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="state" label={t('accountProfile.state')}>
                    <Select allowClear showSearch options={BR_STATES.map((s) => ({ value: s, label: s }))} />
                  </Form.Item>
                  <Form.Item name="country" label={t('accountProfile.country')}>
                    <Input maxLength={2} placeholder="BR" />
                  </Form.Item>
                  <Form.Item name="timezone" label={t('accountProfile.timezone')}>
                    <Input placeholder="America/Sao_Paulo" />
                  </Form.Item>
                  <Form.Item name="locale" label={t('accountProfile.locale')}>
                    <Select allowClear options={localeOptions} />
                  </Form.Item>
                </Space>
              ),
            },
            {
              key: 'social',
              label: t('accountProfile.sectionSocial'),
              children: (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Form.Item name="websiteUrl" label={t('accountProfile.website')}>
                    <Input placeholder="https://" />
                  </Form.Item>
                  <Form.Item name="linkedinUrl" label={t('accountProfile.linkedin')}>
                    <Input placeholder="https://linkedin.com/in/..." />
                  </Form.Item>
                  <Form.Item name="instagramUrl" label={t('accountProfile.instagram')}>
                    <Input placeholder="https://instagram.com/..." />
                  </Form.Item>
                  <Form.Item name="xUrl" label={t('accountProfile.x')}>
                    <Input placeholder="https://x.com/..." />
                  </Form.Item>
                  <Form.Item name="facebookUrl" label={t('accountProfile.facebook')}>
                    <Input placeholder="https://facebook.com/..." />
                  </Form.Item>
                </Space>
              ),
            },
          ]}
        />

        <Button type="primary" onClick={onSave} loading={saving} style={{ marginTop: 16 }}>
          {t('accountProfile.save')}
        </Button>
      </Form>
    </Card>
  )
}
