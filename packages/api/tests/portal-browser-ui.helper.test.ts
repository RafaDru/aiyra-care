import { describe, expect, it } from 'vitest'
import {
  attachPortalDialogHandler,
  dismissPortalBlockingUi,
  preparePortalPage,
} from '../src/infrastructure/scraper/portal-browser-ui.helper.js'

describe('portal-browser-ui.helper', () => {
  it('exports shared portal UI helpers', () => {
    expect(typeof attachPortalDialogHandler).toBe('function')
    expect(typeof dismissPortalBlockingUi).toBe('function')
    expect(typeof preparePortalPage).toBe('function')
  })
})
