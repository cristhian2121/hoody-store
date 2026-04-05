# AGENTS.md

## Rol de este archivo

Este archivo es el punto de entrada para trabajar en `back/`.
Usarlo cuando la tarea afecte API, modulos NestJS, ordenes, pagos, envios, ubicaciones, Prisma, seeds o notificaciones.

Leer tambien el `AGENTS.md` de raiz para reglas compartidas y coordinacion con frontend.

## Stack real del backend

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Mercado Pago

## Responsabilidad del backend

El backend sostiene el flujo operativo del e-commerce:

- crear ordenes
- calcular totales y envio
- generar preferencias de pago
- procesar webhooks y confirmaciones de pago
- exponer ubicaciones para checkout
- persistir ordenes y datos maestros
- disparar notificaciones posteriores al pago

## Modulos y zonas clave

### Bootstrap y configuracion

- `src/main.ts`
- `src/app.module.ts`
- `src/config/env.ts`
- `src/config/swagger.ts`

### Ordenes

- `src/orders/orders.controller.ts`
- `src/orders/orders.module.ts`
- `src/services/orders.service.ts`
- `src/repositories/interfaces/orders.repository.interface.ts`
- `src/repositories/prisma/orders.repository.ts`

### Pagos

- `src/payments/payments.controller.ts`
- `src/payments/payments.module.ts`
- `src/payments/dto/confirm-payment.dto.ts`
- `src/services/payments.service.ts`
- `src/services/mercadopago.service.ts`

### Envios y ubicaciones

- `src/shipping/shipping.controller.ts`
- `src/shipping/shipping.service.ts`
- `src/shipping/dto/shipping-quote.dto.ts`
- `src/shipping/providers/`
- `src/locations/locations.controller.ts`
- `src/services/locations.service.ts`
- `src/repositories/interfaces/locations.repository.interface.ts`
- `src/repositories/prisma/locations.repository.ts`

### Notificaciones

- `src/notifications/notifications.service.ts`
- `src/notifications/adapters/`

### Prisma y datos

- `prisma/schema.prisma`
- `prisma/migrations/`
- `prisma/seed/index.ts`
- `prisma/seed/*.json`
- `src/prisma/prisma.service.ts`

## Reglas de trabajo para backend

### 1. Mantener NestJS organizado por responsabilidades

- Controladores para entrada/salida HTTP.
- DTOs para validacion.
- Servicios para logica de negocio.
- Repositorios para acceso a datos.
- Evitar logica compleja en controladores.

### 2. Proteger el flujo de checkout

El endpoint mas sensible es:

- `POST /api/orders/checkout`

Si lo cambias, revisar en conjunto:

- `src/api/dto/checkout.dto.ts`
- `src/orders/orders.controller.ts`
- `src/services/orders.service.ts`
- `../front/src/lib/mercadopago.ts`
- `../front/src/pages/Checkout.tsx`

### 3. Pagos son una zona critica

- No cambiar el flujo de Mercado Pago sin revisar redireccion, webhook y confirmacion manual.
- Cuidar idempotencia al procesar pagos.
- Mantener mapeo de estados consistente entre Mercado Pago e interno.
- No debilitar validacion de webhook sin una razon explicita.

### 4. Prisma es fuente de verdad persistente

Si cambias `prisma/schema.prisma`:

- crear o ajustar migraciones
- regenerar Prisma Client
- revisar repositorios y servicios afectados
- revisar seeds si el cambio toca paises, departamentos o ciudades

### 5. Respetar el alcance geografico actual

- El checkout actual esta centrado en Colombia.
- Hay flujos de pais, departamento y ciudad.
- Los totales trabajan en COP.

### 6. Mantener la forma de la orden coherente

La orden actual persiste bloques JSON como:

- `customer`
- `shipping`
- `totals`
- `items`
- `payment`

Si se cambia esa forma, revisar:

- serializacion en servicios
- lectura en repositorios
- compatibilidad con datos existentes
- impacto en notificaciones y consultas

## Riesgos comunes a evitar

- cambiar DTOs sin alinear frontend
- cambiar el schema de Prisma sin migracion o generate
- introducir logica de negocio en controladores
- romper compatibilidad del webhook de Mercado Pago
- cambiar calculo de shipping y total sin revisar checkout completo
- perder trazabilidad del `orderId` o `external_reference`

## Verificacion recomendada

Antes de cerrar cambios relevantes en backend, idealmente validar:

- `pnpm run test`
- `pnpm run prisma:generate` si hubo cambios de schema
- crear checkout de prueba
- consultar orden creada
- confirmar pago o simular webhook segun aplique
- validar cotizacion de envio

## Comandos utiles

```bash
cd back
pnpm install
pnpm run dev
pnpm run test
pnpm run prisma:generate
pnpm run prisma:migrate
pnpm run prisma:seed
pnpm run prisma:studio
```
