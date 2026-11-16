# Konkretna wersja obrazu bazowego: Node.js 22 na lekkim Alpine Linux
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Najpierw tylko pliki zależności: warstwa z npm ci jest brana z cache, dopóki nie zmieni się package*.json
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Potem reszta kodu (zmiana w src/ przebudowuje tylko tę warstwę)
COPY . .

# Aplikacja nie musi działać jako root
USER node

EXPOSE 3000

# Migracje przy starcie kontenera. exec: node zostaje procesem PID 1 i sam dostaje SIGTERM (graceful shutdown)
CMD ["sh", "-c", "node_modules/.bin/knex migrate:latest && exec node src/server.js"]
