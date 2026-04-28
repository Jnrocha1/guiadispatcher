#!/bin/bash
echo "🔧 Gerando Prisma Client..."
npx prisma generate

echo "🏗 Compilando TypeScript..."
npx tsc

echo "✅ Build concluído!"
