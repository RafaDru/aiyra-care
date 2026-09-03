import type { Pool } from 'pg'
import type { ScraperProgress } from '../../domain/scraper/health-portal-scraper.js'
import { GovBrTokenSession } from '../../infrastructure/govbr/govbr-token-session.js'
import { GovBrSessionPgRepository } from '../../infrastructure/persistence/govbr-session.pg.repository.js'

export interface GovBrSessionView {
  sessionReady: boolean
  expiresAt: string | null
  conectesusLastFetchAt: string | null
}

export class GovBrSessionService {
  private readonly repo: GovBrSessionPgRepository

  constructor(private readonly pool: Pool) {
    this.repo = new GovBrSessionPgRepository(pool)
  }

  async getView(accountId: string): Promise<GovBrSessionView> {
    const row = await this.repo.findByAccountId(accountId)
    if (!row) {
      return { sessionReady: false, expiresAt: null, conectesusLastFetchAt: null }
    }
    return {
      sessionReady: this.repo.isRowValid(row),
      expiresAt: row.tokenExpiresAt.toISOString(),
      conectesusLastFetchAt: row.conectesusLastFetchAt?.toISOString() ?? null,
    }
  }

  async createTokenSession(accountId: string): Promise<GovBrTokenSession> {
    const session = new GovBrTokenSession()
    const row = await this.repo.findByAccountId(accountId)
    if (row) {
      const snap = this.repo.snapshotFromRow(row)
      if (snap && this.repo.isRowValid(row)) {
        session.hydrate(snap)
      }
    }
    return session
  }

  async persistTokenSession(accountId: string, tokenSession: GovBrTokenSession): Promise<void> {
    const snap = tokenSession.snapshot()
    if (!snap) return
    await this.repo.upsert(accountId, snap)
  }

  async touchConecteSUSFetch(accountId: string): Promise<void> {
    await this.repo.touchConecteSUSFetch(accountId)
  }

  async clearSession(accountId: string): Promise<void> {
    await this.repo.deleteByAccountId(accountId)
  }

  async ensureToken(
    accountId: string,
    onProgress?: (p: ScraperProgress) => void,
    browserConfig?: Parameters<GovBrTokenSession['ensureToken']>[1],
  ): Promise<GovBrTokenSession> {
    const tokenSession = await this.createTokenSession(accountId)
    await tokenSession.ensureToken(onProgress, browserConfig)
    await this.persistTokenSession(accountId, tokenSession)
    return tokenSession
  }
}
