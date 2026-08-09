import { Inject, Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { createHash } from "node:crypto";
import {
  PRINT_ASSETS_REPOSITORY,
  PrintAssetsRepository,
  ClaimedPrintJob,
} from "../../repositories/interfaces/print-assets.repository.interface";
import {
  STORAGE_PROVIDER,
  StorageProvider,
} from "../../storage/interfaces/storage-provider.interface";
import { OrderRepository } from "../../repositories/interfaces/orders.repository.interface";
import { NotificationsService } from "../../notifications/notifications.service";
import { PrintDownloadTokenService } from "../print-download-token.service";
import { PrintFileRendererService, RENDERER_VERSION } from "./print-file-renderer.service";

/** Tras tres intentos fallidos deja de reintentar y lo resuelve una persona. */
const MAX_ATTEMPTS = 3;

/** Cada cuanto mira si hay trabajo. */
const POLL_INTERVAL_MS = 5_000;

export const printStorageKey = (orderId: string, printAssetId: string, ext: string): string =>
  `prints/${orderId}/${printAssetId}.${ext}`;

/**
 * Consume la cola de renders, de a uno.
 *
 * De a uno a proposito: un lienzo de 280 x 400 mm a 300 dpi son 3307 x 4724 px,
 * y cada intermedio RGBA ronda los 62 MB. Dos renders simultaneos en un
 * contenedor con memoria limitada terminan en un proceso muerto a mitad del arte
 * de una orden ya pagada.
 *
 * Tampoco se renderiza dentro del webhook: Mercado Pago reintenta ante una
 * respuesta lenta, y eso significaria renderizar el mismo archivo dos veces.
 */
@Injectable()
export class PrintWorkerService {
  private readonly logger = new Logger(PrintWorkerService.name);
  private running = false;

  constructor(
    @Inject(PRINT_ASSETS_REPOSITORY) private readonly printAssets: PrintAssetsRepository,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    @Inject("OrderRepository") private readonly orders: OrderRepository,
    private readonly renderer: PrintFileRendererService,
    private readonly notifications: NotificationsService,
    private readonly downloadTokens: PrintDownloadTokenService,
  ) {}

  @Interval(POLL_INTERVAL_MS)
  async tick(): Promise<void> {
    // El intervalo dispara aunque el anterior siga corriendo; sin esta guarda
    // un render lento acumularia ejecuciones solapadas.
    if (this.running) return;
    this.running = true;
    try {
      // Se vacia la cola en cada tick, pero secuencialmente.
      while (await this.processOne()) {
        /* sigue mientras haya trabajo */
      }
    } finally {
      this.running = false;
    }
  }

  /** Devuelve true si proceso un trabajo, false si la cola estaba vacia. */
  async processOne(): Promise<boolean> {
    const job = await this.printAssets.claimNext(MAX_ATTEMPTS);
    if (!job) return false;

    try {
      await this.renderJob(job);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Render fallido de ${job.printAssetId} (intento ${job.attempts}/${MAX_ATTEMPTS}): ${message}`,
      );
      await this.printAssets.markFailed(job.printAssetId, message, MAX_ATTEMPTS);
      return true;
    }
  }

  private async renderJob(job: ClaimedPrintJob): Promise<void> {
    const imageMaster = job.imageStorageKey ? await this.storage.get(job.imageStorageKey) : null;

    const result = await this.renderer.render({
      layer: job.layer,
      printAreaWidthMm: job.printAreaWidthMm,
      printAreaHeightMm: job.printAreaHeightMm,
      dpi: job.dpi,
      imageMaster,
    });

    const storageKey = printStorageKey(job.orderId, job.printAssetId, "png");
    const proofKey = printStorageKey(job.orderId, job.printAssetId, "jpg");

    await this.storage.put(storageKey, result.png, "image/png");
    await this.storage.put(proofKey, result.proof, "image/jpeg");

    await this.printAssets.markReady(job.printAssetId, {
      storageKey,
      proofKey,
      widthPx: result.widthPx,
      heightPx: result.heightPx,
      bytes: result.bytes,
      checksumSha256: createHash("sha256").update(result.png).digest("hex"),
      rendererVersion: RENDERER_VERSION,
    });

    this.logger.log(`Arte listo para la orden ${job.orderId}: ${job.side} -> ${storageKey}`);

    await this.notifyIfOrderComplete(job.orderId);
  }

  /**
   * Avisa una sola vez, cuando el ULTIMO lado de la orden queda listo.
   *
   * Una orden con frente y espalda produce dos archivos; avisar por cada uno
   * seria mandar al dueno a descargar un ZIP incompleto.
   */
  private async notifyIfOrderComplete(orderId: string): Promise<void> {
    try {
      if (!(await this.printAssets.isOrderComplete(orderId))) return;

      const assets = await this.printAssets.listByOrder(orderId);
      const order = await this.orders.getByIdWithItems(orderId);
      const customer = (order?.customer as Record<string, unknown> | undefined) ?? {};
      const { url, expiresInMinutes } = this.downloadTokens.downloadUrl(orderId);

      await this.notifications.notifyPrintAssetsReady({
        orderId,
        customerName:
          [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || "Cliente",
        fileCount: assets.length,
        downloadUrl: url,
        expiresInMinutes,
      });
    } catch (error) {
      // Avisar es conveniencia; el arte ya esta guardado y visible en el admin.
      this.logger.error(
        `No se pudo avisar que el arte de ${orderId} esta listo: ${(error as Error).message}`,
      );
    }
  }
}
