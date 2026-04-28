import { prisma } from '../lib/prisma.js'
import { sendDocumentToClient } from './whatsapp.service.js'

interface SendDocumentParams {
  tenantId: string
  clientId?: string
  clientPhone: string
  clientName: string
  fileName: string
  fileUrl: string
  // Dados extraídos pela IA (opcionais no MVP, obrigatórios no Pro)
  docType?: string
  docValue?: string
  docDueDate?: string
  customMessage?: string
}

export async function sendDocumentToClientWithLog(params: SendDocumentParams) {
  // Monta mensagem padrão se não vier customizada
  const message = params.customMessage ?? buildDefaultMessage(params)

  // Cria log de envio ANTES de enviar (para rastreio)
  const log = await prisma.sendLog.create({
    data: {
      tenantId: params.tenantId,
      clientId: params.clientId,
      clientPhone: params.clientPhone,
      fileName: params.fileName,
      fileUrl: params.fileUrl,
      docType: params.docType,
      docValue: params.docValue,
      docDueDate: params.docDueDate,
      message,
      status: 'PENDING',
    },
  })

  // Dispara o envio (pode ser assíncrono via fila no Pro)
  return sendDocumentToClient({
    tenantId: params.tenantId,
    phone: params.clientPhone,
    fileName: params.fileName,
    fileUrl: params.fileUrl,
    message,
    logId: log.id,
  })
}

export async function getSendLogs(
  tenantId: string,
  filters?: {
    status?: string
    clientId?: string
    from?: Date
    to?: Date
    page?: number
    limit?: number
  }
) {
  const page = filters?.page ?? 1
  const limit = filters?.limit ?? 20
  const skip = (page - 1) * limit

  const where: any = { tenantId }
  if (filters?.status) where.status = filters.status
  if (filters?.clientId) where.clientId = filters.clientId
  if (filters?.from || filters?.to) {
    where.createdAt = {}
    if (filters.from) where.createdAt.gte = filters.from
    if (filters.to) where.createdAt.lte = filters.to
  }

  const [logs, total] = await Promise.all([
    prisma.sendLog.findMany({
      where,
      include: { client: { select: { name: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.sendLog.count({ where }),
  ])

  return { logs, total, page, pages: Math.ceil(total / limit) }
}

export async function getDashboardStats(tenantId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [total, sent, failed, pending, today_count] = await Promise.all([
    prisma.sendLog.count({ where: { tenantId } }),
    prisma.sendLog.count({ where: { tenantId, status: 'SENT' } }),
    prisma.sendLog.count({ where: { tenantId, status: 'FAILED' } }),
    prisma.sendLog.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.sendLog.count({ where: { tenantId, createdAt: { gte: today } } }),
  ])

  return { total, sent, failed, pending, today: today_count }
}

function buildDefaultMessage(params: SendDocumentParams): string {
  let msg = `Olá, ${params.clientName}! 👋\n\n`

  if (params.docType) {
    msg += `Segue seu(sua) *${params.docType}*`
    if (params.docValue) msg += ` no valor de *R$ ${params.docValue}*`
    if (params.docDueDate) msg += `\n📅 Vencimento: *${params.docDueDate}*`
    msg += '\n\n'
  } else {
    msg += `Segue o documento *${params.fileName}*.\n\n`
  }

  msg += 'Qualquer dúvida, estamos à disposição. 😊'
  return msg
}
