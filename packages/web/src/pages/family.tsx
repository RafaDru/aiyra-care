import { useTranslation } from 'react-i18next'
import { PageHeader } from '../components/ui/PageHeader.js'
import { FamilyHubContent } from '../components/family/FamilyHubContent.js'

export function FamilyPage() {
  const { t } = useTranslation()

  return (
    <div style={{ maxWidth: 720 }}>
      <PageHeader title={t('nav.yourFamily')} subtitle={t('family.hub.subtitle')} />
      <FamilyHubContent />
    </div>
  )
}
