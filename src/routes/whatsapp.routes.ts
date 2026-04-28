import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate, getTenantId } from '../middleware/auth.js'
import {
  createWhatsappInstance,
  getQrCode,
  getConnectionStatus,
  disconnectWhatsapp,
} from '../services/whatsapp.service.js'
import { sendDocumentToClientWithLog, getSendLogs, getDashboardStats } from '../services/send.service.js'

const sendSchema = z.object({
  clientId: z.string().optional(),
  clientPhone: z.string().min(10),
  clientName: z.string().min(1),
  fileName: z.string().min(1),
  fileUrl: z.string().url('URL do arquivo inválida'),
  docType: z.string().optional(),
  docValue: z.string().optional(),
  docDueDate: z.string().optional(),
  customMessage: z.string().optional(),
})

export async function whatsappRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // POST /whatsapp/connect — cria instância e retorna QR code
  app.post('/whatsapp/connect', async (request, reply) => {
    const tenantId = getTenantId(request)
    try {
      const result = await createWhatsappInstance(tenantId)
      return reply.send(result)
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // GET /whatsapp/qrcode — busca QR code para escanear
  app.get('/whatsapp/qrcode', async (request, reply) => {
    const tenantId = getTenantId(request)
    try {
      const result = await getQrCode(tenantId)
      return reply.send(result)
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // GET /whatsapp/status — status da conexão
  app.get('/whatsapp/status', async (request, reply) => {
    const tenantId = getTenantId(request)
    const status = await getConnectionStatus(tenantId)
    return reply.send(status)
  })

  // POST /whatsapp/disconnect
  app.post('/whatsapp/disconnect', async (request, reply) => {
    const tenantId = getTenantId(request)
    try {
      await disconnectWhatsapp(tenantId)
      return reply.send({ ok: true })
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // POST /whatsapp/send — envia documento para um cliente
  app.post('/whatsapp/send', async (request, reply) => {
    const tenantId = getTenantId(request)
    const body = sendSchema.safeParse(request.body)

    if (!body.success) {
      return reply.status(400).send({ error: body.error.errors[0].message })
    }

    try {
      const result = await sendDocumentToClientWithLog({ tenantId, ...body.data })
      return reply.send({ ok: true, data: result })
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  // GET /whatsapp/logs — histórico de envios
  app.get('/whatsapp/logs', async (request, reply) => {
    const tenantId = getTenantId(request)
    const query = request.query as any

    const logs = await getSendLogs(tenantId, {
      status: query.status,
      clientId: query.clientId,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 20,
    })

    return reply.send(logs)
  })

  // GET /whatsapp/stats — stats do dashboard
  app.get('/whatsapp/stats', async (request, reply) => {
    const tenantId = getTenantId(request)
    const stats = await getDashboardStats(tenantId)
    return reply.send(stats)
  })
}
