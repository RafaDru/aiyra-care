import { Modal, Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { LegalDocumentKind } from '../../lib/api.types.js'
import { legalDocumentPath } from '../../lib/legal-paths.js'
import { LegalDocumentBody } from './LegalDocumentBody.js'

type Props = {
  kind: LegalDocumentKind | null
  open: boolean
  onClose: () => void
  /** Preservado ao abrir a página completa (ex.: /compliance/accept). */
  returnPath?: string | null
}

export function LegalDocumentModal({ kind, open, onClose, returnPath }: Props) {
  const { t } = useTranslation()

  if (!kind) return null

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          {t('common.close')}
        </Button>,
        <Link key="full" to={legalDocumentPath(kind, returnPath)} onClick={onClose}>
          <Button type="link">{t('legal.openFullPage')}</Button>
        </Link>,
      ]}
      width={920}
      style={{ top: 24 }}
      styles={{
        body: {
          maxHeight: '70vh',
          overflowY: 'auto',
          paddingTop: 8,
        },
      }}
      destroyOnClose
    >
      <LegalDocumentBody kind={kind} showCrossLinks={false} />
    </Modal>
  )
}
