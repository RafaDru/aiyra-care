export interface PatientMatcher {
  findMatchingPatientId(beneficiaryName: string, possiblePatientIds: string[]): Promise<string | null>
}
