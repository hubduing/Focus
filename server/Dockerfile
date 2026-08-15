# Этап: установка зависимостей
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci

# Этап: сборка (проверка типов)
FROM node:20-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
COPY . .
RUN npx prisma generate --schema server/prisma/schema.prisma
RUN npm run build -w shared
RUN npm run build -w server

# Этап: работа. shared подключается как TS-исходники (exports), поэтому API запускаем через tsx.
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/shared ./shared
COPY --from=build /app/server ./server
COPY --from=build /app/package.json ./package.json
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy --schema server/prisma/schema.prisma && node node_modules/.bin/tsx server/src/index.ts"]