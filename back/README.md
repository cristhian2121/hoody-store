# atuestampa backend

API HTTP para crear pedidos y cobrar con Mercado Pago.

## Endpoints

- `GET /health`
- `POST /api/orders/checkout`
- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/payments/mercadopago/webhook`
- `POST /api/payments/mercadopago/confirm`
- `GET /api/shipping/quote`

## Variables de entorno

Copiar `.env.example` a `.env` y completar:

- `PORT`
- `FRONTEND_URL`
- `BACKEND_URL`
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET` (reservado para validación futura)
- `SHIPPING_DEFAULT_COST_COP` (default sugerido: `20000`)
- `WHATSAPP_CLOUD_API_TOKEN` (placeholder hasta tener credenciales reales)
- `WHATSAPP_CLOUD_PHONE_NUMBER_ID` (placeholder)
- `WHATSAPP_CLOUD_TO_NUMBER` (placeholder)

## Desarrollo

```bash
npm run dev
```

## Prisma (migraciones y DB)

- **Inicializar**: `npx prisma init` (crea `prisma/schema.prisma` y `.env` con `DATABASE_URL`)
- **Dev (crear + aplicar migración)**: `npx prisma migrate dev --name <nombre>` (usalo cuando cambies modelos/campos/relaciones)
- **Prod/CI (aplicar migraciones existentes)**: `npx prisma migrate deploy` (no crea migraciones; es repetible/seguro para releases)
- **Sync rápido sin migraciones**: `npx prisma db push` (schema → DB; útil para prototipos, no ideal para prod)
- **Generar Prisma Client**: `npx prisma generate` (si cambió el schema; a veces corre solo con `migrate dev`/`db push`)
- **Seed**: `npx prisma db seed` (corre el seed configurado en `package.json`; debería ser idempotente)
- **UI local**: `npx prisma studio` (ver/editar datos en tu DB)
- **Reset dev (borrar y reconstruir)**: `npx prisma migrate reset` (drop + re-aplica migraciones; puede correr seed)
