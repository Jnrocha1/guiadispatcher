import { prisma } from '../lib/prisma.js'

export async function listClients(tenantId: string) {
  return prisma.client.findMany({
    where: { tenantId, active: true },
    orderBy: { name: 'asc' },
  })
}

export async function createClient(
  tenantId: string,
  data: { name: string; phone: string; document?: string }
) {
  // Normaliza telefone: só números
  const phone = data.phone.replace(/\D/g, '')

  const existing = await prisma.client.findUnique({
    where: { tenantId_phone: { tenantId, phone } },
  })
  if (existing) throw new Error('Cliente com esse telefone já existe.')

  return prisma.client.create({
    data: { tenantId, name: data.name, phone, document: data.document },
  })
}

export async function updateClient(
  tenantId: string,
  clientId: string,
  data: { name?: string; phone?: string; document?: string }
) {
  // Garante que o cliente pertence ao tenant (isolamento)
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId },
  })
  if (!client) throw new Error('Cliente não encontrado.')

  const phone = data.phone ? data.phone.replace(/\D/g, '') : undefined

  return prisma.client.update({
    where: { id: clientId },
    data: { name: data.name, phone, document: data.document },
  })
}

export async function deleteClient(tenantId: string, clientId: string) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId },
  })
  if (!client) throw new Error('Cliente não encontrado.')

  // Soft delete
  return prisma.client.update({
    where: { id: clientId },
    data: { active: false },
  })
}

export async function importClientsFromArray(
  tenantId: string,
  clients: Array<{ name: string; phone: string; document?: string }>
) {
  const results = { created: 0, skipped: 0, errors: [] as string[] }

  for (const c of clients) {
    try {
      await createClient(tenantId, c)
      results.created++
    } catch (err: any) {
      if (err.message.includes('já existe')) {
        results.skipped++
      } else {
        results.errors.push(`${c.name}: ${err.message}`)
      }
    }
  }

  return results
}
