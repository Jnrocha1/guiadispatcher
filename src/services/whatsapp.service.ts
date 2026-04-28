import axios from 'axios'
import { prisma } from '../lib/prisma.js'

const evolutionApi = axios.create({
  baseURL: process.env.EVOLUTION_API_URL,
  headers: {
    apikey: process.env.EVOLUTION_API_KEY,
    'Content-Type': 'application/json',
  },
})

// Cada tenant tem sua própria instância na Evolution API
function getInstanceName(tenantId: string) {
  return `guia_${tenantId.slice(0, 8)}`
}

// Criar instância WhatsApp para o tenant
export async function createWhatsappInstance(tenantId: string) {
  const instance = getInstanceName(tenantId)

  const res = await evolutionApi.post('/instance/create', {
    instanceName: instance,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
  })

  await prisma.whatsappConnection.upsert({
    where: { tenantId },
    create: { tenantId, instance, status: 'CONNECTING' },
    update: { instance, status: 'CONNECTING' },
  })

  return { instance, qrcode: res.data.qrcode }
}

// Buscar QR code para conectar
export async function getQrCode(tenantId: string) {
  const conn = await prisma.whatsappConnection.findUnique({ where: { tenantId } })
  if (!conn) throw new Error('Instância WhatsApp não criada. Crie primeiro.')

  const res = await evolutionApi.get(`/instance/connect/${conn.instance}`)
  return res.data
}

// Status da conexão
export async function getConnectionStatus(tenantId: string) {
  const conn = await prisma.whatsappConnection.findUnique({ where: { tenantId } })
  if (!conn) return { status: 'NOT_CREATED' }

  try {
    const res = await evolutionApi.get(`/instance/connectionState/${conn.instance}`)
    const state = res.data?.instance?.state

    const status = state === 'open' ? 'CONNECTED' : 'DISCONNECTED'

    // Atualiza no banco
    await prisma.whatsappConnection.update({
      where: { tenantId },
      data: { status },
    })

    return { status, instance: conn.instance, phone: conn.phone }
  } catch {
    return { status: 'DISCONNECTED' }
  }
}

// Desconectar instância
export async function disconnectWhatsapp(tenantId: string) {
  const conn = await prisma.whatsappConnection.findUnique({ where: { tenantId } })
  if (!conn) throw new Error('Instância não encontrada.')

  await evolutionApi.delete(`/instance/logout/${conn.instance}`)

  await prisma.whatsappConnection.update({
    where: { tenantId },
    data: { status: 'DISCONNECTED', phone: null },
  })

  return { ok: true }
}

// ENVIAR MENSAGEM DE TEXTO
export async function sendTextMessage(
  tenantId: string,
  phone: string,
  message: string
) {
  const conn = await prisma.whatsappConnection.findUnique({ where: { tenantId } })
  if (!conn || conn.status !== 'CONNECTED') {
    throw new Error('WhatsApp não conectado. Escaneie o QR code primeiro.')
  }

  // Formata número: DDI + DDD + número sem caracteres especiais
  const formattedPhone = formatPhone(phone)

  const res = await evolutionApi.post(`/message/sendText/${conn.instance}`, {
    number: formattedPhone,
    text: message,
  })

  return res.data
}

// ENVIAR DOCUMENTO (PDF, boleto, etc)
export async function sendDocument(
  tenantId: string,
  phone: string,
  fileUrl: string,
  fileName: string,
  caption: string
) {
  const conn = await prisma.whatsappConnection.findUnique({ where: { tenantId } })
  if (!conn || conn.status !== 'CONNECTED') {
    throw new Error('WhatsApp não conectado. Escaneie o QR code primeiro.')
  }

  const formattedPhone = formatPhone(phone)

  const res = await evolutionApi.post(`/message/sendMedia/${conn.instance}`, {
    number: formattedPhone,
    mediatype: 'document',
    mimetype: 'application/pdf',
    media: fileUrl,
    fileName,
    caption,
  })

  return res.data
}

// ENVIO COMPLETO: texto + documento
export async function sendDocumentToClient(params: {
  tenantId: string
  phone: string
  fileName: string
  fileUrl: string
  message: string
  logId?: string
}) {
  try {
    const result = await sendDocument(
      params.tenantId,
      params.phone,
      params.fileUrl,
      params.fileName,
      params.message
    )

    // Atualiza log como enviado
    if (params.logId) {
      await prisma.sendLog.update({
        where: { id: params.logId },
        data: { status: 'SENT', sentAt: new Date() },
      })
    }

    return { success: true, data: result }
  } catch (err: any) {
    // Atualiza log como falho
    if (params.logId) {
      await prisma.sendLog.update({
        where: { id: params.logId },
        data: {
          status: 'FAILED',
          errorMsg: err.message,
          retries: { increment: 1 },
        },
      })
    }
    throw err
  }
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  // Se já tem DDI (55 para Brasil)
  if (digits.startsWith('55') && digits.length >= 12) return digits

  // Adiciona DDI Brasil
  return `55${digits}`
}
