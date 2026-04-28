# GuiaDispatcher — Backend API

Sistema SaaS multi-tenant para envio automático de documentos via WhatsApp.

---

## Stack

- **Runtime**: Node.js 20+
- **Framework**: Fastify
- **ORM**: Prisma + PostgreSQL
- **Auth**: JWT
- **WhatsApp**: Evolution API (open source)
- **Filas**: BullMQ + Redis (Fase 2)
- **IA**: Claude API — leitura de PDFs (Fase 2)

---

## Setup local

### 1. Pré-requisitos

- Node.js 20+
- PostgreSQL rodando localmente
- Redis (opcional no MVP)
- Evolution API rodando (ver abaixo)

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env com suas credenciais
```

### 4. Banco de dados

```bash
npm run db:generate   # gera o Prisma Client
npm run db:migrate    # cria as tabelas
```

### 5. Rodar em desenvolvimento

```bash
npm run dev
```

API disponível em: `http://localhost:3000`

---

## Evolution API (WhatsApp) — Setup

A Evolution API é open source e gratuita. Para rodar localmente com Docker:

```bash
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=sua-api-key \
  atendai/evolution-api:latest
```

Acesse: `http://localhost:8080`

Configure no `.env`:
```
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-api-key
```

---

## Rotas da API

### Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/register` | Cadastro de novo escritório (tenant) |
| POST | `/auth/login` | Login e geração de JWT |
| GET | `/auth/me` | Perfil do tenant logado |

**Registro:**
```json
POST /auth/register
{
  "name": "Escritório Silva & Associados",
  "email": "contato@silva.com.br",
  "password": "senha123"
}
```

**Resposta:**
```json
{
  "token": "eyJhbGc...",
  "tenant": {
    "id": "clx...",
    "name": "Escritório Silva & Associados",
    "email": "contato@silva.com.br",
    "plan": "STARTER",
    "trialEndsAt": "2025-06-27T..."
  }
}
```

---

### Clientes

> Todas as rotas exigem header: `Authorization: Bearer <token>`
> Cada tenant só vê seus próprios clientes (isolamento multi-tenant).

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/clients` | Listar clientes |
| POST | `/clients` | Cadastrar cliente |
| PUT | `/clients/:id` | Atualizar cliente |
| DELETE | `/clients/:id` | Desativar cliente |
| POST | `/clients/import` | Importar em massa (JSON) |

**Criar cliente:**
```json
POST /clients
{
  "name": "João da Silva",
  "phone": "11999990001",
  "document": "123.456.789-00"
}
```

**Importar em massa:**
```json
POST /clients/import
{
  "clients": [
    { "name": "João Silva", "phone": "11999990001" },
    { "name": "Maria Santos", "phone": "11999990002", "document": "12.345.678/0001-99" }
  ]
}
```

---

### WhatsApp

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/whatsapp/connect` | Cria instância e retorna QR code |
| GET | `/whatsapp/qrcode` | Busca QR code atual |
| GET | `/whatsapp/status` | Status da conexão |
| POST | `/whatsapp/disconnect` | Desconectar |
| POST | `/whatsapp/send` | Enviar documento |
| GET | `/whatsapp/logs` | Histórico de envios |
| GET | `/whatsapp/stats` | Estatísticas do dashboard |

**Fluxo de conexão:**
1. `POST /whatsapp/connect` → retorna `qrcode`
2. O usuário escaneia o QR code com o WhatsApp
3. `GET /whatsapp/status` → `{ status: "CONNECTED" }`
4. Pronto para enviar!

**Enviar documento:**
```json
POST /whatsapp/send
{
  "clientPhone": "11999990001",
  "clientName": "João Silva",
  "fileName": "DAS_maio_2025.pdf",
  "fileUrl": "https://seu-storage.com/arquivo.pdf",
  "docType": "DAS",
  "docValue": "234,50",
  "docDueDate": "20/06/2025"
}
```

**Mensagem gerada automaticamente:**
```
Olá, João Silva! 👋

Segue seu(sua) *DAS* no valor de *R$ 234,50*
📅 Vencimento: *20/06/2025*

Qualquer dúvida, estamos à disposição. 😊
```

---

## Arquitetura Multi-Tenant

Cada escritório (tenant) tem:
- `tenant_id` único em todos os registros
- Instância WhatsApp própria na Evolution API
- Clientes isolados — nunca visíveis para outros tenants
- Logs de envio separados

O isolamento é garantido pelo `tenant_id` extraído do JWT em todas as queries.

---

## Próximas Fases

### Fase 2 — IA + automação
- [ ] Leitura automática de PDF com Claude API
- [ ] Monitoramento de pasta Google Drive
- [ ] Filas BullMQ para envios assíncronos
- [ ] Retry automático para envios falhos

### Fase 3 — Cobrança
- [ ] Integração Stripe/Pagar.me
- [ ] Planos e limites por tenant
- [ ] Trial automático de 7 dias
- [ ] Webhooks de pagamento

### Fase 4 — Escala
- [ ] Agendamento de disparos
- [ ] White-label
- [ ] API pública para integrações
- [ ] Dashboard de analytics avançado
