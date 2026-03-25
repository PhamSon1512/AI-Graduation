FROM node:20-bookworm-slim

WORKDIR /app

# Prisma cần có trước khi postinstall chạy prisma generate
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Koyeb gán PORT khi chạy; migrate cần DATABASE_URL lúc start
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
