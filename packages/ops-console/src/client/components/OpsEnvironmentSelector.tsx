import { Segmented, Tooltip } from 'antd'
import type { OpsEnvTarget } from '../ops.types.js'

const STORAGE_KEY = 'ops-console-env-target'

export function readStoredEnvTarget(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}

export function storeEnvTarget(id: string): void {
  localStorage.setItem(STORAGE_KEY, id)
}

export function OpsEnvironmentSelector({
  targets,
  value,
  onChange,
}: {
  targets: OpsEnvTarget[]
  value: string
  onChange: (id: string) => void
}) {
  const options = targets.map((t) => ({
    label: t.enabled
      ? t.label
      : (
        <Tooltip title="Indisponível — configure OPS_ENV_TARGETS">
          <span style={{ opacity: 0.45 }}>{t.label}</span>
        </Tooltip>
      ),
    value: t.id,
    disabled: !t.enabled,
  }))

  return (
    <Segmented
      className="ops-env-selector"
      options={options}
      value={value}
      onChange={(v) => onChange(String(v))}
      size="middle"
    />
  )
}
