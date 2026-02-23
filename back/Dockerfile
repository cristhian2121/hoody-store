FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile || npm install

# Copy Prisma schema
COPY prisma ./prisma

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
