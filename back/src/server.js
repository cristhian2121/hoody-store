import http from "node:http";
import { randomUUID } from "node:crypto";
import { createPreference, getPaymentById } from "./services/mercadopago.js";
import {
  createOrder,
  getOrderByExternalReference,
  getOrderById,
  listOrders,
  updateOrder,
} from "./storage/orders.js";
import { loadDotEnv } from "./utils/env.js";

loadDotEnv();

const PORT = Number(process.env.PORT || 4242);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

const json = (res, statusCode, payload) => {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
};

const parseBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const validateCheckoutPayload = (payload) => {
  if (!payload || typeof payload !== "object") return "Payload inválido.";
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return "Debes enviar al menos un producto.";
  }
  if (!payload.customer || typeof payload.customer !== "object") {
    return "Faltan datos del cliente.";
  }
  const { firstName, lastName, email, phone } = payload.customer;
  if (![firstName, lastName, email, phone].every(isNonEmptyString)) {
    return "Datos de cliente incompletos.";
  }
  if (!payload.shipping || typeof payload.shipping !== "object") {
    return "Faltan datos de envío.";
  }
  if (!isNonEmptyString(payload.shipping.city) || !isNonEmptyString(payload.shipping.department)) {
    return "Datos de envío incompletos.";
  }
  if (!isNonEmptyString(payload.successUrl) || !isNonEmptyString(payload.cancelUrl)) {
    return "Faltan URLs de retorno.";
  }
  return null;
};

const statusFromMercadoPago = (paymentStatus) => {
  switch (paymentStatus) {
    case "approved":
      return "paid";
    case "in_process":
    case "pending":
    case "authorized":
      return "payment_pending";
    case "cancelled":
    case "rejected":
    case "refunded":
    case "charged_back":
      return "payment_failed";
    default:
      return "payment_unknown";
  }
};

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const allowOrigin = origin && origin === FRONTEND_URL ? origin : FRONTEND_URL;

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      json(res, 200, { ok: true, service: "atuestampa-backend" });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/orders/checkout") {
      const body = await parseBody(req);
      const validationError = validateCheckoutPayload(body);
      if (validationError) {
        json(res, 400, { message: validationError });
        return;
      }

      const orderId = randomUUID();
      const createdAt = new Date().toISOString();
      const shippingCost = Number(body.shippingCost || 0);
      const items = body.items.map((item) => ({
        ...item,
        price: Number(item.price),
        quantity: Number(item.quantity),
      }));
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const total = subtotal + shippingCost;

      const order = await createOrder({
        id: orderId,
        createdAt,
        updatedAt: createdAt,
        status: "checkout_created",
        paymentProvider: "mercadopago",
        customer: body.customer,
        shipping: {
          ...body.shipping,
          cost: shippingCost,
        },
        totals: {
          subtotal,
          shipping: shippingCost,
          total,
          currency: "COP",
        },
        items,
        payment: null,
      });

      const preference = await createPreference({
        orderId,
        customer: body.customer,
        items,
        shippingCost,
        successUrl: body.successUrl,
        cancelUrl: body.cancelUrl,
        notificationUrl: `${BACKEND_URL}/api/payments/mercadopago/webhook`,
      });

      await updateOrder(order.id, (current) => ({
        ...current,
        updatedAt: new Date().toISOString(),
        payment: {
          provider: "mercadopago",
          preferenceId: preference.id,
          initPoint: preference.init_point,
          status: "pending",
        },
      }));

      json(res, 200, {
        orderId,
        checkoutUrl: preference.init_point,
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/orders") {
      const orders = await listOrders();
      json(res, 200, { orders });
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/orders/")) {
      const id = url.pathname.replace("/api/orders/", "");
      if (!id) {
        json(res, 400, { message: "ID de orden inválido." });
        return;
      }
      const order = await getOrderById(id);
      if (!order) {
        json(res, 404, { message: "Orden no encontrada." });
        return;
      }
      json(res, 200, { order });
      return;
    }

    if (
      (req.method === "POST" || req.method === "GET") &&
      url.pathname === "/api/payments/mercadopago/webhook"
    ) {
      const body = req.method === "POST" ? await parseBody(req) : {};
      const topic = url.searchParams.get("topic") || body.type;
      const paymentId =
        url.searchParams.get("data.id") ||
        body?.data?.id ||
        url.searchParams.get("id");

      if (topic !== "payment" || !paymentId) {
        json(res, 200, { ok: true });
        return;
      }

      const payment = await getPaymentById(paymentId);
      const externalReference = payment.external_reference;
      if (!externalReference) {
        json(res, 200, { ok: true });
        return;
      }

      const order = await getOrderByExternalReference(externalReference);
      if (!order) {
        json(res, 200, { ok: true });
        return;
      }

      await updateOrder(order.id, (current) => ({
        ...current,
        updatedAt: new Date().toISOString(),
        status: statusFromMercadoPago(payment.status),
        payment: {
          ...(current.payment || {}),
          provider: "mercadopago",
          paymentId: String(payment.id),
          status: payment.status,
          statusDetail: payment.status_detail,
          paidAt: payment.date_approved || null,
        },
      }));

      json(res, 200, { ok: true });
      return;
    }

    json(res, 404, { message: "Ruta no encontrada." });
  } catch (error) {
    console.error(error);
    json(res, 500, {
      message:
        error instanceof Error
          ? error.message
          : "Error interno del servidor.",
    });
  }
});

server.listen(PORT, () => {
  console.log(`atuestampa backend listening on port ${PORT}`);
});
