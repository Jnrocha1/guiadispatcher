import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate, getTenantId } from '../middleware/auth.js'
import {
  listClients,
  createClient,
  updateClient,
  deleteClient,
  importClientsFromArray,
} from '../services/client.service.js'

const clientSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10, 'Telefone inválido'),
  document: z.string().optional(),
})

export async function clientRoutes(app: FastifyInstance) {
  // Todas as rotas de clientes exigem autenticação
  app.addHook('preHandler', authenticate)

  // GET /clients
  app.get('/clients', async (request, reply) => {
    const tenantId = getTenantId(request)
    const clients = await listClients(tenantId)
    return reply.send(clients)
  })

  // POST /clients
  app.post('/clients', async (request, reply) => {
    const tenantId = getTenantId(request)
    const body = clientSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: body.error.errors[0].message })
    }

    try {
      const client = await createClient(tenantId, body.data)
      return reply.status(201).send(client)
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // PUT /clients/:id
  app.put('/clients/:id', async (request, reply) => {
    const tenantId = getTenantId(request)
    const { id } = request.params as { id: string }
    const body = clientSchema.partial().safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: body.error.errors[0].message })
    }

    try {
      const client = await updateClient(tenantId, id, body.data)
      return reply.send(client)
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // DELETE /clients/:id
  app.delete('/clients/:id', async (request, reply) => {
    const tenantId = getTenantId(request)
    const { id } = request.params as { id: string }

    try {
      await deleteClient(tenantId, id)
      return reply.send({ ok: true })
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // POST /clients/import — importação em massa via JSON
  app.post('/clients/import', async (request, reply) => {
    const tenantId = getTenantId(request)
    const body = request.body as { clients: any[] }

    if (!Array.isArray(body?.clients)) {
      return reply.status(400).send({ error: 'Envie um array em "clients".' })
    }

    const result = await importClientsFromArray(tenantId, body.clients)
    return reply.send(result)
  })
}
