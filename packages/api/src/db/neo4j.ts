import neo4j, { type AuthToken } from 'neo4j-driver'

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687'
const user = process.env.NEO4J_USER || 'neo4j'
const password = process.env.NEO4J_PASSWORD || ''

const authToken: AuthToken = password
  ? neo4j.auth.basic(user, password)
  : (neo4j.auth as unknown as { none: () => AuthToken }).none()

export const neo4jDriver = neo4j.driver(uri, authToken)

export const neo4jSession = () => neo4jDriver.session()
