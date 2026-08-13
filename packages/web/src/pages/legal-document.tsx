import { Card } from 'antd'
import { LegalDocumentLayout } from '../layouts/LegalDocumentLayout.js'
import { LegalDocumentBody } from '../components/legal/LegalDocumentBody.js'
import type { LegalDocumentKind } from '../lib/api.types.js'

type Props = {
  kind: LegalDocumentKind
}

export function LegalDocumentPage({ kind }: Props) {
  return (
    <LegalDocumentLayout>
      <Card className="legal-document-card" variant="borderless">
        <LegalDocumentBody kind={kind} />
      </Card>
    </LegalDocumentLayout>
  )
}
