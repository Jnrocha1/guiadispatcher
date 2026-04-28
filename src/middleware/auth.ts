import { FastifyRequest, FastifyReply } from 'fastify'

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.status(401).send({ error: 'Token inválido ou expirado.' })
  }
}

// Helper para pegar o tenant do token (disponível em todas as rotas autenticadas)
export function getTenantId(request: FastifyRequest): string {
  const payload = request.user as { tenantId: string; email: string }
  return payload.tenantId
}
