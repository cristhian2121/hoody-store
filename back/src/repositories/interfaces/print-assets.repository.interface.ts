import { PrintAsset, PrintSide, ProductCategory } from "@prisma/client";
import type { NormalizedLayer } from "../../print/design-validation.service";

/** Trabajo reclamado de la cola, con todo lo que el renderer necesita. */
export interface ClaimedPrintJob {
  printAssetId: string;
  designId: string;
  orderId: string;
  side: PrintSide;
  category: ProductCategory;
  printAreaWidthMm: number;
  printAreaHeightMm: number;
  dpi: number;
  layer: NormalizedLayer;
  /** Clave del master en el almacenamiento; null si el diseno es solo texto. */
  imageStorageKey: string | null;
  attempts: number;
}

export interface PrintAssetReady {
  storageKey: string;
  proofKey: string;
  widthPx: number;
  heightPx: number;
  bytes: number;
  checksumSha256: string;
  rendererVersion: string;
}

export interface PrintAssetsRepository {
  /**
   * Crea un trabajo por cada lado estampado de la orden. Idempotente: volver a
   * llamarla no duplica trabajos, porque Mercado Pago reintenta los webhooks.
   */
  enqueueForOrder(orderId: string): Promise<number>;

  /**
   * Reclama un trabajo para este proceso. Devuelve null si no hay ninguno.
   * Dos trabajadores concurrentes nunca reciben el mismo.
   */
  claimNext(maxAttempts: number): Promise<ClaimedPrintJob | null>;

  markReady(printAssetId: string, result: PrintAssetReady): Promise<void>;

  /** Vuelve a `pending` si quedan reintentos, o a `failed` si se agotaron. */
  markFailed(printAssetId: string, error: string, maxAttempts: number): Promise<void>;

  listByOrder(orderId: string): Promise<PrintAsset[]>;

  findById(printAssetId: string): Promise<PrintAsset | null>;

  /** Cierto cuando todos los trabajos de la orden estan listos. */
  isOrderComplete(orderId: string): Promise<boolean>;

  /** Devuelve trabajos a la cola para volverlos a renderizar. */
  requeueForOrder(orderId: string): Promise<number>;
}

export const PRINT_ASSETS_REPOSITORY = "PrintAssetsRepository";
