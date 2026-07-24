import type { PortalCredentials, PortalType } from './portal-credentials.js'
import type { ScraperResult as _ScraperResult } from './scraper-types.js'

export type ScraperResult = _ScraperResult

export interface ScraperConfig {
  portalType: PortalType
  baseUrl: string
}

export interface ScraperProgress {
  step: string
  message: string
  status: 'running' | 'success' | 'failed'
}

export interface ScraperError {
  code: 'AUTH_FAILED' | 'CAPTCHA_DETECTED' | 'MFA_REQUIRED' | 'LAYOUT_CHANGED' | 'NAVIGATION_FAILED' | 'EXTRACTION_FAILED' | 'UNKNOWN'
  message: string
  pageSnapshot?: string
  suggestion?: string
}

export interface HealthPortalScraper {
  readonly config: ScraperConfig
  scrape(credentials: PortalCredentials, onProgress?: (p: ScraperProgress) => void): Promise<ScraperResult>
}
