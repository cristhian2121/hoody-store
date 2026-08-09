import { NotFoundException } from "@nestjs/common";
import { OrderStatus, PrintAsset, PrintAssetStatus } from "@prisma/client";
import { AdminService } from "./admin.service";
import type {
  OrderRepository,
  OrderWithItems,
} from "../repositories/interfaces/orders.repository.interface";
import type { PrintAssetsRepository } from "../repositories/interfaces/print-assets.repository.interface";
import type { StorageProvider } from "../storage/interfaces/storage-provider.interface";

const ORDER_ID = "0bb7ec40-bb91-48ad-89d8-692cb8d052a7";

const design = (id: string, side: "front" | "back", widthMm: number, heightMm: number) =>
  ({
    id,
    orderItemId: "item-1",
    side,
    category: "hoodies",
    printAreaWidthMm: widthMm,
    printAreaHeightMm: heightMm,
    dpi: 300,
    schemaVersion: 1,
    layer: {},
    imageAssetId: null,
    createdAt: new Date(),
  }) as unknown as OrderWithItems["orderItems"][number]["designs"][number];

const orderWithItems = (designs = [design("d1", "front", 260, 260)]): OrderWithItems =>
  ({
    id: ORDER_ID,
    createdAt: new Date("2026-08-01T10:00:00Z"),
    updatedAt: new Date(),
    status: OrderStatus.paid,
    paymentProvider: "mercadopago",
    customer: { firstName: "Ana", lastName: "Perez", email: "ana@example.com" },
    shipping: { city: "Bogota" },
    totals: { total: 259800, currency: "COP" },
    items: [{ name: "Hoodie", quantity: 2 }],
    payment: null,
    orderItems: [
      {
        id: "item-1",
        orderId: ORDER_ID,
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
        designs,
      },
    ],
  }) as unknown as OrderWithItems;

