import type { AvaOpenRequest } from './ava-entity-pin'

type Listener = (request: AvaOpenRequest) => void

const listeners = new Set<Listener>()

export function requestAvaOpen(request: AvaOpenRequest): void {
  for (const handler of listeners) handler(request)
}

export function subscribeAvaOpen(handler: (request: AvaOpenRequest) => void): () => void {
  listeners.add(handler)
  return () => listeners.delete(handler)
}
