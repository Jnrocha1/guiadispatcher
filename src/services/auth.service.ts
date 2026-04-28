import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma.js'

const SALT_ROUNDS = 12

export async function registerTenant(data: {
  name: string
  email: string
  password: string
}) {
  const existing = await prisma.tenant.findUnique({ where: { email: data.email } })
  if (existing) {
    throw new Error('Email já cadastrado.')
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS)

  // Trial de 7 dias
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 7)

  const tenant = await prisma.tenant.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      trialEndsAt,
    },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      trialEndsAt: true,
      createdAt: true,
    },
  })

  return tenant
}

export async function loginTenant(data: { email: string; password: string }) {
  const tenant = await prisma.tenant.findUnique({ where: { email: data.email } })

  if (!tenant) {
    throw new Error('Credenciais inválidas.')
  }

  if (!tenant.active) {
    throw new Error('Conta desativada. Entre em contato com o suporte.')
  }

  const valid = await bcrypt.compare(data.password, tenant.passwordHash)
  if (!valid) {
    throw new Error('Credenciais inválidas.')
  }

  return {
    id: tenant.id,
    name: tenant.name,
    email: tenant.email,
    plan: tenant.plan,
    trialEndsAt: tenant.trialEndsAt,
  }
}

export async function getTenantProfile(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      active: true,
      trialEndsAt: true,
      createdAt: true,
      _count: {
        select: {
          clients: true,
          sendLogs: true,
        },
      },
    },
  })

  if (!tenant) throw new Error('Tenant não encontrado.')
  return tenant
}
