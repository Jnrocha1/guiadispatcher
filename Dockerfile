FROM node:22.14.0-alpine 
WORKDIR /app 
COPY package*.json ./ 
RUN npm ci 
COPY . . 
RUN npx prisma generate --no-engine 
EXPOSE 3000 
CMD ["npx", "tsx", "src/server.ts"]
