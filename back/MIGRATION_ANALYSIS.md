# Análisis de Migración: JavaScript → TypeScript

## Resumen de Archivos .js en `back/src/`

### ✅ ELIMINAR (Reemplazados por TypeScript/NestJS)

| Archivo | Estado | Reemplazado por |
|---------|--------|-----------------|
| `src/index.js` | ❌ ELIMINAR | `src/main.ts` |
| `src/server.js` | ❌ ELIMINAR | NestJS (main.ts + controllers) |
| `src/storage/orders.js` | ❌ ELIMINAR | Prisma (ya no se usa JSON file storage) |
| `src/api/routes/health.routes.js` | ❌ ELIMINAR | `src/app.controller.ts` |
| `src/api/routes/orders.routes.js` | ❌ ELIMINAR | NestJS routing automático |
| `src/api/routes/payments.routes.js` | ❌ ELIMINAR | NestJS routing automático |
| `src/infrastructure/http/server.js` | ❌ ELIMINAR | NestJS maneja HTTP |
| `src/infrastructure/database/prisma.js` | ❌ ELIMINAR | `src/prisma/prisma.service.ts` |
| `src/utils/env.js` | ❌ ELIMINAR | `src/config/env.ts` |
| `src/api/middleware/cors.js` | ❌ ELIMINAR | NestJS CORS (main.ts) |
| `src/api/middleware/errorHandler.js` | ❌ ELIMINAR | NestJS exception filters |
| `src/api/middleware/validateRequest.js` | ❌ ELIMINAR | class-validator (DTOs) |
| `src/api/controllers/orders.controller.js` | ❌ ELIMINAR | `src/orders/orders.controller.ts` |
| `src/api/controllers/payments.controller.js` | ❌ ELIMINAR | `src/payments/payments.controller.ts` |
| `src/api/dto/checkout.dto.js` | ❌ ELIMINAR | `src/api/dto/checkout.dto.ts` |
| `src/services/orders.service.js` | ❌ ELIMINAR | `src/services/orders.service.ts` |
| `src/services/payments.service.js` | ❌ ELIMINAR | `src/services/payments.service.ts` |
| `src/services/mercadopago.js` | ❌ ELIMINAR | `src/services/mercadopago.service.ts` |
| `src/repositories/prisma/orders.repository.js` | ❌ ELIMINAR | `src/repositories/prisma/orders.repository.ts` |
| `src/repositories/interfaces/orders.repository.interface.js` | ❌ ELIMINAR | `src/repositories/interfaces/orders.repository.interface.ts` |
| `src/config/env.js` | ❌ ELIMINAR | `src/config/env.ts` |

### ✅ MANTENER (Configuración que debe ser JS)

| Archivo | Estado | Razón |
|---------|--------|-------|
| `.eslintrc.js` | ✅ MANTENER | ESLint requiere archivo de configuración en JS |

## Total: 20 archivos a eliminar, 1 archivo a mantener
