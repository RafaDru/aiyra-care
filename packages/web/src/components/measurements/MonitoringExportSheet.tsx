import type { MonitoringExportReport } from '../../lib/api.types.js'
import { MeasurementChartGrid } from './MeasurementChartGrid.js'
import type { MeasurementChartSeries } from './measurement-chart.types.js'
import './monitoring-export.css'

interface Props {
  report: MonitoringExportReport
  patientName: string
  threadTitle?: string
}

export function MonitoringExportSheet({ report, patientName, threadTitle }: Props) {
  const series = report.series as MeasurementChartSeries[]

  return (
    <div className="monitoring-export-sheet">
      <header>
        <h1>Relatório de monitoramento</h1>
        <p className="monitoring-export-muted">Para uso em consulta médica — não substitui prontuário.</p>
      </header>

      <section>
        <h2>{patientName}</h2>
        {threadTitle && <p><strong>Episódio:</strong> {threadTitle}</p>}
        <p className="monitoring-export-muted">
          Gerado em {new Date(report.generatedAt).toLocaleString('pt-BR')}
        </p>
      </section>

      {report.stats.length > 0 && (
        <section>
          <h3>Resumo</h3>
          <table className="monitoring-export-table">
            <thead>
              <tr>
                <th>Parâmetro</th>
                <th>N</th>
                <th>Min</th>
                <th>Max</th>
                <th>Último</th>
              </tr>
            </thead>
            <tbody>
              {report.stats.map((s) => (
                <tr key={s.typeCode}>
                  <td>{s.labelKey}</td>
                  <td>{s.count}</td>
                  <td>{s.min ?? '—'}</td>
                  <td>{s.max ?? '—'}</td>
                  <td>{s.last != null ? `${s.last}${s.unit ? ` ${s.unit}` : ''}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {series.length > 0 && (
        <section className="monitoring-export-charts">
          <h3>Gráficos</h3>
          <MeasurementChartGrid series={series} minColumnWidth={320} />
        </section>
      )}

      <section>
        <h3>Linha do tempo</h3>
        <table className="monitoring-export-table">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Registro</th>
              <th>Obs.</th>
            </tr>
          </thead>
          <tbody>
            {report.timeline.map((row) => (
              <tr key={`${row.kind}-${row.id}`}>
                <td>{new Date(row.at).toLocaleString('pt-BR')}</td>
                <td>{row.display || row.labelKey}</td>
                <td>{row.notes ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
