import type { ToastKind } from '@/contexts/ToastContext'

type ToastApi = {
  error: (message: string) => void
  show: (kind: ToastKind, message: string) => void
}

let toast: ToastApi | null = null

export function bindClientErrorToast(next: ToastApi | null): void {
  toast = next
}

export function getClientErrorToast(): ToastApi | null {
  return toast
}
