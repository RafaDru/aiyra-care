import {
  getOpsFeatureCatalog,
  resolveOpsFeatureEntry,
} from '../../../api/src/domain/ops/ops-feature-catalog.js'

export { getOpsFeatureCatalog, resolveOpsFeatureEntry }

export function resolveClientFeatureLabel(featureKey: string): string {
  return resolveOpsFeatureEntry(featureKey).label
}

export function resolveClientFeatureArea(featureKey: string): string {
  return resolveOpsFeatureEntry(featureKey).area
}
