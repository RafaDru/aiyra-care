import { useEffect, useState } from 'react'
import type { FormInstance } from 'antd'
import { api } from '../../lib/api.js'
import type { ClinicalEntityType, RelationType } from '../../lib/api.types.js'
import { fallbackRelationTypes, pickClinicalRelationCode } from './entity-clinical-link-utils.js'

export function useClinicalRelationTypes(
  open: boolean,
  fromType: ClinicalEntityType | undefined,
  toType: ClinicalEntityType | undefined,
  form: FormInstance,
) {
  const [relationTypes, setRelationTypes] = useState<RelationType[]>([])
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [typesError, setTypesError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !fromType || !toType) {
      setRelationTypes([])
      setTypesError(null)
      return
    }

    let cancelled = false
    setLoadingTypes(true)
    setTypesError(null)

    api.clinicalLinks
      .relationTypes(fromType, toType)
      .then((types) => {
        if (cancelled) return
        const resolved = types.length > 0 ? types : fallbackRelationTypes(fromType, toType)
        setRelationTypes(resolved)
        const pick = pickClinicalRelationCode(resolved, fromType, toType)
        if (pick) form.setFieldValue('relationCode', pick)
      })
      .catch(() => {
        if (cancelled) return
        const resolved = fallbackRelationTypes(fromType, toType)
        setRelationTypes(resolved)
        const pick = pickClinicalRelationCode(resolved, fromType, toType)
        if (pick) form.setFieldValue('relationCode', pick)
        setTypesError('Não foi possível carregar opções do servidor; usando padrões locais.')
      })
      .finally(() => {
        if (!cancelled) setLoadingTypes(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, fromType, toType, form])

  const reset = () => {
    setRelationTypes([])
    setTypesError(null)
  }

  return { relationTypes, loadingTypes, typesError, reset }
}
