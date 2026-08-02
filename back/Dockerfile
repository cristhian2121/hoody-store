FROM node:24-slim

WORKDIR /app

# Install procps for ps command (needed by ts-node-dev/nodemon)
RUN apt-get update && apt-get install -y procps openssl && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || npm install
# Copy Prisma schema
COPY prisma ./prisma

# Copy static assets (product photos served at /static)
COPY public ./public

# Copy print fonts. La app no arranca si faltan: el render del estampado los
# necesita y una sustitucion silenciosa imprimiria otra tipografia.
COPY assets ./assets

# Generate Prisma Client
RUN npx prisma generate || echo "Prisma generate skipped (will run on startup)"

# Copy application code
COPY . .

# Build TypeScript
RUN npm run build || echo "Build skipped (will run on startup)"

# Expose port
EXPOSE 4242

# Default command (can be overridden in docker-compose)
CMD ["npm", "run", "dev"]
