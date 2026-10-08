/** Clinical export / consult visit UI — resolved via i18n (pt-BR / en). */

import i18n from '../../i18n/index.js'

const PREFIX = 'clinicalExport.'

function exp(key: string): string {
  return i18n.t(`${PREFIX}${key}`)
}

export const CLINICAL_EXPORT_COPY = {
  get title() {
    return exp('title')
  },
  get subtitle() {
    return exp('subtitle')
  },
  get printButton() {
    return exp('printButton')
  },
  get closeButton() {
    return exp('closeButton')
  },
  get previewTitle() {
    return exp('previewTitle')
  },
  get sectionAlerts() {
    return exp('sectionAlerts')
  },
  get sectionPendencies() {
    return exp('sectionPendencies')
  },
  get sectionFollowUp() {
    return exp('sectionFollowUp')
  },
  get sectionPlans() {
    return exp('sectionPlans')
  },
  get sectionTimeline() {
    return exp('sectionTimeline')
  },
  get sectionSummary() {
    return exp('sectionSummary')
  },
  get footerDisclaimer() {
    return exp('footerDisclaimer')
  },
  get generatedAt() {
    return exp('generatedAt')
  },
  get noPendencies() {
    return exp('noPendencies')
  },
  get noFollowUp() {
    return exp('noFollowUp')
  },
  get noTimeline() {
    return exp('noTimeline')
  },
  get noPlans() {
    return exp('noPlans')
  },
  get shareButton() {
    return exp('shareButton')
  },
  get shareCopied() {
    return exp('shareCopied')
  },
  get shareTitle() {
    return exp('shareTitle')
  },
  get consultVisitTitle() {
    return exp('consultVisitTitle')
  },
  get consultVisitSubtitle() {
    return exp('consultVisitSubtitle')
  },
  get consultVisitModeSummary() {
    return exp('consultVisitModeSummary')
  },
  get consultVisitModeSummaryHint() {
    return exp('consultVisitModeSummaryHint')
  },
  get consultVisitModeFull() {
    return exp('consultVisitModeFull')
  },
  get consultVisitModeFullHint() {
    return exp('consultVisitModeFullHint')
  },
  get consultVisitCopyLink() {
    return exp('consultVisitCopyLink')
  },
  get consultVisitShowQr() {
    return exp('consultVisitShowQr')
  },
  get consultVisitPrint() {
    return exp('consultVisitPrint')
  },
  get consultVisitWhatsapp() {
    return exp('consultVisitWhatsapp')
  },
  get consultVisitExpires() {
    return exp('consultVisitExpires')
  },
  get consultVisitPreview() {
    return exp('consultVisitPreview')
  },
  get consultVisitQrHint() {
    return exp('consultVisitQrHint')
  },
  get consultVisitWhatsappHint() {
    return exp('consultVisitWhatsappHint')
  },
  get consultVisitEmailTitle() {
    return exp('consultVisitEmailTitle')
  },
  get consultVisitEmailLabel() {
    return exp('consultVisitEmailLabel')
  },
  get consultVisitDoctorNameLabel() {
    return exp('consultVisitDoctorNameLabel')
  },
  get consultVisitEmailSend() {
    return exp('consultVisitEmailSend')
  },
  get consultVisitEmailSent() {
    return exp('consultVisitEmailSent')
  },
  get consultVisitEmailQueued() {
    return exp('consultVisitEmailQueued')
  },
  get consultVisitReferralHint() {
    return exp('consultVisitReferralHint')
  },
  get consultVisitReferralCode() {
    return exp('consultVisitReferralCode')
  },
  get exportFullTitle() {
    return exp('exportFullTitle')
  },
  get sectionAllergies() {
    return exp('sectionAllergies')
  },
  get sectionMedications() {
    return exp('sectionMedications')
  },
  get sectionVaccines() {
    return exp('sectionVaccines')
  },
  get sectionDiagnoses() {
    return exp('sectionDiagnoses')
  },
  get sectionDocuments() {
    return exp('sectionDocuments')
  },
  get sectionAuthorizations() {
    return exp('sectionAuthorizations')
  },
  get sectionMedicalRecords() {
    return exp('sectionMedicalRecords')
  },
  get sectionExams() {
    return exp('sectionExams')
  },
  get clinicianPortalTitle() {
    return exp('clinicianPortalTitle')
  },
  get clinicianPortalSubtitle() {
    return exp('clinicianPortalSubtitle')
  },
  get clinicianPortalDisclaimer() {
    return exp('clinicianPortalDisclaimer')
  },
  get clinicianPortalModeSummary() {
    return exp('clinicianPortalModeSummary')
  },
  get clinicianPortalModeFull() {
    return exp('clinicianPortalModeFull')
  },
  get clinicianPortalCtaTitle() {
    return exp('clinicianPortalCtaTitle')
  },
  get clinicianPortalCtaBody() {
    return exp('clinicianPortalCtaBody')
  },
  get clinicianPortalCtaButton() {
    return exp('clinicianPortalCtaButton')
  },
  get clinicianFeedbackPrompt() {
    return exp('clinicianFeedbackPrompt')
  },
  get clinicianFeedbackYes() {
    return exp('clinicianFeedbackYes')
  },
  get clinicianFeedbackNo() {
    return exp('clinicianFeedbackNo')
  },
  get clinicianFeedbackThanks() {
    return exp('clinicianFeedbackThanks')
  },
}
