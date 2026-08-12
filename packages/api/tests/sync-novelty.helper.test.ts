import { describe, it, expect } from 'vitest'
import {
  noveltyFromImportOutcome,
  attachNoveltyToSyncResult,
  hasMeaningfulNovelty,
} from '../src/application/connect/sync-novelty.helper.js'

describe('sync-novelty.helper', () => {
  const baseOutcome = {
    imported: 3,
    updated: 2,
    skipped: 5,
    skippedMedicalRecords: 2,
    skippedExams: 1,
    skippedAuthorizations: 2,
    authorizations: 1,
    updatedAuthorizations: 1,
    medicalRecords: 2,
    exams: 1,
    authorizationItems: 0,
    authorizationDetails: [],
  }

  it('noveltyFromImportOutcome maps import and skipped counts', () => {
    const novelty = noveltyFromImportOutcome(baseOutcome, { portalAttendances: 5 })

    expect(novelty).toEqual({
      newAuthorizations: 1,
      updatedAuthorizations: 1,
      newMedicalRecords: 2,
      newExamRecords: 1,
      skippedMedicalRecords: 2,
      skippedExamRecords: 1,
      skippedAuthorizations: 2,
      portalMedicalRecords: 4,
      portalExams: 2,
      portalAuthorizations: 4,
      portalAttendances: 5,
    })
  })

  it('attachNoveltyToSyncResult merges novelty into result', () => {
    const novelty = { newAuthorizations: 2, updatedAuthorizations: 0, newMedicalRecords: 0, newExamRecords: 0 }
    const result = attachNoveltyToSyncResult({
      exams: 0,
      medicalRecords: 0,
      authorizations: 2,
      authorizationItems: 0,
      updatedAuthorizations: 0,
      total: 2,
      authorizationDetails: [],
    }, novelty)

    expect(result.novelty).toEqual(novelty)
    expect(result.authorizations).toBe(2)
  })

  it('hasMeaningfulNovelty detects any positive count', () => {
    expect(hasMeaningfulNovelty(null)).toBe(false)
    expect(hasMeaningfulNovelty({})).toBe(false)
    expect(hasMeaningfulNovelty({ newAuthorizations: 0, filesDownloaded: 0 })).toBe(false)
    expect(hasMeaningfulNovelty({ newAuthorizations: 1 })).toBe(true)
    expect(hasMeaningfulNovelty({ updatedAuthorizations: 1 })).toBe(true)
    expect(hasMeaningfulNovelty({ newMedicalRecords: 1 })).toBe(true)
    expect(hasMeaningfulNovelty({ newExamRecords: 1 })).toBe(true)
    expect(hasMeaningfulNovelty({ filesDownloaded: 1 })).toBe(true)
  })
})
