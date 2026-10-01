import { Card, Collapse, Typography } from 'antd'
import { BookOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

const { Paragraph, Text } = Typography

export function FamilyGlossaryCard() {
  const { t } = useTranslation()

  const terms = [
    { key: 'account', title: t('family.glossary.accountTitle'), body: t('family.glossary.accountBody') },
    { key: 'familyCircle', title: t('family.glossary.familyCircleTitle'), body: t('family.glossary.familyCircleBody') },
    { key: 'healthProfile', title: t('family.glossary.healthProfileTitle'), body: t('family.glossary.healthProfileBody') },
    { key: 'caregiver', title: t('family.glossary.caregiverTitle'), body: t('family.glossary.caregiverBody') },
  ]

  return (
    <Card
      data-testid="family-glossary-card"
      title={
        <span>
          <BookOutlined aria-hidden style={{ marginRight: 8 }} />
          {t('family.glossary.panelTitle')}
        </span>
      }
    >
      <Paragraph type="secondary" style={{ marginBottom: 12 }}>
        {t('family.glossary.panelIntro')}
      </Paragraph>
      <Collapse
        bordered={false}
        size="small"
        items={terms.map((term) => ({
          key: term.key,
          label: <Text strong>{term.title}</Text>,
          children: <Paragraph style={{ marginBottom: 0 }}>{term.body}</Paragraph>,
        }))}
      />
    </Card>
  )
}
