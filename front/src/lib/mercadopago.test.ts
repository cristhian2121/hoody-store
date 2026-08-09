import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirmCheckoutPayment, createCheckoutSession } from "./mercadopago";
import type { CartItem, ImageElement, TextElement } from "./types";

vi.mock("./api", () => ({
  ensureApiUrl: () => "http://api.test",
}));

const image = (overrides: Partial<ImageElement> = {}): ImageElement => ({
  assetId: "asset-1",
  previewUrl: "http://api.test/api/uploads/design-image/asset-1/preview",
  naturalWidth: 2000,
  naturalHeight: 1200,
  hasAlpha: true,
  x: 50,
  y: 45,
  scale: 1.2,
  rotation: 15,
  ...overrides,
});

const text = (overrides: Partial<TextElement> = {}): TextElement => ({
  id: "t1",
  content: "ATUESTAMPA",
  x: 50,
  y: 70,
  fontFamily: "Bebas Neue",
  fontSize: 24,
  color: "#ffffff",
  bold: false,
  italic: false,
  scale: 1,
  rotation: 0,
  ...overrides,
});

const cartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  cartItemId: "cart-1",
  variantId: "variant-1",
  productId: "prod-1",
  slug: "hoodie-premium",
  name: { es: "Hoodie Premium", en: "Premium Hoodie" },
  price: 119900,
  quantity: 2,
  gender: "hombre",
  size: "M",
  color: { id: "negro", name: { es: "Negro", en: "Black" }, hex: "#1a1a1a" },
  image: "http://api.test/static/products/hoodie-black.jpg",
  category: "hoodies",
  ...overrides,
});

const okResponse = (totals = { subtotal: 239800, shipping: 20000, total: 259800, currency: "COP" }) =>
  vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ orderId: "ord-1", checkoutUrl: "https://mp.test/pay", totals }),
  });

const send = (items: CartItem[]) =>
  createCheckoutSession({
    items,
    customer: { firstName: "Ana", lastName: "Perez", email: "ana@example.com", phone: "3000000000" },
    shipping: {
      countryCode: "CO",
      departmentCode: "11",
      cityCode: "11001",
      address: "Calle 1",
    },
  });

const sentBody = (fetchMock: ReturnType<typeof vi.fn>) =>
  JSON.parse(fetchMock.mock.calls[0][1].body);

