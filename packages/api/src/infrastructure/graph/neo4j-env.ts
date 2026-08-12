export function isNeo4jSyncEnabled(): boolean {
  const flag = process.env.NEO4J_SYNC_ENABLED
  return flag === '1' || flag === 'true'
}

/** Leituras do grafo — default: mesmo flag que sync; desligar com NEO4J_READ_ENABLED=0 */
export function isNeo4jReadEnabled(): boolean {
  const readFlag = process.env.NEO4J_READ_ENABLED
  if (readFlag === '0' || readFlag === 'false') return false
  return isNeo4jSyncEnabled()
}
