/**
 * Um browser Playwright/CDP pesado por vez — evita corrida no sync geral.
 */
let chain: Promise<void> = Promise.resolve()

export function withBrowserSyncMutex<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(() => task())
  chain = run.then(() => undefined, () => undefined)
  return run
}
