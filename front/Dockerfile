FROM node:24-slim

WORKDIR /app

# Version fijada: pnpm cambia comportamiento entre mayores y un build que hoy
# funciona no deberia romperse solo cuando salga la proxima.
RUN npm install -g pnpm@11

# pnpm-workspace.yaml lleva `allowBuilds` (esbuild y @swc/core necesitan correr
# su script de instalacion para bajar el binario de su plataforma). Sin el, pnpm
# los omite y sale con codigo 1.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Sin `|| npm install`: ese respaldo tapaba el error real y terminaba en un
# fallo de npm que no explica nada.
RUN pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Expose port
EXPOSE 8080

# Default command (can be overridden in docker-compose)
# --host 0.0.0.0 allows external connections in Docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
