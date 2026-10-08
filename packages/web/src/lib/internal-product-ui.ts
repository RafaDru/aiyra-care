/**
 * Internal-only surfaces (roadmap, dev session log) in the end-user web app.
 * Default build: hidden — redirect `/roadmap` to home.
 * Ops/local: set `VITE_INTERNAL_ROADMAP=1` in the web env to expose `/roadmap`.
 */
export function isInternalRoadmapEnabled(): boolean {
  const raw = (import.meta.env.VITE_INTERNAL_ROADMAP as string | undefined)?.trim().toLowerCase()
  return raw === '1' || raw === 'true'
}
