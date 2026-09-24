const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')
const designTokensRoot = path.resolve(workspaceRoot, 'packages/design-tokens')

const config = getDefaultConfig(projectRoot)

// Só o app + design-tokens — evita rebuild infinito ao gravar api.log/web.log no repo.
config.watchFolders = [projectRoot, designTokensRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

config.resolver.unstable_enablePackageExports = true

config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : []),
  /[\\/]packages[\\/](api|web|connect|connect-worker|neo4j-lineage-worker|agents)[\\/]/,
]

module.exports = config
