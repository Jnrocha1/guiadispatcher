FROM node:22.14.0-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx tsc
EXPOSE 3000
CMD ["npx", "prisma", "generate", "&&", "node", "dist/server.js"]