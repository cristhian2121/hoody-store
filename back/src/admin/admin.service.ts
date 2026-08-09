import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrintAsset, PrintAssetStatus } from "@prisma/client";
// archiver 7 y no 8: la 8 es ESM puro y este proyecto compila a CommonJS de
// punta a punta, asi que Jest no puede cargarla y el dist dependeria de que
// Node soporte require() sobre ESM.
import archiver from "archiver";
import { PassThrough, Readable } from "node:stream";
import {
  OrderRepository,
  OrderWithItems,
} from "../repositories/interfaces/orders.repository.interface";
import {
  PRINT_ASSETS_REPOSITORY,
  PrintAssetsRepository,
} from "../repositories/interfaces/print-assets.repository.interface";
import {
  STORAGE_PROVIDER,
  StorageProvider,
} from "../storage/interfaces/storage-provider.interface";

export interface AdminOrderSummary {
  id: string;
  createdAt: Date;
  status: string;
  customerName: string;
  customerEmail: string | null;
  city: string | null;
  total: number;
  currency: string;
  itemCount: number;
  /** Cuantos lados estampados tiene la orden y en que estado va su arte. */
  printAssets: { total: number; ready: number; failed: number; pending: number };
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @Inject("OrderRepository") private readonly orders: OrderRepository,
    @Inject(PRINT_ASSETS_REPOSITORY) private readonly printAssets: PrintAssetsRepository,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async listOrders(): Promise<AdminOrderSummary[]> {
    const orders = await this.orders.list();

    return Promise.all(
      orders.map(async (order) => {
        const assets = await this.printAssets.listByOrder(order.id);
        const customer = (order.customer as Record<string, unknown>) ?? {};
        const shipping = (order.shipping as Record<string, unknown>) ?? {};
        const totals = (order.totals as Record<string, unknown>) ?? {};
        // La columna Json `items` es heredada; para las ordenes nuevas la
        // fuente de verdad es la relacion. Se usa como respaldo solo para que
        // las ordenes anteriores a la normalizacion sigan mostrando un conteo.
        const detail = await this.orders.getByIdWithItems(order.id);
        const items = detail?.orderItems.length
          ? detail.orderItems
          : Array.isArray(order.items)
            ? order.items
            : [];

        return {
          id: order.id,
          createdAt: order.createdAt,
          status: order.status,
          customerName:
            [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || "Cliente",
          customerEmail: typeof customer.email === "string" ? customer.email : null,
          city: typeof shipping.city === "string" ? shipping.city : null,
          total: Number(totals.total) || 0,
          currency: typeof totals.currency === "string" ? totals.currency : "COP",
          itemCount: items.length,
          printAssets: {
            total: assets.length,
            ready: assets.filter((a) => a.status === PrintAssetStatus.ready).length,
            failed: assets.filter((a) => a.status === PrintAssetStatus.failed).length,
            pending: assets.filter(
              (a) =>
                a.status === PrintAssetStatus.pending || a.status === PrintAssetStatus.rendering,
            ).length,
          },
        };
      }),
    );
  }

  async getOrder(id: string): Promise<{ order: OrderWithItems; printAssets: PrintAsset[] }> {
    const order = await this.orders.getByIdWithItems(id);
    if (!order) throw new NotFoundException("Orden no encontrada.");

    // Las ordenes anteriores a la normalizacion no tienen lineas ni arte. Se
    // devuelven igual con listas vacias en vez de reventar: el admin tiene que
    // poder mostrar el historial completo.
    return { order, printAssets: await this.printAssets.listByOrder(id) };
  }

  async readPrintAssetFile(
    printAssetId: string,
    kind: "print" | "proof",
  ): Promise<{ body: Buffer; contentType: string; filename: string }> {
    const asset = await this.printAssets.findById(printAssetId);
    if (!asset) throw new NotFoundException("Archivo no encontrado.");

    const key = kind === "proof" ? asset.proofKey : asset.storageKey;
    if (!key) throw new NotFoundException("Ese archivo todavía no está listo.");

    return {
      body: await this.storage.get(key),
      contentType: kind === "proof" ? "image/jpeg" : "image/png",
      filename: key.split("/").pop() as string,
    };
  }

  /**
   * Empaqueta todo el arte de una orden en un ZIP.
   *
   * Los nombres llevan orden, linea, categoria, lado, medidas y dpi porque el
   * archivo termina en el computador del operador de la impresora junto a los de
   * otros pedidos: `f6f059fb.png` no le dice nada a nadie a las tres de la
   * madrugada.
   */
  async buildPrintBundle(orderId: string): Promise<{ stream: Readable; filename: string }> {
    const { order, printAssets } = await this.getOrder(orderId);

    const ready = printAssets.filter(
      (asset) => asset.status === PrintAssetStatus.ready && asset.storageKey,
    );
    if (ready.length === 0) {
      throw new NotFoundException("Esta orden todavía no tiene arte listo para descargar.");
    }

    const designsById = new Map(
      order.orderItems.flatMap((item, index) =>
        item.designs.map((design) => [design.id, { design, item, index: index + 1 }] as const),
      ),
    );

    // Nivel 6 y no 9: los PNG ya vienen comprimidos y volver a exprimirlos solo
    // gasta CPU para ahorrar casi nada.
    const archive = archiver("zip", { zlib: { level: 6 } });
    const output = new PassThrough();
    archive.pipe(output);

    // Un fallo a mitad del stream ya no se puede convertir en un codigo HTTP:
    // las cabeceras se enviaron. Se registra y se corta la respuesta.
    archive.on("error", (error: Error) => {
      this.logger.error(`Error armando el ZIP de ${orderId}: ${error.message}`);
      output.destroy(error);
    });

    const shortOrder = orderId.slice(0, 8);

    for (const asset of ready) {
      const context = designsById.get(asset.designId);
      const body = await this.storage.get(asset.storageKey as string);

      const parts = context
        ? [
            shortOrder,
            `item${context.index}`,
            context.design.category,
            context.design.side,
            `${Number(context.design.printAreaWidthMm)}x${Number(context.design.printAreaHeightMm)}mm`,
            `${asset.dpi}dpi`,
          ]
        : [shortOrder, asset.id.slice(0, 8)];

      archive.append(body, { name: `${parts.join("-")}.png` });
    }

    await archive.finalize();

    return { stream: output, filename: `pedido-${shortOrder}-arte.zip` };
  }

  async requeue(orderId: string): Promise<number> {
    await this.getOrder(orderId);
    // Reencolar y no crear trabajos nuevos: asi se conserva el historial de
    // intentos y errores de cada lado.
    const requeued = await this.printAssets.requeueForOrder(orderId);
    if (requeued === 0) {
      // Puede pasar con ordenes anteriores al render automatico.
      return this.printAssets.enqueueForOrder(orderId);
    }
    return requeued;
  }
}
