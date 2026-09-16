/** IDs fixos — matriz QA família (João/Maria/Francisco/Vitória). */

export const QA_MARKER = 'qa-family-matrix-seed'

// Contas
export const QA_JOAO_ACCOUNT_ID = 'b0000000-0000-4000-8000-000000000101'
export const QA_MARIA_ACCOUNT_ID = 'b0000000-0000-4000-8000-000000000102'
export const QA_FRANCISCO_ACCOUNT_ID = 'b0000000-0000-4000-8000-000000000103'
export const QA_VITORIA_ACCOUNT_ID = 'b0000000-0000-4000-8000-000000000104'

/** auth_subject placeholder — substituir via link-qa-persona.mjs */
export const QA_JOAO_AUTH_SUBJECT = 'b0000000-0000-4000-8000-000000000201'
export const QA_MARIA_AUTH_SUBJECT = 'b0000000-0000-4000-8000-000000000202'
export const QA_FRANCISCO_AUTH_SUBJECT = 'b0000000-0000-4000-8000-000000000203'
export const QA_VITORIA_AUTH_SUBJECT = 'b0000000-0000-4000-8000-000000000204'

// Pacientes
export const QA_PATIENT_PEDRO_ID = 'b0000000-0000-4000-8000-000000000111'
export const QA_PATIENT_LUCAS_ID = 'b0000000-0000-4000-8000-000000000112'
export const QA_PATIENT_MARIANA_ID = 'b0000000-0000-4000-8000-000000000113'
export const QA_PATIENT_HENRIQUE_ID = 'b0000000-0000-4000-8000-000000000114'

// Círculos
export const QA_CIRCLE_A_ID = 'b0000000-0000-4000-8000-000000000121'
export const QA_CIRCLE_B_ID = 'b0000000-0000-4000-8000-000000000122'

export const QA_PERSONAS = {
  joao: { accountId: QA_JOAO_ACCOUNT_ID, authSubject: QA_JOAO_AUTH_SUBJECT, email: 'qa-joao@aiyracare.local' },
  maria: { accountId: QA_MARIA_ACCOUNT_ID, authSubject: QA_MARIA_AUTH_SUBJECT, email: 'qa-maria@aiyracare.local' },
  francisco: {
    accountId: QA_FRANCISCO_ACCOUNT_ID,
    authSubject: QA_FRANCISCO_AUTH_SUBJECT,
    email: 'qa-francisco@aiyracare.local',
  },
  vitoria: {
    accountId: QA_VITORIA_ACCOUNT_ID,
    authSubject: QA_VITORIA_AUTH_SUBJECT,
    email: 'qa-vitoria@aiyracare.local',
  },
}
