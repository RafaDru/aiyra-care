#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const localesDir = join(root, 'packages/web/src/i18n/locales')
const extract = JSON.parse(readFileSync('/tmp/clinical-i18n-extract.json', 'utf8'))

// English clinicalSequence + clinicalExport (paired with pt from extract)
const enClinicalSequence = {
  flowSectionTitle: 'Care sequence',
  flowEmpty:
    'Add visits, orders, and exams to this follow-up; then link what came from what.',
  connectButton: 'Link in sequence',
  connectButtonHint: 'E.g. visit that led to an exam order or authorization',
  modalTitle: 'How does this connect?',
  modalHint:
    'Show what happened first and what was ordered or resulted afterward — like a visit that leads to an exam order.',
  fromLabel: 'First (what happened before)',
  toLabel: 'After (order, authorization, or result)',
  relationLabel: 'What happened between them?',
  relationPlaceholder: 'Choose source and destination',
  relationLoading: 'Loading options…',
  submit: 'Confirm link',
  created: 'Link saved',
  removed: 'Link removed',
  columnTitle: 'Sequence',
  associate: 'Link',
  popoverTitle: 'Connections on this record',
  expandTitle: 'In the care sequence',
  expandEmpty: 'No links on this record.',
  expandHint: 'Click an item to open it in the matching tab.',
  sequenceCount: '{{count}} in sequence',
  goToEntity: 'Open',
  peerOutgoing: 'After',
  peerIncoming: 'Before',
  entityModalTitle: 'Link to another record',
  entityModalHint: 'Connect this item to another in the history (e.g. visit → authorization request).',
  drawerFallbackTitle: 'Follow-up',
  drawerNotFound: 'Follow-up not found.',
  drawerLoadError: 'Could not load follow-up',
  timelineSectionTitle: 'Timeline',
  timelineSectionHint: 'Visits, orders, authorizations, and results in the order they occurred.',
  noteSectionTitle: 'Add note',
  notePlaceholder: 'Observation, progress…',
  noteSaved: 'Note added',
  diagnosisConverted: 'Diagnosis recorded; follow-up updated',
  allergyConverted: 'Allergy recorded; hypothesis converted',
  targetPickerPlaceholder: 'Select destination record',
}

const enClinicalExport = {
  title: 'Summary for medical visit',
  subtitle: 'AiyraCare — consolidated patient history',
  printButton: 'Print / save PDF',
  closeButton: 'Close',
  previewTitle: 'Summary preview',
  sectionAlerts: 'Alerts',
  sectionPendencies: 'Pending items',
  sectionFollowUp: 'In follow-up',
  sectionPlans: 'Health plans',
  sectionTimeline: 'Recent events',
  sectionSummary: 'Summary',
  footerDisclaimer:
    'Document generated automatically from caregiver records. Does not replace official medical records. Review with the patient before the visit.',
  generatedAt: 'Generated at',
  noPendencies: 'No pending items recorded.',
  noFollowUp: 'No active follow-ups.',
  noTimeline: 'No recent events in this period.',
  noPlans: 'No active plans recorded.',
  shareButton: 'Share link',
  shareCopied: 'Link copied',
  shareTitle: 'Temporary link for the clinician',
  consultVisitTitle: 'Bring to visit',
  consultVisitSubtitle: 'Share a summary with the clinician — link valid for 48 hours.',
  consultVisitModeSummary: 'For visit',
  consultVisitModeSummaryHint: 'Alerts, medications, recent events — recommended',
  consultVisitModeFull: 'Full',
  consultVisitModeFullHint: 'Includes exams, reports, and authorizations',
  consultVisitCopyLink: 'Copy link',
  consultVisitShowQr: 'QR code for clinician',
  consultVisitPrint: 'Save PDF / print',
  consultVisitWhatsapp: 'Send on WhatsApp',
  consultVisitExpires: 'Valid until',
  consultVisitPreview: 'View full preview',
  consultVisitQrHint: 'Clinician scans at reception — opens on phone without installing the app.',
  consultVisitWhatsappHint: 'Opens WhatsApp with the link ready to send.',
  consultVisitEmailTitle: 'Email summary to clinician',
  consultVisitEmailLabel: 'Clinician email',
  consultVisitDoctorNameLabel: 'Clinician name (optional)',
  consultVisitEmailSend: 'Send email',
  consultVisitEmailSent: 'Email sent to clinician',
  consultVisitEmailQueued: 'Link ready — email will be sent shortly',
  consultVisitReferralHint:
    'The link includes your AiyraCare referral code — helps recognize who shared.',
  consultVisitReferralCode: 'Your code:',
  exportFullTitle: 'Full record for visit',
  sectionAllergies: 'Allergies',
  sectionMedications: 'Medications',
  sectionVaccines: 'Vaccines',
  sectionDiagnoses: 'Diagnoses',
  sectionDocuments: 'Files',
  sectionAuthorizations: 'Authorizations',
  sectionMedicalRecords: 'Visits and utilization',
  sectionExams: 'Exams',
  clinicianPortalTitle: 'Clinician portal',
  clinicianPortalSubtitle: 'Summary shared by caregiver to support the visit',
  clinicianPortalDisclaimer:
    'Document generated automatically from caregiver records. Does not replace official records. Review with patient or guardian.',
  clinicianPortalModeSummary: 'Visit summary',
  clinicianPortalModeFull: 'Full record',
  clinicianPortalCtaTitle: 'AiyraCare for practices',
  clinicianPortalCtaBody: 'Receive structured summaries from your patients — no app install in the office.',
  clinicianPortalCtaButton: 'Discover AiyraCare',
  clinicianFeedbackPrompt: 'Was this summary helpful for the visit?',
  clinicianFeedbackYes: 'Yes, it helped',
  clinicianFeedbackNo: 'Not very helpful',
  clinicianFeedbackThanks: 'Thanks for your feedback.',
}

function merge(locale, clinicalSequence, clinicalExport) {
  const path = join(localesDir, locale)
  const data = JSON.parse(readFileSync(path, 'utf8'))
  data.clinicalSequence = clinicalSequence
  data.clinicalExport = clinicalExport
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

merge('pt-BR.json', extract.clinicalSequence, extract.clinicalExport)
merge('en.json', enClinicalSequence, enClinicalExport)
execSync('node scripts/i18n-check.mjs', { cwd: root, stdio: 'inherit' })
