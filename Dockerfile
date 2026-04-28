FROM node:22.14.0-alpine 
WORKDIR /app 
COPY package*.json ./ 
RUN npm ci 
COPY . . 
RUN DATABASE_URL="postgresql://dummy:dummy@localhost/dummy" npx prisma generate 
EXPOSE 3000 
CMD ["npx", "tsx", "src/server.ts"]
