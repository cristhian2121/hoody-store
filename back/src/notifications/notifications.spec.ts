import { Logger } from "@nestjs/common";
import { OrderStatus } from "@prisma/client";
import { NotificationsService } from "./notifications.service";
import { ResendEmailNotificationAdapter } from "./adapters/resend-email.adapter";
import { paidOrderEmail } from "./templates/paid-order.template";
import type {
  NotificationAdapter,
  PaidOrderNotificationPayload,
} from "./adapters/notification-adapter.interface";
import type { OrderWithItems } from "../repositories/interfaces/orders.repository.interface";

const orderItem = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "i1",
    orderId: "o1",
    cartItemId: "c1",
    variantId: "v1",
    productSlug: "hoodie-premium",
    productNameEs: "Hoodie Premium",
    productNameEn: "Premium Hoodie",
    category: "hoodies",
    gender: "hombre",
    size: "M",
    colorId: "negro",
    colorNameEs: "Negro",
    colorNameEn: "Black",
    colorHex: "#000",
    imageUrl: null,
    unitPriceCop: 119900,
    quantity: 2,
    lineTotalCop: 239800,
    createdAt: new Date(),
    designs: [],
    ...overrides,
  }) as unknown as OrderWithItems["orderItems"][number];

const order = (items = [orderItem()]): OrderWithItems =>
  ({
    id: "3f2b1a90-0000-4000-8000-000000000000",
    createdAt: new Date(),
    updatedAt: new Date(),
    status: OrderStatus.paid,
    paymentProvider: "mercadopago",
    customer: {
      firstName: "Ana",
      lastName: "Perez",
      email: "ana@example.com",
      phone: "3000000000",
    },
    shipping: {
      address: "Calle 1 #2-3",
      city: "Bogota",
      department: "Bogota D.C.",
      country: "Colombia",
      cost: 20000,
    },
    totals: { subtotal: 239800, shipping: 20000, total: 259800, currency: "COP" },
    items: [],
    payment: null,
    orderItems: items,
  }) as unknown as OrderWithItems;

describe("NotificationsService", () => {
  const build = (adapters: NotificationAdapter[]) => new NotificationsService(adapters);

  const capture = () => {
    const seen: PaidOrderNotificationPayload[] = [];
    const adapter: NotificationAdapter = {
      channel: "test",
      sendPaidOrderNotification: async (payload) => {
        seen.push(payload);
      },
    };
    return { adapter, seen };
  };

  // Antes esto se leia de la columna Json `items` con un bloque de coerciones,
  // asi que el recibo solo podia mostrar un nombre y una cantidad.
  it("arma el payload desde las lineas tipadas", async () => {
    const { adapter, seen } = capture();
    await build([adapter]).notifyPaidOrder(order());

    expect(seen[0].items[0]).toEqual({
      name: "Hoodie Premium",
      quantity: 2,
      unitPrice: 119900,
      size: "M",
      colorName: "Negro",
      gender: "hombre",
      personalized: false,
    });
    expect(seen[0]).toMatchObject({
      customerName: "Ana Perez",
      customerEmail: "ana@example.com",
      subtotal: 239800,
      shippingCost: 20000,
      totalPaid: 259800,
    });
  });

  it("marca como personalizada la linea que lleva diseno", async () => {
    const { adapter, seen } = capture();
    await build([adapter]).notifyPaidOrder(
      order([orderItem({ designs: [{ id: "d1", side: "front" }] })]),
    );

    expect(seen[0].items[0].personalized).toBe(true);
  });

  // Si un canal caido propagara, el webhook no devolveria 200 y Mercado Pago
  // reintentaria contra una orden ya en estado terminal.
  it("un adapter que falla no impide que los demas reciban", async () => {
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const { adapter, seen } = capture();
    const roto: NotificationAdapter = {
      channel: "roto",
      sendPaidOrderNotification: async () => {
        throw new Error("caido");
      },
    };

    await expect(build([roto, adapter]).notifyPaidOrder(order())).resolves.toBeUndefined();
    expect(seen).toHaveLength(1);
    jest.restoreAllMocks();
  });

  it("el aviso de arte listo solo va a los canales que lo implementan", async () => {
    const conAviso = {
      channel: "a",
      sendPaidOrderNotification: jest.fn(),
      sendPrintAssetsReadyNotification: jest.fn(),
    };
    const sinAviso = { channel: "b", sendPaidOrderNotification: jest.fn() };

    await build([conAviso, sinAviso]).notifyPrintAssetsReady({
      orderId: "o1",
      customerName: "Ana",
      fileCount: 2,
      downloadUrl: "https://x/y.zip",
      expiresInMinutes: 60,
    });

    expect(conAviso.sendPrintAssetsReadyNotification).toHaveBeenCalledTimes(1);
  });
});