describe("createCheckoutSession", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // El motivo de todo el cambio de contrato: el servidor deriva el precio de
  // variantId. Si el precio siguiera viajando, seguiria habiendo una ruta por la
  // que el cliente propone cuanto paga.
  it("no manda precio, nombre, foto ni talla", async () => {
    const fetchMock = okResponse();
    vi.stubGlobal("fetch", fetchMock);

    await send([cartItem()]);

    const body = sentBody(fetchMock);
    expect(body.items[0]).toEqual({
      cartItemId: "cart-1",
      variantId: "variant-1",
      quantity: 2,
      designs: [],
    });

    const serialized = fetchMock.mock.calls[0][1].body as string;
    expect(serialized).not.toContain("119900");
    expect(serialized).not.toContain("Hoodie Premium");
    expect(serialized).not.toContain("hoodie-black.jpg");
  });

  it("manda cliente y envio tal cual", async () => {
    const fetchMock = okResponse();
    vi.stubGlobal("fetch", fetchMock);

    await send([cartItem()]);

    const body = sentBody(fetchMock);
    expect(body.customer.email).toBe("ana@example.com");
    expect(body.shipping.cityCode).toBe("11001");
  });

  describe("disenos", () => {
    // Del elemento imagen solo viajan el id y la ubicacion. Aceptar
    // naturalWidth del cliente permitiria declarar 10000 px y esquivar el piso
    // de calidad del servidor.
    it("de la imagen solo manda el id y la ubicacion", async () => {
      const fetchMock = okResponse();
      vi.stubGlobal("fetch", fetchMock);

      await send([
        cartItem({
          personalization: {
            front: { image: image(), texts: [] },
            back: { image: null, texts: [] },
          },
        }),
      ]);

      const designs = sentBody(fetchMock).items[0].designs;
      expect(designs).toHaveLength(1);
      expect(designs[0].side).toBe("front");
      expect(designs[0].image).toEqual({
        assetId: "asset-1",
        x: 50,
        y: 45,
        scale: 1.2,
        rotation: 15,
      });
      expect(designs[0].image).not.toHaveProperty("naturalWidth");
      expect(designs[0].image).not.toHaveProperty("previewUrl");
      expect(designs[0].image).not.toHaveProperty("hasAlpha");
    });

    it("nunca manda una imagen embebida", async () => {
      const fetchMock = okResponse();
      vi.stubGlobal("fetch", fetchMock);

      await send([
        cartItem({
          personalization: {
            front: { image: image(), texts: [text()] },
            back: { image: null, texts: [] },
          },
        }),
      ]);

      expect(fetchMock.mock.calls[0][1].body).not.toContain("data:image");
    });

    it("manda los dos lados cuando ambos tienen diseno", async () => {
      const fetchMock = okResponse();
      vi.stubGlobal("fetch", fetchMock);

      await send([
        cartItem({
          personalization: {
            front: { image: image(), texts: [] },
            back: { image: null, texts: [text()] },
          },
        }),
      ]);

      expect(sentBody(fetchMock).items[0].designs.map((d: { side: string }) => d.side)).toEqual([
        "front",
        "back",
      ]);
    });

    // Un lado vacio generaria una orden de impresion sin nada que imprimir.
    it("omite los lados sin contenido", async () => {
      const fetchMock = okResponse();
      vi.stubGlobal("fetch", fetchMock);

      await send([
        cartItem({
          personalization: {
            front: { image: null, texts: [] },
            back: { image: null, texts: [] },
          },
        }),
      ]);

      expect(sentBody(fetchMock).items[0].designs).toEqual([]);
    });

    it("no manda el id interno del texto", async () => {
      const fetchMock = okResponse();
      vi.stubGlobal("fetch", fetchMock);

      await send([
        cartItem({
          personalization: {
            front: { image: null, texts: [text()] },
            back: { image: null, texts: [] },
          },
        }),
      ]);

      const [sentText] = sentBody(fetchMock).items[0].designs[0].texts;
      expect(sentText).not.toHaveProperty("id");
      expect(sentText.content).toBe("ATUESTAMPA");
    });
  });

  describe("respuesta", () => {
    // No redirige por su cuenta: quien llama compara los totales primero.
    it("devuelve los totales del servidor sin navegar", async () => {
      vi.stubGlobal("fetch", okResponse());

      const result = await send([cartItem()]);

      expect(result.checkoutUrl).toBe("https://mp.test/pay");
      expect(result.totals.total).toBe(259800);
    });

    it("propaga el mensaje de error del servidor", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          json: async () => ({ message: "Estos productos ya no estan disponibles" }),
        }),
      );

      await expect(send([cartItem()])).rejects.toThrow(/ya no estan disponibles/);
    });

    // class-validator devuelve un arreglo de mensajes.
    it("junta los mensajes cuando el servidor devuelve varios", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          json: async () => ({ message: ["items.0.property price should not exist", "otro error"] }),
        }),
      );

      await expect(send([cartItem()])).rejects.toThrow(/price should not exist otro error/);
    });

    it("falla si no llega url de pago", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ orderId: "x" }) }),
      );

      await expect(send([cartItem()])).rejects.toThrow(/URL de checkout/);
    });
  });
});

describe("confirmCheckoutPayment", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("confirma el pago contra el backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, orderId: "ord-1", status: "paid" }),
      }),
    );

    const result = await confirmCheckoutPayment("12345");

    expect(result).toEqual({ ok: true, orderId: "ord-1", status: "paid" });
    expect(fetch).toHaveBeenCalledWith("http://api.test/api/payments/mercadopago/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: "12345" }),
    });
  });
});
