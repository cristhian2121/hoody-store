# atuestampa backend

API HTTP para crear pedidos y cobrar con Mercado Pago.

## Endpoints

- `GET /health`
- `POST /api/orders/checkout`
- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/payments/mercadopago/webhook`

## Variables de entorno

Copiar `.env.example` a `.env` y completar:

- `PORT`
- `FRONTEND_URL`
- `BACKEND_URL`
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET` (reservado para validación futura)

## Desarrollo

```bash
npm run dev
```

Los pedidos se guardan en `data/orders.json`.
