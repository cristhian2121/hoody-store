// Mercado Pago SDK
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

// Lazy initialization - initialize SDK clients on first use
// This ensures environment variables are loaded before accessing them
let _preference = null;
let _payment = null;

const getPreference = () => {
  if (!_preference) {
    const accessToken = requiredEnv("MERCADOPAGO_ACCESS_TOKEN");
    const client = new MercadoPagoConfig({ accessToken });
    _preference = new Preference(client);
  }
  return _preference;
};

const getPayment = () => {
  if (!_payment) {
    const accessToken = requiredEnv("MERCADOPAGO_ACCESS_TOKEN");
    const client = new MercadoPagoConfig({ accessToken });
    _payment = new Payment(client);
  }
  return _payment;
};

const sanitizeUnitPrice = (value) => Number(Number(value).toFixed(2));

const createPreference = async ({
  orderId,
  customer,
  items,
  shippingCost,
  frontendUrl,
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

  // Build back_urls from frontendUrl (must be HTTPS per MP policy since May 2025)
  const baseUrl = frontendUrl.replace(/\/$/, ""); // Remove trailing slash
  const backUrls = {
    success: `${baseUrl}/checkout/success`,
    failure: `${baseUrl}/checkout/cancel`,
    pending: `${baseUrl}/checkout/pending`,
  };

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
    back_urls: backUrls,
    // Only include auto_return if frontendUrl is HTTPS (required by MP)
    ...(frontendUrl.startsWith("https://") && { auto_return: "approved" }),
    notification_url: notificationUrl,
  };

  try {
    const response = await getPreference().create({ body: payload });
    console.log("Preference created:", response);
    return response;
  } catch (error) {
    // Handle SDK errors
    const errorMessage =
      error.message ||
      error.cause?.[0]?.description ||
      "Failed to create payment preference";
    const errorDetails = {
      message: errorMessage,
      ...(error.cause && { cause: error.cause }),
      ...(error.status && { status: error.status }),
    };
    console.error(
      "[Mercado Pago SDK Error]",
      JSON.stringify(errorDetails, null, 2),
    );
    throw new Error(errorMessage);
  }
};

const getPaymentById = async (paymentId) => {
  try {
    const response = await getPayment().get({ id: paymentId });
    console.log("Payment retrieved:", response);
    return response;
  } catch (error) {
    // Handle SDK errors
    const errorMessage =
      error.message ||
      error.cause?.[0]?.description ||
      "Failed to retrieve payment";
    const errorDetails = {
      message: errorMessage,
      ...(error.cause && { cause: error.cause }),
      ...(error.status && { status: error.status }),
    };
    console.error(
      "[Mercado Pago SDK Error]",
      JSON.stringify(errorDetails, null, 2),
    );
    throw new Error(errorMessage);
  }
};

export { createPreference, getPaymentById };
