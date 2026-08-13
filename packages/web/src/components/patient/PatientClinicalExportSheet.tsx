import type { PatientContext, PatientClinicalExportSections } from '../../lib/api.types.js'
import { CLINICAL_EXPORT_COPY } from './clinical-export-copy.js'
import { HEALTH_THREAD_STATUS_LABEL, healthThreadKindLabel } from './health-thread-kinds.js'
import { timelineKindMeta } from './timeline-kind-meta.js'
import { PENDENCY_KIND_LABEL } from './pendency-kind-label.js'
import './patient-clinical-export.css'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR')
}

interface PatientClinicalExportSheetProps {
  context: PatientContext
  mode?: 'summary' | 'full'
  fullSections?: PatientClinicalExportSections
}

export function PatientClinicalExportSheet({ context, mode = 'summary', fullSections }: PatientClinicalExportSheetProps) {
  const identity = context.identity
  const ageLabel =
    identity.ageYears < 1
      ? `${Math.max(1, Math.round(identity.ageYears * 12))} meses`
      : `${Math.floor(identity.ageYears)} anos`

  const timeline = mode === 'full' ? context.timeline : context.timeline.slice(0, 20)
  const activePlans = context.planMemberships.filter((p) => p.status === 'active')
  const genderLabel =
    identity.gender === 'male'
      ? 'masculino'
      : identity.gender === 'female'
        ? 'feminino'
        : identity.gender

  return (
    <div className="clinical-export-sheet">
      <header className="clinical-export-sheet__header">
        <h1>{mode === 'full' ? CLINICAL_EXPORT_COPY.exportFullTitle : CLINICAL_EXPORT_COPY.title}</h1>
        <p className="clinical-export-sheet__subtitle">{CLINICAL_EXPORT_COPY.subtitle}</p>
      </header>

      <section className="clinical-export-sheet__patient">
        <h2>{identity.name}</h2>
        <p>
          {ageLabel}
          {genderLabel ? ` · ${genderLabel}` : ''}
          {identity.bloodType ? ` · Tipo sanguíneo ${identity.bloodType}` : ''}
        </p>
        <p className="clinical-export-sheet__muted">
          Nascimento: {formatShortDate(identity.birthDate)}
        </p>
      </section>

      <section>
        <h3>{CLINICAL_EXPORT_COPY.sectionSummary}</h3>
        <p>{context.textSummary}</p>
      </section>

      {context.alerts.length > 0 && (
        <section>
          <h3>{CLINICAL_EXPORT_COPY.sectionAlerts}</h3>
          <ul className="clinical-export-sheet__list">
            {context.alerts.map((alert, i) => (
              <li key={`${alert.kind}-${i}`}>
                <strong>{alert.title}</strong>
                {alert.detail ? ` — ${alert.detail}` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3>{CLINICAL_EXPORT_COPY.sectionPendencies}</h3>
        {context.pendencies.length === 0 ? (
          <p className="clinical-export-sheet__muted">{CLINICAL_EXPORT_COPY.noPendencies}</p>
        ) : (
          <ul className="clinical-export-sheet__list">
            {context.pendencies.slice(0, 25).map((item, i) => (
              <li key={`${item.kind}-${i}`}>
                <span className="clinical-export-sheet__tag">
                  {PENDENCY_KIND_LABEL[item.kind] ?? item.kind}
                </span>
                {item.title}
                {item.detail ? ` — ${item.detail}` : ''}
              </li>
            ))}
            {context.pendencies.length > 25 && (
              <li className="clinical-export-sheet__muted">
                … e {context.pendencies.length - 25} mais (veja na ficha do paciente)
              </li>
            )}
          </ul>
        )}
      </section>

      <section>
        <h3>{CLINICAL_EXPORT_COPY.sectionFollowUp}</h3>
        {context.activeThreads.length === 0 ? (
          <p className="clinical-export-sheet__muted">{CLINICAL_EXPORT_COPY.noFollowUp}</p>
        ) : (
          <ul className="clinical-export-sheet__list">
            {context.activeThreads.map((thread) => (
              <li key={thread.id}>
                <strong>{thread.title}</strong>
                {' — '}
                {healthThreadKindLabel(thread.kind as 'task', true)}
                {' · '}
                {HEALTH_THREAD_STATUS_LABEL[thread.status] ?? thread.status}
                {thread.dueDate ? ` · Prazo ${formatShortDate(thread.dueDate)}` : ''}
                {thread.summary ? ` — ${thread.summary}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      {fullSections && (
        <>
          {fullSections.allergies.length > 0 && (
            <section>
              <h3>{CLINICAL_EXPORT_COPY.sectionAllergies}</h3>
              <ul className="clinical-export-sheet__list">
                {fullSections.allergies.map((a, i) => (
                  <li key={`allergy-${i}`}>
                    {a.allergen}
                    {a.severity ? ` — ${a.severity}` : ''}
                    {a.reaction ? ` (${a.reaction})` : ''}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {fullSections.medications.length > 0 && (
            <section>
              <h3>{CLINICAL_EXPORT_COPY.sectionMedications}</h3>
              <ul className="clinical-export-sheet__list">
                {fullSections.medications.map((m, i) => (
                  <li key={`med-${i}`}>
                    {m.name}
                    {m.dose ? ` — ${m.dose}` : ''}
                    {m.frequency ? ` · ${m.frequency}` : ''}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {fullSections.vaccines.length > 0 && (
            <section>
              <h3>{CLINICAL_EXPORT_COPY.sectionVaccines}</h3>
              <ul className="clinical-export-sheet__list">
                {fullSections.vaccines.map((v, i) => (
                  <li key={`vac-${i}`}>
                    {v.name}
                    {v.administeredAt ? ` — ${formatShortDate(v.administeredAt)}` : ''}
                    {v.doseLabel ? ` · ${v.doseLabel}` : ''}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {fullSections.diagnoses.length > 0 && (
            <section>
              <h3>{CLINICAL_EXPORT_COPY.sectionDiagnoses}</h3>
              <ul className="clinical-export-sheet__list">
                {fullSections.diagnoses.map((d, i) => (
                  <li key={`diag-${i}`}>
                    {d.description}
                    {d.code ? ` (${d.code})` : ''}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {fullSections.documents.length > 0 && (
            <section>
              <h3>{CLINICAL_EXPORT_COPY.sectionDocuments}</h3>
              <ul className="clinical-export-sheet__list">
                {fullSections.documents.slice(0, 40).map((d, i) => (
                  <li key={`doc-${i}`}>
                    {d.filename} — {d.type}
                    {d.ocrProcessed ? '' : ' (OCR pendente)'}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <section>
        <h3>{CLINICAL_EXPORT_COPY.sectionPlans}</h3>
        {activePlans.length === 0 ? (
          <p className="clinical-export-sheet__muted">{CLINICAL_EXPORT_COPY.noPlans}</p>
        ) : (
          <ul className="clinical-export-sheet__list">
            {activePlans.map((plan) => (
              <li key={`${plan.operator}-${plan.planName}`}>
                {plan.operator} — {plan.planName}
                {plan.memberNumber ? ` (${plan.memberNumber})` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>{CLINICAL_EXPORT_COPY.sectionTimeline}</h3>
        {timeline.length === 0 ? (
          <p className="clinical-export-sheet__muted">{CLINICAL_EXPORT_COPY.noTimeline}</p>
        ) : (
          <table className="clinical-export-sheet__table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((event, i) => {
                const meta = timelineKindMeta(event.kind)
                return (
                  <tr key={`${event.kind}-${event.entityId ?? i}`}>
                    <td>{formatShortDate(event.date)}</td>
                    <td>{meta.label}</td>
                    <td>
                      {event.title}
                      {event.subtitle ? ` — ${event.subtitle}` : ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      <footer className="clinical-export-sheet__footer">
        <p>
          {CLINICAL_EXPORT_COPY.generatedAt} {formatDate(context.generatedAt)}
        </p>
        <p className="clinical-export-sheet__muted">{CLINICAL_EXPORT_COPY.footerDisclaimer}</p>
      </footer>
    </div>
  )
}

export function printClinicalExportSheet(root: HTMLElement, documentTitle: string): void {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer')
  if (!printWindow) return

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join('')

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${documentTitle}</title>
        ${styles}
      </head>
      <body class="clinical-export-print-root">
        ${root.innerHTML}
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
  printWindow.close()
}
