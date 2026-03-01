import type { PersonalizationData, ProductCategory, ProductColor, Gender } from "./types";
import { ensureApiUrl } from "./api";

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
  shipping: {
    countryCode: string;
    departmentCode: string;
    cityCode: string;
    address: string;
    postalCode?: string;
  };
}

export const createCheckoutSession = async ({
  items,
  customer,
  shipping,
}: CreateCheckoutSessionParams): Promise<void> => {
  const apiUrl = ensureApiUrl();

  const res = await fetch(`${apiUrl}/api/orders/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items,
      customer,
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

export const confirmCheckoutPayment = async (paymentId: string) => {
  const apiUrl = ensureApiUrl();
  const res = await fetch(`${apiUrl}/api/payments/mercadopago/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "No pudimos confirmar el pago.");
  }

  return res.json() as Promise<{ ok: boolean; orderId: string; status: string }>;
};
