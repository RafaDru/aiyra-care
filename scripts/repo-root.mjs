import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

/** Raiz do monorepo (scripts/ → ..). */
export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
