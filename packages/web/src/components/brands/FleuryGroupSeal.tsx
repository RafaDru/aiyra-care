import { Tooltip } from 'antd'
import { FLEURY_GROUP_LABEL } from './fleury-group-config.js'

interface Props {
  size?: 'sm' | 'md'
}

/** Selo compacto «Grupo Fleury» para exames Precision Care. */
export function FleuryGroupSeal({ size = 'sm' }: Props) {
  const fontSize = size === 'sm' ? 10 : 11
  const padY = size === 'sm' ? 1 : 2
  const padX = size === 'sm' ? 6 : 8

  return (
    <Tooltip title="Ecossistema Grupo Fleury — Precision Care">
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: `${padY}px ${padX}px`,
          borderRadius: 999,
          background: '#EA1B2314',
          border: '1px solid #EA1B2340',
          color: '#EA1B23',
          fontSize,
          fontWeight: 700,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
        }}
      >
        {FLEURY_GROUP_LABEL}
      </span>
    </Tooltip>
  )
}
