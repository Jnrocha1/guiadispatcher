import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { registerTenant, loginTenant, getTenantProfile } from '../services/auth.service.js'
import { authenticate, getTenantId } from '../middleware/auth.js'

const registerSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register
  app.post('/auth/register', async (request, reply) => {
    const body = registerSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: body.error.errors[0].message })
    }

    try {
      const tenant = await registerTenant(body.data)
      const token = app.jwt.sign(
        { tenantId: tenant.id, email: tenant.email },
        { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' }
      )
      return reply.status(201).send({ token, tenant })
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // POST /auth/login
  app.post('/auth/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Dados inválidos.' })
    }

    try {
      const tenant = await loginTenant(body.data)
      const token = app.jwt.sign(
        { tenantId: tenant.id, email: tenant.email },
        { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' }
      )
      return reply.send({ token, tenant })
    } catch (err: any) {
      return reply.status(401).send({ error: err.message })
    }
  })

  // GET /auth/me — perfil do tenant logado
  app.get('/auth/me', { preHandler: authenticate }, async (request, reply) => {
    try {
      const tenantId = getTenantId(request)
      const profile = await getTenantProfile(tenantId)
      return reply.send(profile)
    } catch (err: any) {
      return reply.status(404).send({ error: err.message })
    }
  })
}
