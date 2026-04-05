# AGENTS.md

## Rol de este archivo

Este `AGENTS.md` de raiz funciona como enrutador del repositorio.
Su trabajo es dar:

- contexto de producto
- mapa general del monorepo
- reglas compartidas entre `front/` y `back/`
- puntos de coordinacion entre frontend, backend y base de datos

Cuando el trabajo ocurra principalmente en un subproyecto, leer tambien:

- `front/AGENTS.md`
- `back/AGENTS.md`

## Proposito del proyecto

Este repositorio implementa una tienda virtual para vender hoodies y camisetas personalizadas.
La experiencia principal permite que una persona:

1. explore el catalogo de prendas
2. elija talla, genero y color
3. suba una imagen y agregue textos para personalizar el estampado
4. agregue productos al carrito
5. complete checkout con direccion de envio
6. pague con Mercado Pago
7. reciba su pedido para produccion y entrega

El objetivo del producto no es un marketplace generico. Es un e-commerce enfocado en prendas basicas personalizables con flujo de diseno + compra.

## Mapa del repositorio

- `front/`: aplicacion web de la tienda
- `back/`: API, logica de negocio, pagos, ubicaciones, envios y persistencia
- `docker-compose.yml`: orquestacion local con frontend, backend y PostgreSQL

## Stack real

- `front/`: React 18 + TypeScript + Vite + React Router
- `front/`: Tailwind CSS + shadcn/ui + TanStack Query + Vitest
- `back/`: NestJS + TypeScript + Prisma
- Base de datos: PostgreSQL
- Pagos: Mercado Pago
- Integraciones auxiliares: ubicaciones, cotizacion de envio y notificaciones por WhatsApp

Regla importante:
- El frontend actual no es Next.js. No asumir App Router ni Pages Router en `front/`.

## Reglas compartidas

### 1. Mantener el dominio del negocio

- Toda decision debe favorecer la venta de hoodies y camisetas personalizadas.
- Si una mejora visual o tecnica complica el flujo de personalizacion o checkout, priorizar simplicidad, claridad y conversion.
- Recordar que el usuario compra una prenda fisica personalizada, no un activo digital.

### 2. Mantener sincronizado el flujo punta a punta

Cuando se toque carrito, checkout, personalizacion, envios o pagos, revisar el impacto en ambos lados.

Fuentes de verdad importantes:

- `front/src/lib/products.ts`
- `front/src/lib/types.ts`
- `front/src/lib/cart.tsx`
- `front/src/lib/mercadopago.ts`
- `front/src/pages/Checkout.tsx`
- `back/src/api/dto/checkout.dto.ts`
- `back/src/orders/orders.controller.ts`
- `back/src/services/orders.service.ts`
- `back/src/services/payments.service.ts`
- `back/prisma/schema.prisma`

No asumir que cambiar solo frontend o solo backend es suficiente.

### 3. Respetar el alcance actual

- El checkout actual esta orientado a Colombia.
- Los pagos trabajan en COP.
- La experiencia ya mezcla espanol e ingles en frontend.

Si se expande a otros paises, monedas o idiomas, hacerlo de forma explicita y sin romper el flujo actual.

### 4. Cambios criticos

- Si se cambia Prisma, revisar migraciones, seeds y repositorios.
- Si se cambia Mercado Pago, validar URLs de retorno, webhook, confirmacion y estados.
- Si se cambia personalizacion, no perder frente/espalda, imagen, texto o preview.

## Como usar este enrutador

- Si el trabajo es de interfaz, rutas, componentes, carrito o editor visual: ir a `front/AGENTS.md`
- Si el trabajo es de API, ordenes, pagos, Prisma, envios o ubicaciones: ir a `back/AGENTS.md`
- Si el trabajo cruza ambas capas, usar este archivo como marco general y luego leer ambos archivos locales

## Criterio de calidad

Una mejora es buena si:

- acerca el repo al negocio real de prendas personalizadas
- reduce friccion en personalizacion o checkout
- mantiene alineados front, back y base de datos
- no introduce supuestos falsos sobre la arquitectura
- deja el flujo de compra mas confiable de punta a punta
