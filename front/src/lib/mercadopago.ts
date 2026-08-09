import type { CartItem, DesignLayer, PrintSide } from "./types";
import { ensureApiUrl } from "./api";

/**
 * Cuerpo del checkout.
 *
 * Lo que no esta es lo importante: ni precio, ni nombre, ni foto, ni talla, ni
 * color. Todo eso lo deriva el servidor de `variantId`. Con validacion estricta
 * del otro lado, mandar un precio no es que se ignore: es un 400. La regla
 * "nunca confiar en el precio del cliente" deja de depender de que alguien la
 * recuerde.
 */

interface CheckoutDesignPayload {
  side: PrintSide;
  image?: {
    assetId: string;
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
  texts: Array<{
    content: string;
    x: number;
    y: number;
    fontFamily: string;
    fontSize: number;
    color: string;
    bold: boolean;
    italic: boolean;
    scale: number;
    rotation: number;
  }>;
}

export interface CheckoutTotals {
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
}

export interface CheckoutResponse {
  orderId: string;
  checkoutUrl: string;
  totals: CheckoutTotals;
}

interface CreateCheckoutSessionParams {
  items: CartItem[];
  customer: { firstName: string; lastName: string; email: string; phone: string };
  shipping: {
    countryCode: string;
    departmentCode: string;
    cityCode: string;
    address: string;
    postalCode?: string;
  };
}

/**
 * Convierte una capa del editor en lo que acepta el servidor.
 *
 * Del elemento imagen solo viaja el id y la ubicacion: el ancho, el alto y la
 * transparencia se leen de la fila del asset. Mandarlos seria darle al cliente
 * una forma de esquivar el piso de calidad declarando dimensiones inventadas.
 */
const toDesignPayload = (side: PrintSide, layer: DesignLayer): CheckoutDesignPayload | null => {
  const hasContent = Boolean(layer.image) || layer.texts.length > 0;
  if (!hasContent) return null;

  return {
    side,
    ...(layer.image
      ? {
          image: {
            assetId: layer.image.assetId,
            x: layer.image.x,
            y: layer.image.y,
            scale: layer.image.scale,
            rotation: layer.image.rotation,
          },
        }
      : {}),
    texts: layer.texts.map((text) => ({
      content: text.content,
      x: text.x,
      y: text.y,
      fontFamily: text.fontFamily,
      fontSize: text.fontSize,
      color: text.color,
      bold: text.bold,
      italic: text.italic,
      scale: text.scale,
      rotation: text.rotation,
    })),
  };
};

const toItemPayload = (item: CartItem) => {
  const designs = item.personalization
    ? ([
        toDesignPayload("front", item.personalization.front),
        toDesignPayload("back", item.personalization.back),
      ].filter(Boolean) as CheckoutDesignPayload[])
    : [];

  return {
    cartItemId: item.cartItemId,
    variantId: item.variantId,
    quantity: item.quantity,
    designs,
  };
};

/**
 * Crea la orden y devuelve los totales que calculo el servidor.
 *
 * No redirige por su cuenta a proposito: quien llama compara primero contra lo
 * que le mostro al cliente. Mandar a alguien a pagar un monto distinto del que
 * vio en pantalla es la clase de sorpresa que termina en un contracargo.
 */
export const createCheckoutSession = async ({
  items,
  customer,
  shipping,
}: CreateCheckoutSessionParams): Promise<CheckoutResponse> => {
  const apiUrl = ensureApiUrl();

  const res = await fetch(`${apiUrl}/api/orders/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: items.map(toItemPayload), customer, shipping }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = Array.isArray(err.message) ? err.message.join(" ") : err.message;
    throw new Error(message || "Error al crear checkout de Mercado Pago");
  }

  const data: CheckoutResponse = await res.json();
  if (!data.checkoutUrl) {
    throw new Error("No se recibió URL de checkout");
  }

  return data;
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
