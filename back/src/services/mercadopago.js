const MERCADOPAGO_API_URL = "https://api.mercadopago.com";

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const mpRequest = async (pathname, options = {}) => {
  const token = requiredEnv("MERCADOPAGO_ACCESS_TOKEN");
  const res = await fetch(`${MERCADOPAGO_API_URL}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.message || data.error || "Mercado Pago API request failed";
    throw new Error(message);
  }
  return data;
};

const sanitizeUnitPrice = (value) => Number(Number(value).toFixed(2));

export const createPreference = async ({
  orderId,
  customer,
  items,
  shippingCost,
  successUrl,
  cancelUrl,
  notificationUrl,
}) => {
  const preferenceItems = items.map((item) => ({
    id: item.productId,
    title: item.name,
    description: item.description || `${item.category} · ${item.size}`,
    quantity: item.quantity,
    currency_id: "COP",
    unit_price: sanitizeUnitPrice(item.price),
    picture_url: item.image,
    category_id: item.category,
  }));

  if (shippingCost > 0) {
    preferenceItems.push({
      id: `shipping-${orderId}`,
      title: "Costo de envío",
      quantity: 1,
      currency_id: "COP",
      unit_price: sanitizeUnitPrice(shippingCost),
      category_id: "shipping",
    });
  }

  const payload = {
    external_reference: orderId,
    statement_descriptor: "ATUESTAMPA",
    items: preferenceItems,
    payer: {
      name: customer.firstName,
      surname: customer.lastName,
      email: customer.email,
      phone: { number: customer.phone },
    },
    metadata: { orderId },
    back_urls: {
      success: successUrl,
      failure: cancelUrl,
      pending: cancelUrl,
    },
    auto_return: "approved",
    notification_url: notificationUrl,
  };

  return mpRequest("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const getPaymentById = async (paymentId) => {
  return mpRequest(`/v1/payments/${paymentId}`, { method: "GET" });
};
