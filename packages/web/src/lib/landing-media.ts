/**
 * Fotos curadas via Unsplash (licença gratuita — https://unsplash.com/license).
 * Screenshots do produto em /public/landing/ (captura via packages/api/scripts/capture-landing-screenshots.mjs).
 */
export const LANDING_PHOTOS = {
  heroFamily: {
    src: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1200&q=80',
    altKey: 'landing.media.heroFamily',
    credit: 'Unsplash',
  },
  organizedCare: {
    src: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80',
    altKey: 'landing.media.organizedCare',
    credit: 'Unsplash',
  },
} as const

/** Screenshots reais do app — gerados pelo script de captura. */
export const LANDING_SCREENSHOTS = {
  dashboard: '/landing/dashboard.png',
  patientOverview: '/landing/patient-overview.png',
  timeline: '/landing/timeline.png',
  agenda: '/landing/agenda.png',
  exams: '/landing/exams.png',
  avaChat: '/landing/ava-chat.png',
} as const

export type LandingScreenshotKey = keyof typeof LANDING_SCREENSHOTS