describe("plantilla del recibo", () => {
  const payload: PaidOrderNotificationPayload = {
    orderId: "3f2b1a90-0000-4000-8000-000000000000",
    customerName: "Ana Perez",
    customerEmail: "ana@example.com",
    shippingAddress: "Calle 1 #2-3",
    department: "Bogota D.C.",
    city: "Bogota",
    country: "Colombia",
    shippingCost: 20000,
    subtotal: 239800,
    totalPaid: 259800,
    currency: "COP",
    items: [
      {
        name: "Hoodie Premium",
        quantity: 2,
        unitPrice: 119900,
        size: "M",
        colorName: "Negro",
        gender: "hombre",
        personalized: true,
      },
    ],
  };

  it("muestra talla, color y el total en pesos", () => {
    const { subject, html, text } = paidOrderEmail(payload);

    expect(subject).toContain("3F2B1A90");
    expect(html).toContain("Hoodie Premium");
    expect(html).toContain("Talla M");
    expect(html).toContain("Negro");
    expect(text).toContain("Total:");
  });

  // Los nombres los escribe el cliente y terminan dentro de HTML.
  it("escapa el HTML de los datos del cliente", () => {
    const { html } = paidOrderEmail({
      ...payload,
      customerName: '<script>alert("x")</script>',
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("incluye una version en texto plano", () => {
    const { text } = paidOrderEmail(payload);
    expect(text).toContain("Hoodie Premium");
    expect(text).not.toContain("<");
  });
});

describe("ResendEmailNotificationAdapter", () => {
  const adapter = new ResendEmailNotificationAdapter();
  const payload = {
    orderId: "o1",
    customerName: "Ana",
    customerEmail: "ana@example.com",
    shippingAddress: "x",
    department: "y",
    city: "z",
    country: "Colombia",
    shippingCost: 0,
    subtotal: 1,
    totalPaid: 1,
    currency: "COP",
    items: [],
  } as PaidOrderNotificationPayload;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
  });

  afterEach(() => jest.restoreAllMocks());

  // Sin credenciales avisa y sigue: que no salga el recibo no puede dejar la
  // orden sin confirmar.
  it("sin credenciales no lanza ni llama a la API", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(adapter.sendPaidOrderNotification(payload)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sin correo del cliente tampoco llama a la API", async () => {
    process.env.RESEND_API_KEY = "re_x";
    process.env.RESEND_FROM_EMAIL = "pedidos@atuestampa.com";
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await adapter.sendPaidOrderNotification({ ...payload, customerEmail: undefined });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("manda el correo al comprador cuando esta configurado", async () => {
    process.env.RESEND_API_KEY = "re_x";
    process.env.RESEND_FROM_EMAIL = "pedidos@atuestampa.com";
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    await adapter.sendPaidOrderNotification(payload);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.to).toEqual(["ana@example.com"]);
    expect(body.from).toBe("pedidos@atuestampa.com");
    expect(body.html).toContain("Ana");
  });

  it("propaga el error de la API para que quede en el log", async () => {
    process.env.RESEND_API_KEY = "re_x";
    process.env.RESEND_FROM_EMAIL = "pedidos@atuestampa.com";
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => "dominio sin verificar",
    }) as unknown as typeof fetch;

    await expect(adapter.sendPaidOrderNotification(payload)).rejects.toThrow(/422/);
  });
});
