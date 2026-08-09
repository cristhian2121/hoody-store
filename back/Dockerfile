FROM node:24-slim

WORKDIR /app

# Install procps for ps command (needed by ts-node-dev/nodemon)
RUN apt-get update && apt-get install -y procps openssl && rm -rf /var/lib/apt/lists/*

# Version fijada a proposito. pnpm cambia comportamiento entre mayores (la 11
# dejo de leer el campo "pnpm" de package.json y movio la aprobacion de scripts
# a pnpm-workspace.yaml); con `pnpm` a secas el build se rompe solo el dia que
# salga la 12.
RUN npm install -g pnpm@11

# pnpm-workspace.yaml NO es opcional aqui: es donde vive `allowBuilds`, la lista
# de dependencias autorizadas a correr scripts de instalacion. Sin el, pnpm 11
# omite el postinstall de Prisma, sale con codigo 1 y el cliente de Prisma nunca
# se genera.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Sin `|| npm install`. Ese respaldo tapaba el error real: pnpm fallaba, npm
# arrancaba sobre el node_modules de enlaces que pnpm ya habia creado y moria
# con "Cannot read properties of null (reading 'matches')", que no dice nada
# sobre la causa. Es mejor que falle aqui y se lea el motivo.
RUN pnpm install --frozen-lockfile

# Copy Prisma schema
COPY prisma ./prisma

# Copy static assets (product photos served at /static)
COPY public ./public

# Copy print fonts. La app no arranca si faltan: el render del estampado los
# necesita y una sustitucion silenciosa imprimiria otra tipografia.
COPY assets ./assets

# Generate Prisma Client
RUN npx prisma generate

# Copy application code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 4242

# Default command (can be overridden in docker-compose)
CMD ["npm", "run", "dev"]
