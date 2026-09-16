import type { Pool } from 'pg'
import { PublicHealthScrapeService } from '../scraper/public-health-scrape.service.js'
import { GovBrSessionService } from '../govbr/govbr-session.service.js'
import { ConecteSUSImportService, type ConecteSUSImportResult } from './conectesus-import.service.js'
import type { PatientService } from '../patient/patient.service.js'

const DEFAULT_SILENT_MS = 6 * 60 * 60 * 1000

import type { CareReminderService } from '../care-reminder/care-reminder.service.js'

export type ConecteSUSSyncResult = {
  skipped?: string
  importedVaccines?: number
  importedExams?: number
  skippedDuplicates?: number
  fetchedVaccines?: number
  fetchedExams?: number
}

export class ConecteSUSSyncService {
  private readonly scrape: PublicHealthScrapeService
  private readonly govBr: GovBrSessionService

  constructor(
    private readonly pool: Pool,
    private readonly patients: PatientService,
    private readonly importService: ConecteSUSImportService,
    private readonly careReminders?: CareReminderService,
  ) {
    this.scrape = new PublicHealthScrapeService(pool)
    this.govBr = new GovBrSessionService(pool)
  }

  async sync(
    accountId: string,
    patientId: string,
    opts: { silent?: boolean } = {},
  ): Promise<ConecteSUSSyncResult> {
    const patient = await this.patients.findById(patientId)
    const cpf = patient.cpf?.replace(/\D/g, '')
    if (!cpf || cpf.length !== 11) {
      return { skipped: 'cpf_required' }
    }

    const session = await this.govBr.getView(accountId)
    if (!session.sessionReady) {
      return { skipped: 'session_required' }
    }

    const staleMs = Number(process.env.CONECTESUS_SILENT_MIN_INTERVAL_MS ?? String(DEFAULT_SILENT_MS))
    if (opts.silent && session.conectesusLastFetchAt) {
      const age = Date.now() - new Date(session.conectesusLastFetchAt).getTime()
      if (age < staleMs) return { skipped: 'recent' }
    }

    const scraped = await this.scrape.scrapeConecteSUSPersisted(accountId, cpf)
    if ('skipped' in scraped) return { skipped: scraped.skipped }

    const imported: ConecteSUSImportResult = await this.importService.importForPatient(patientId, scraped)

    if (this.careReminders) {
      await this.careReminders.scheduleSusReimportReminder(patientId)
    }

    return {
      importedVaccines: imported.importedVaccines,
      importedExams: imported.importedExams,
      skippedDuplicates: imported.skipped,
      fetchedVaccines: scraped.vaccines.length,
      fetchedExams: scraped.exams.length,
    }
  }
}
