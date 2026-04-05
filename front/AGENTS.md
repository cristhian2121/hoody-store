# AGENTS.md

## Rol de este archivo

Este archivo es el punto de entrada para trabajar en `front/`.
Usarlo cuando la tarea afecte UI, rutas, catalogo, carrito, personalizacion, checkout o integracion HTTP desde la aplicacion web.

Leer tambien el `AGENTS.md` de raiz para reglas compartidas y coordinacion con backend.

## Stack real del frontend

- React 18
- TypeScript
- Vite
- React Router
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Vitest

Regla importante:
- No asumir Next.js en este proyecto.
- Las rutas se resuelven con React Router y el build con Vite.

## Responsabilidad del frontend

El frontend representa la experiencia de compra de la tienda:

- landing y navegacion por categorias
- detalle de producto
- seleccion de talla, genero y color
- editor de personalizacion para frente y espalda
- carrito
- checkout
- pantallas de resultado de pago

## Archivos y zonas clave

### Entrada y rutas

- `src/main.tsx`
- `src/App.tsx`
- `src/pages/`

Las rutas actuales incluyen:

- `/`
- `/categoria/:category`
- `/producto/:slug`
- `/checkout`
- `/checkout/success`
- `/checkout/cancel`
- `/checkout/pending`

### Catalogo y tipos

- `src/lib/products.ts`: catalogo actual hardcodeado
- `src/lib/types.ts`: tipos de producto, carrito y personalizacion
- `src/lib/constants.ts`
- `src/lib/i18n.tsx`

### Carrito y checkout

- `src/lib/cart.tsx`
- `src/lib/api.ts`
- `src/lib/mercadopago.ts`
- `src/hooks/useCheckoutLocations.ts`
- `src/hooks/useShippingQuote.ts`
- `src/pages/Checkout.tsx`
- `src/components/checkout/OrderSummary.tsx`

### Personalizacion

- `src/components/PersonalizationEditor.tsx`
- `src/components/personalization/DesignCanvas.tsx`
- `src/components/personalization/GarmentPreview.tsx`
- `src/components/personalization/ImageControls.tsx`
- `src/components/personalization/TextControls.tsx`
- `src/components/personalization/PositionPresets.tsx`
- `src/hooks/usePersonalization.ts`
- `src/hooks/useImageUpload.ts`
- `src/hooks/useDragAndDrop.ts`

## Reglas de trabajo para frontend

### 1. Respetar el flujo de compra

- La UI debe ayudar a descubrir, personalizar y comprar.
- Evitar cambios que vuelvan confuso el flujo de seleccion de producto, personalizacion o checkout.
- Priorizar claridad, confianza y conversion.

### 2. No romper el contrato con backend

Si cambias tipos, checkout, carrito o requests HTTP, revisar en paralelo:

- `src/lib/types.ts`
- `src/lib/cart.tsx`
- `src/lib/mercadopago.ts`
- `src/pages/Checkout.tsx`
- `../back/src/api/dto/checkout.dto.ts`
- `../back/src/services/orders.service.ts`

### 3. Respetar las fuentes de verdad actuales

- El catalogo actual vive en `src/lib/products.ts`.
- La URL base del backend sale de `src/lib/api.ts`.
- La creacion de checkout se hace en `src/lib/mercadopago.ts`.
- Los productos personalizados se modelan con `PersonalizationData` en `src/lib/types.ts`.

### 4. Personalizacion es una capacidad central

- No tratar el editor como un detalle visual secundario.
- Mantener soporte para frente y espalda.
- Mantener soporte para imagen y texto.
- Cuidar que preview, posicionamiento y controles sean predecibles.

### 5. Mantener consistencia visual

- Reutilizar componentes antes de duplicar UI.
- Mantener coherencia con Tailwind y shadcn/ui ya presentes.
- Evitar rediseños grandes si la tarea no los pide.
- Si se mejora el diseño, no sacrificar usabilidad por efectos visuales.

### 6. Idioma y copy

- Parte del catalogo y la UI ya es bilingue.
- Si agregas textos de producto o UI, mantener consistencia con el sistema de idioma existente cuando aplique.
- No mezclar copy tecnico con copy comercial en pantallas de compra.

## Riesgos comunes a evitar

- asumir patrones de Next.js
- cambiar nombres o estructura del payload de checkout sin alinear backend
- romper el estado del carrito por cambios de tipo
- perder datos de personalizacion al navegar o editar
- mostrar precios o totales inconsistentes con envio y checkout

## Verificacion recomendada

Antes de cerrar cambios relevantes en frontend, idealmente validar:

- navegacion basica entre home, categoria, producto y checkout
- agregar producto al carrito
- editar personalizacion y ver preview
- cotizar envio desde checkout
- iniciar checkout contra el backend
- `pnpm run build`
- `pnpm run test`

## Comandos utiles

```bash
cd front
pnpm install
pnpm run dev
pnpm run build
pnpm run test
pnpm run lint
```
