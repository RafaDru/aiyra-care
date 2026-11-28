/** Sentinel 1px antes do rail macro sticky — direciona `macroProgress` no scroll. */
export function PatientChromeMacroSentinel() {
  return (
    <div
      className="patient-chrome-macro-sentinel"
      data-patient-chrome-macro-sentinel
      aria-hidden
    />
  )
}