import type { PersonalizationData, ProductCategory, ProductColor, Gender } from "./types";

const API_URL = import.meta.env.VITE_API_URL || "";

export interface CheckoutItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  description?: string;
  gender: Gender;
  size: string;
  color: ProductColor;
  category: ProductCategory;
  personalization?: PersonalizationData;
}

interface CreateCheckoutSessionParams {
  items: CheckoutItem[];
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  shippingCost: number;
  shipping: {
    city: string;
    department: string;
    zip?: string;
  };
}

export const createCheckoutSession = async ({
  items,
  customer,
  shippingCost,
  shipping,
}: CreateCheckoutSessionParams): Promise<void> => {
  if (!API_URL) {
    throw new Error(
      "Configura VITE_API_URL con la URL de tu backend para procesar pagos con Mercado Pago.",
    );
  }

  const res = await fetch(`${API_URL}/api/orders/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items,
      customer,
      shippingCost,
      shipping,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Error al crear checkout de Mercado Pago");
  }

  const { checkoutUrl } = await res.json();
  if (!checkoutUrl) {
    throw new Error("No se recibió URL de checkout");
  }

  window.location.href = checkoutUrl;
};
