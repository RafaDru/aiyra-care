const REFRESH_EVENT = 'aiyracare:patients-list-changed'

/** Dispare após criar, excluir ou importar perfis para sincronizar lentes (dia a dia, Ava). */
export function notifyPatientsListChanged(): void {
  window.dispatchEvent(new CustomEvent(REFRESH_EVENT))
}

export function subscribePatientsListChanged(handler: () => void): () => void {
  const listener = () => handler()
  window.addEventListener(REFRESH_EVENT, listener)
  return () => window.removeEventListener(REFRESH_EVENT, listener)
}