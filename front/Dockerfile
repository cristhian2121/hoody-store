FROM node:24-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile || npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 8080

# Default command (can be overridden in docker-compose)
# --host 0.0.0.0 allows external connections in Docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
