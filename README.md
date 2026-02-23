# Hoodies - E-commerce Platform

Plataforma de e-commerce para venta de camisetas y hoodies personalizados con estampados (imágenes/texto).

## Arquitectura

El proyecto está organizado en dos aplicaciones principales:

- **Frontend**: React + Vite + TypeScript (puerto 8080)
- **Backend**: Node.js con arquitectura limpia por capas (puerto 4242)
- **Database**: PostgreSQL 16 (puerto 5432)

### Arquitectura Backend

El backend sigue una arquitectura limpia con separación por capas:

```
back/src/
├── api/                    # Capa de presentación
│   ├── controllers/        # Controladores HTTP
│   ├── routes/            # Definición de rutas
│   ├── middleware/        # Middleware (CORS, error handling)
│   └── dto/               # Data Transfer Objects (validación)
├── services/              # Capa de lógica de negocio
│   ├── orders.service.js
│   └── payments.service.js
├── repositories/          # Capa de acceso a datos
│   ├── interfaces/        # Contratos de repositorios
│   └── prisma/           # Implementación con Prisma
├── infrastructure/        # Infraestructura
│   ├── database/         # Cliente Prisma
│   └── http/             # Servidor HTTP
├── config/               # Configuración
└── index.js             # Entry point (Composition Root)
```

## Requisitos Previos

- Docker y Docker Compose instalados
- Node.js 20+ (opcional, para desarrollo local sin Docker)

## Setup Local con Docker Compose

### 1. Configurar Variables de Entorno

Cada servicio lee su propio archivo `.env`. Copia los archivos de ejemplo y configura las variables necesarias:

```bash
# Backend environment variables
cp back/.env.example back/.env

# Frontend environment variables
cp front/.env.example front/.env

# Database variables (optional, for docker-compose.yml)
cp .env.example .env
```

**Backend (`back/.env`):**
- Configura `PORT`, `NODE_ENV`, `FRONTEND_URL`, `BACKEND_URL`
- Configura `DATABASE_URL` (será sobrescrita por docker-compose.yml para usar el servicio 'db')
- Configura `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET`
- Incluye credenciales de PostgreSQL (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`)

**Frontend (`front/.env`):**
- Configura `VITE_API_URL` (URL del backend, normalmente `http://localhost:4242`)
- Configura `FRONTEND_PORT` (usado por docker-compose.yml)

**Raíz (`.env` - opcional):**
- Variables de base de datos para docker-compose.yml si prefieres centralizarlas

### 2. Levantar los Servicios

```bash
# Levantar todos los servicios
docker compose up

# O en modo background
docker compose up -d
```

Esto levantará:
- **PostgreSQL** en `localhost:5432`
- **Backend** en `http://localhost:4242`
- **Frontend** en `http://localhost:8080`

### 3. Verificar que Todo Funciona

- Frontend: http://localhost:8080
- Backend Health Check: http://localhost:4242/health
- Base de datos: PostgreSQL disponible en `localhost:5432`

### 4. Comandos Útiles

```bash
# Ver logs de todos los servicios
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db

# Detener todos los servicios
docker compose down

# Detener y eliminar volúmenes (⚠️ elimina datos de la DB)
docker compose down -v

# Ejecutar comandos dentro de un contenedor
docker compose exec backend npm run prisma:studio
docker compose exec backend npx prisma migrate dev
```

## Desarrollo Local (sin Docker)

Si prefieres desarrollar sin Docker:

### Backend

```bash
cd back

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con DATABASE_URL apuntando a tu PostgreSQL local

# Generar Prisma Client
pnpm run prisma:generate

# Ejecutar migraciones
pnpm run prisma:migrate

# Iniciar servidor en modo desarrollo
pnpm run dev
```

### Frontend

```bash
cd front

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env

# Iniciar servidor de desarrollo
pnpm run dev
```

## Migraciones de Base de Datos

Las migraciones de Prisma se ejecutan automáticamente al iniciar el backend en Docker.

Para ejecutarlas manualmente:

```bash
# Dentro del contenedor backend
docker compose exec backend npx prisma migrate dev

# O localmente (si tienes Node.js instalado)
cd back
npx prisma migrate dev
```

### Prisma Studio (GUI para la base de datos)

```bash
docker compose exec backend npx prisma studio
```

Esto abrirá Prisma Studio en `http://localhost:5555`

## Estructura del Proyecto

```
hoodies/
├── back/                  # Backend API
│   ├── src/
│   │   ├── api/          # Capa API
│   │   ├── services/     # Lógica de negocio
│   │   ├── repositories/ # Acceso a datos
│   │   └── infrastructure/ # Infraestructura
│   ├── prisma/           # Schema y migraciones
│   └── Dockerfile
├── front/                # Frontend React
│   ├── src/
│   └── Dockerfile
├── docker-compose.yml    # Orquestación de servicios
└── .env.example         # Template de variables de entorno
```

## API Endpoints

- `GET /health` - Health check
- `POST /api/orders/checkout` - Crear orden y preferencia de pago
- `GET /api/orders` - Listar todas las órdenes
- `GET /api/orders/:id` - Obtener orden por ID
- `POST /api/payments/mercadopago/webhook` - Webhook de Mercado Pago

## Tecnologías

### Backend
- Node.js 20
- Prisma ORM
- Mercado Pago SDK

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

### Infraestructura
- Docker & Docker Compose
- PostgreSQL 16

## Próximos Pasos

La arquitectura está preparada para agregar nuevos módulos:

- **Catálogo de productos** (`products.service.js`, `products.repository.js`)
- **Carrito de compras** (`cart.service.js`)
- **Usuarios y autenticación** (`users.service.js`, `auth.service.js`)
- **Gestión de estampados** (`designs.service.js`)

Cada nuevo módulo seguirá el mismo patrón de capas (API → Services → Repository).

## Troubleshooting

### El backend no se conecta a la base de datos

1. Verifica que PostgreSQL esté corriendo: `docker compose ps`
2. Verifica las variables de entorno en `.env`
3. Revisa los logs: `docker compose logs backend`

### Las migraciones fallan

1. Asegúrate de que la base de datos esté disponible
2. Verifica que `DATABASE_URL` sea correcta
3. Intenta ejecutar manualmente: `docker compose exec backend npx prisma migrate deploy`

### El frontend no se conecta al backend

1. Verifica que `VITE_API_URL` en `.env` apunte al backend correcto
2. En Docker, usa `http://backend:4242` para comunicación interna
3. Para acceso desde el navegador, usa `http://localhost:4242`

## Licencia

[Tu licencia aquí]
