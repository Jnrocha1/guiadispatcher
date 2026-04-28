import 'dotenv/config'
import Fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyCors from '@fastify/cors'
import fastifyMultipart from '@fastify/multipart'

import { authRoutes } from './routes/auth.routes.js'
import { clientRoutes } from './routes/client.routes.js'
import { whatsappRoutes } from './routes/whatsapp.routes.js'

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  },
})

// ─── Plugins ───────────────────────────────────────────────────────────────
await app.register(fastifyCors, {
  origin: process.env.CORS_ORIGIN ?? '*',
  credentials: true,
})

await app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
})

await app.register(fastifyMultipart, {
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
})

// ─── Rotas ─────────────────────────────────────────────────────────────────
await app.register(authRoutes)
await app.register(clientRoutes)
await app.register(whatsappRoutes)

// Health check
app.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '1.0.0',
}))

// ─── Start ─────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '3000')

try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`\n🚀 GuiaDispatcher API rodando em http://localhost:${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/health\n`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

export default app
