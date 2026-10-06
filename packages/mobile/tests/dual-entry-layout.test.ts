import { describe, expect, it } from 'vitest'
import { AIYRACARE_TOKENS } from '@aiyra-care/design-tokens'
import {
  DUAL_ENTRY_EDGE_INSET,
  DUAL_ENTRY_FAB_BOTTOM_OFFSET,
  DUAL_ENTRY_Z_INDEX_AVA,
  DUAL_ENTRY_Z_INDEX_QUICK_CAPTURE,
} from '../src/lib/dual-entry-layout'

describe('dual-entry-layout', () => {
  it('shares FAB offset and inset with design tokens', () => {
    expect(DUAL_ENTRY_FAB_BOTTOM_OFFSET).toBe(56)
    expect(DUAL_ENTRY_EDGE_INSET).toBe(AIYRACARE_TOKENS.padding)
  })

  it('keeps Ava above quick capture in z-order', () => {
    expect(DUAL_ENTRY_Z_INDEX_AVA).toBeGreaterThan(DUAL_ENTRY_Z_INDEX_QUICK_CAPTURE)
  })
})
