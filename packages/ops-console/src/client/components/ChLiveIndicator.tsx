import { Tag } from 'antd'

export type ChLiveConnectionState = 'live' | 'reconnecting' | 'offline'

const LABEL: Record<ChLiveConnectionState, string> = {
  live: 'Ao vivo',
  reconnecting: 'Reconectando…',
  offline: 'Offline',
}

const COLOR: Record<ChLiveConnectionState, string> = {
  live: 'success',
  reconnecting: 'warning',
  offline: 'default',
}

export function ChLiveIndicator({ state }: { state: ChLiveConnectionState }) {
  return (
    <Tag color={COLOR[state]} style={{ margin: 0 }}>
      {LABEL[state]}
    </Tag>
  )
}
