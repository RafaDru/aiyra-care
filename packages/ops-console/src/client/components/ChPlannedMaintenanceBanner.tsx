import { ToolOutlined } from '@ant-design/icons'

export function ChPlannedMaintenanceBanner() {
  return (
    <div className="ch-planned-maintenance-banner" role="status">
      <ToolOutlined aria-hidden />
      <span>
        <strong>Manutenção planejada</strong> — Command Hub em modo somente leitura. Ingest e
        chamados humanos seguem na API; auto-INC do bridge e ações automáticas do console estão
        pausadas.
      </span>
    </div>
  )
}