const printAsset = (overrides: Partial<PrintAsset> = {}): PrintAsset =>
  ({
    id: "pa-1",
    designId: "d1",
    status: PrintAssetStatus.ready,
    attempts: 1,
    lastError: null,
    format: "png",
    dpi: 300,
    widthPx: 3071,
    heightPx: 3071,
    bytes: 90000,
    storageKey: "prints/o/pa-1.png",
    proofKey: "prints/o/pa-1.jpg",
    checksumSha256: "abc",
    rendererVersion: "1.0.0",
    startedAt: new Date(),
    completedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as PrintAsset;

const collect = (stream: NodeJS.ReadableStream): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (c) => chunks.push(Buffer.from(c)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });

describe("AdminService", () => {
  let orders: jest.Mocked<OrderRepository>;
  let printAssets: jest.Mocked<PrintAssetsRepository>;
  let storage: jest.Mocked<StorageProvider>;
  let service: AdminService;

  beforeEach(() => {
    orders = {
      list: jest.fn(async () => [orderWithItems()]),
      getById: jest.fn(),
      getByIdWithItems: jest.fn(async () => orderWithItems()),
      getByExternalReference: jest.fn(),
      create: jest.fn(),
      attachPayment: jest.fn(),
      applyPaymentResult: jest.fn(),
    } as unknown as jest.Mocked<OrderRepository>;

    printAssets = {
      enqueueForOrder: jest.fn(async () => 1),
      claimNext: jest.fn(),
      markReady: jest.fn(),
      markFailed: jest.fn(),
      listByOrder: jest.fn(async () => [printAsset()]),
      findById: jest.fn(async () => printAsset()),
      isOrderComplete: jest.fn(async () => true),
      requeueForOrder: jest.fn(async () => 2),
    } as unknown as jest.Mocked<PrintAssetsRepository>;

    storage = {
      put: jest.fn(),
      get: jest.fn(async () => Buffer.from("PNG-FALSO")),
      remove: jest.fn(),
      exists: jest.fn(),
    } as unknown as jest.Mocked<StorageProvider>;

    service = new AdminService(orders, printAssets, storage);
  });

  describe("listado", () => {
    it("resume el estado del arte de cada orden", async () => {
      printAssets.listByOrder.mockResolvedValue([
        printAsset({ id: "a", status: PrintAssetStatus.ready }),
        printAsset({ id: "b", status: PrintAssetStatus.failed }),
        printAsset({ id: "c", status: PrintAssetStatus.pending }),
        printAsset({ id: "d", status: PrintAssetStatus.rendering }),
      ]);

      const [row] = await service.listOrders();

      expect(row.printAssets).toEqual({ total: 4, ready: 1, failed: 1, pending: 2 });
      expect(row).toMatchObject({ customerName: "Ana Perez", city: "Bogota", total: 259800 });
    });
  });

  describe("detalle", () => {
    it("404 cuando la orden no existe", async () => {
      orders.getByIdWithItems.mockResolvedValue(null);
      await expect(service.getOrder(ORDER_ID)).rejects.toThrow(NotFoundException);
    });

    // Las ordenes anteriores a la normalizacion no tienen lineas ni arte; el
    // admin tiene que poder mostrar el historial completo igual.
    it("no revienta con una orden sin lineas ni arte", async () => {
      orders.getByIdWithItems.mockResolvedValue({
        ...orderWithItems(),
        orderItems: [],
      } as OrderWithItems);
      printAssets.listByOrder.mockResolvedValue([]);

      const result = await service.getOrder(ORDER_ID);

      expect(result.order.orderItems).toEqual([]);
      expect(result.printAssets).toEqual([]);
    });
  });

  describe("archivos", () => {
    it("entrega la prueba como JPEG", async () => {
      const file = await service.readPrintAssetFile("pa-1", "proof");
      expect(file.contentType).toBe("image/jpeg");
      expect(storage.get).toHaveBeenCalledWith("prints/o/pa-1.jpg");
    });

    it("entrega el archivo de impresion como PNG", async () => {
      const file = await service.readPrintAssetFile("pa-1", "print");
      expect(file.contentType).toBe("image/png");
      expect(storage.get).toHaveBeenCalledWith("prints/o/pa-1.png");
    });

    it("404 mientras el archivo no esta listo", async () => {
      printAssets.findById.mockResolvedValue(
        printAsset({ status: PrintAssetStatus.pending, storageKey: null, proofKey: null }),
      );
      await expect(service.readPrintAssetFile("pa-1", "print")).rejects.toThrow(NotFoundException);
    });
  });

  describe("paquete ZIP", () => {
    // El archivo termina en el computador del operador junto a los de otros
    // pedidos: el nombre tiene que decir que imprimir y a que tamano.
    it("nombra cada archivo con pedido, lado, medidas y dpi", async () => {
      printAssets.listByOrder.mockResolvedValue([printAsset({ designId: "d1" })]);

      const { stream, filename } = await service.buildPrintBundle(ORDER_ID);
      const zip = await collect(stream);
      const contenido = zip.toString("latin1");

      expect(filename).toBe("pedido-0bb7ec40-arte.zip");
      expect(contenido).toContain("0bb7ec40-item1-hoodies-front-260x260mm-300dpi.png");
      expect(zip.subarray(0, 2).toString()).toBe("PK");
    });

    it("incluye frente y espalda con sus propias medidas", async () => {
      orders.getByIdWithItems.mockResolvedValue(
        orderWithItems([design("d1", "front", 260, 260), design("d2", "back", 280, 400)]),
      );
      printAssets.listByOrder.mockResolvedValue([
        printAsset({ id: "a", designId: "d1" }),
        printAsset({ id: "b", designId: "d2" }),
      ]);

      const { stream } = await service.buildPrintBundle(ORDER_ID);
      const contenido = (await collect(stream)).toString("latin1");

      expect(contenido).toContain("front-260x260mm");
      expect(contenido).toContain("back-280x400mm");
    });

    it("no incluye archivos que todavia no estan listos", async () => {
      orders.getByIdWithItems.mockResolvedValue(
        orderWithItems([design("d1", "front", 260, 260), design("d2", "back", 280, 400)]),
      );
      printAssets.listByOrder.mockResolvedValue([
        printAsset({ id: "a", designId: "d1", status: PrintAssetStatus.ready }),
        printAsset({ id: "b", designId: "d2", status: PrintAssetStatus.failed }),
      ]);

      const { stream } = await service.buildPrintBundle(ORDER_ID);
      const contenido = (await collect(stream)).toString("latin1");

      expect(contenido).toContain("front-260x260mm");
      expect(contenido).not.toContain("back-280x400mm");
    });

    it("404 cuando no hay nada listo", async () => {
      printAssets.listByOrder.mockResolvedValue([
        printAsset({ status: PrintAssetStatus.pending, storageKey: null }),
      ]);

      await expect(service.buildPrintBundle(ORDER_ID)).rejects.toThrow(/todavía no tiene arte/);
    });
  });

  describe("reintento", () => {
    it("reencola conservando el historial de intentos", async () => {
      expect(await service.requeue(ORDER_ID)).toBe(2);
      expect(printAssets.requeueForOrder).toHaveBeenCalledWith(ORDER_ID);
      expect(printAssets.enqueueForOrder).not.toHaveBeenCalled();
    });

    // Ordenes anteriores al render automatico no tienen trabajos que reencolar.
    it("crea los trabajos si la orden nunca tuvo", async () => {
      printAssets.requeueForOrder.mockResolvedValue(0);

      expect(await service.requeue(ORDER_ID)).toBe(1);
      expect(printAssets.enqueueForOrder).toHaveBeenCalledWith(ORDER_ID);
    });

    it("404 si la orden no existe", async () => {
      orders.getByIdWithItems.mockResolvedValue(null);
      await expect(service.requeue(ORDER_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
