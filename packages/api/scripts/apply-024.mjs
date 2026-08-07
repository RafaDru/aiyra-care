import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pgPool } from '../src/db/postgres.ts'

const dir = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(resolve(dir, '../../../database/relational/024_clinical_entity_links.sql'), 'utf8')

await pgPool.query(sql)
console.log('Applied 024_clinical_entity_links.sql')
await pgPool.end()
