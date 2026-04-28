FROM node:22.14.0-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "--import", "tsx", "src/server.ts"]
