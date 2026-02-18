import http from "node:http";
import { randomUUID, createHmac } from "node:crypto";
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

const verifyWebhookSignature = (req, body, queryString) => {
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret.startsWith("/")) {
    // If secret is not set or is still a path (old config), skip validation
    // Log warning but don't block (for development/backward compatibility)
    console.warn(
      "[Webhook] MERCADOPAGO_WEBHOOK_SECRET not configured properly. Webhook signature validation skipped."
    );
    return true;
  }

  const signature = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];

  if (!signature) {
    console.warn("[Webhook] Missing x-signature header");
    return false;
  }

  // Mercado Pago sends signature as: sha256=hash
  const parts = signature.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") {
    console.warn("[Webhook] Invalid signature format");
    return false;
  }

  const receivedHash = parts[1];

  // Build the data string: request_id + query_string + body
  const dataToSign = `${requestId || ""}${queryString}${JSON.stringify(body)}`;

  // Compute HMAC-SHA256
  const computedHash = createHmac("sha256", webhookSecret)
    .update(dataToSign)
    .digest("hex");

  const isValid = computedHash === receivedHash;
  if (!isValid) {
    console.error("[Webhook] Signature validation failed", {
      receivedHash: receivedHash.substring(0, 16) + "...",
      computedHash: computedHash.substring(0, 16) + "...",
      requestId,
    });
  }

  return isValid;
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
        frontendUrl: FRONTEND_URL,
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
      const queryString = url.searchParams.toString();
      
      // Verify webhook signature for POST requests (MP sends POST for webhooks)
      if (req.method === "POST" && !verifyWebhookSignature(req, body, queryString)) {
        console.error("[Webhook] Invalid signature, rejecting request");
        json(res, 401, { message: "Invalid webhook signature" });
        return;
      }

      const topic = url.searchParams.get("topic") || body.type;
      const paymentId =
        url.searchParams.get("data.id") ||
        body?.data?.id ||
        url.searchParams.get("id");

      console.log("[Webhook] Received notification", {
        topic,
        paymentId,
        method: req.method,
        requestId: req.headers["x-request-id"],
      });

      if (topic !== "payment" || !paymentId) {
        json(res, 200, { ok: true });
        return;
      }

      let payment;
      try {
        payment = await getPaymentById(paymentId);
      } catch (error) {
        console.error("[Webhook] Failed to fetch payment", { paymentId, error: error.message });
        json(res, 200, { ok: true }); // Return 200 to prevent MP retries on our errors
        return;
      }

      const externalReference = payment.external_reference;
      if (!externalReference) {
        console.warn("[Webhook] Payment missing external_reference", { paymentId });
        json(res, 200, { ok: true });
        return;
      }

      const order = await getOrderByExternalReference(externalReference);
      if (!order) {
        console.warn("[Webhook] Order not found", { externalReference });
        json(res, 200, { ok: true });
        return;
      }

      try {
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

        console.log("[Webhook] Order updated successfully", {
          orderId: order.id,
          paymentId,
          status: payment.status,
        });
      } catch (error) {
        console.error("[Webhook] Failed to update order", {
          orderId: order.id,
          paymentId,
          error: error.message,
        });
        // Still return 200 to prevent MP retries on our errors
      }

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
