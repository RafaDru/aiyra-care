import { useEffect, useRef } from 'react'

/** Rola até a linha destacada e opcionalmente expande a linha pai. */
export function useClinicalEntityHighlight(
  highlightEntityId: string | null | undefined,
  rowIds: string[],
  options?: {
    expandedRowKeys?: string[]
    setExpandedRowKeys?: (keys: string[]) => void
    parentRowIdForHighlight?: string | null
  },
) {
  const scrolledRef = useRef<string | null>(null)

  useEffect(() => {
    if (!highlightEntityId) return

    if (
      options?.parentRowIdForHighlight &&
      options.setExpandedRowKeys &&
      !options.expandedRowKeys?.includes(options.parentRowIdForHighlight)
    ) {
      options.setExpandedRowKeys([...options.expandedRowKeys ?? [], options.parentRowIdForHighlight])
    }

    if (scrolledRef.current === highlightEntityId) return
    if (!rowIds.includes(highlightEntityId)) return

    const timer = window.setTimeout(() => {
      const el = document.getElementById(`clinical-entity-row-${highlightEntityId}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      scrolledRef.current = highlightEntityId
    }, 200)

    return () => window.clearTimeout(timer)
  }, [
    highlightEntityId,
    rowIds,
    options?.expandedRowKeys,
    options?.parentRowIdForHighlight,
    options?.setExpandedRowKeys,
  ])
}

export function clinicalEntityRowProps(
  recordId: string,
  highlightEntityId?: string | null,
) {
  return {
    id: `clinical-entity-row-${recordId}`,
    className: recordId === highlightEntityId ? 'clinical-entity-row--highlight' : undefined,
  }
}
