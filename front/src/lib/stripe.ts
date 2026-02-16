import { loadStripe } from "@stripe/stripe-js";

const STRIPE_PUBLIC_KEY =
  import.meta.env.VITE_STRIPE_PUBLIC_KEY || "pk_test_XXXXXXXXXXXXXXXXXXXXXXXX";
const API_URL = import.meta.env.VITE_API_URL || "";

export const stripePromise = loadStripe(STRIPE_PUBLIC_KEY);

export interface CheckoutItem {
  name: string;
  price: number;
  quantity: number;
  image?: string;
  description?: string;
}

interface CreateCheckoutSessionParams {
  items: CheckoutItem[];
  shippingCost: number;
  shippingCity?: string;
  successUrl: string;
  cancelUrl: string;
}

export const createCheckoutSession = async ({
  items,
  shippingCost,
  shippingCity,
  successUrl,
  cancelUrl,
}: CreateCheckoutSessionParams): Promise<void> => {
  const lineItems = items.map((item) => ({
    price_data: {
      currency: "cop",
      unit_amount: Math.round(item.price),
      product_data: {
        name: item.name,
        description: item.description,
        images: item.image ? [item.image] : undefined,
      },
    },
    quantity: item.quantity,
  }));

  if (shippingCost > 0) {
    lineItems.push({
      price_data: {
        currency: "cop",
        unit_amount: Math.round(shippingCost),
        product_data: {
          name: "Envío",
          description: "Costo de envío estimado",
          images: [],
        },
      },
      quantity: 1,
    });
  }

  if (!API_URL) {
    throw new Error(
      "Configura VITE_API_URL con la URL de tu backend para procesar pagos con Stripe."
    );
  }

  const res = await fetch(`${API_URL}/api/create-checkout-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lineItems,
      successUrl,
      cancelUrl,
      shippingCity,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Error al crear sesión de pago");
  }
  const { url } = await res.json();
  if (url) {
    window.location.href = url;
  } else {
    throw new Error("No se recibió URL de checkout");
  }
};
