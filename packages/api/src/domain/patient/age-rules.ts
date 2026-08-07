const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000

export function ageInYears(birthDate: Date, at = Date.now()): number {
  return (at - birthDate.getTime()) / MS_PER_YEAR
}

export function isAdultBirthDate(birthDate: Date, at = Date.now()): boolean {
  return ageInYears(birthDate, at) >= 18
}

export function isMinorBirthDate(birthDate: Date, at = Date.now()): boolean {
  return ageInYears(birthDate, at) < 18
}
