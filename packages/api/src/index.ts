import Fastify from 'fastify'
import { config } from 'dotenv'

config()

const app = Fastify({ logger: true })

app.get('/health', async () => {
  return { status: 'ok', version: '0.1.0', service: 'open-health-api' }
})

const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
