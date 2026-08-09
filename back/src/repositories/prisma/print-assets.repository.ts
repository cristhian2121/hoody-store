import { Injectable } from "@nestjs/common";
import { Prisma, PrintAsset, PrintAssetStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  ClaimedPrintJob,
  PrintAssetReady,
  PrintAssetsRepository,
} from "../interfaces/print-assets.repository.interface";
import type { NormalizedLayer } from "../../print/design-validation.service";

interface ClaimRow {
  print_asset_id: string;
  design_id: string;
  order_id: string;
  side: ClaimedPrintJob["side"];
  category: ClaimedPrintJob["category"];
  print_area_width_mm: Prisma.Decimal;
  print_area_height_mm: Prisma.Decimal;
  dpi: number;
  layer: NormalizedLayer;
  image_storage_key: string | null;
  attempts: number;
}

@Injectable()
export class PrintAssetsRepositoryPrisma implements PrintAssetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async enqueueForOrder(orderId: string): Promise<number> {
    const designs = await this.prisma.orderItemDesign.findMany({
      where: { orderItem: { orderId } },
      select: { id: true, dpi: true, printAssets: { select: { id: true } } },
    });

    // Solo los que todavia no tienen trabajo. Mercado Pago reintenta los
    // webhooks y encolar dos veces significaria renderizar dos veces un archivo
    // de 60 MB.
    const pending = designs.filter((design) => design.printAssets.length === 0);
    if (pending.length === 0) return 0;

    const created = await this.prisma.printAsset.createMany({
      data: pending.map((design) => ({
        designId: design.id,
        status: PrintAssetStatus.pending,
        dpi: design.dpi,
      })),
    });

    return created.count;
  }

  /**
   * Reclama un trabajo de forma atomica.
   *
   * `FOR UPDATE SKIP LOCKED` es lo que convierte una tabla en una cola: la fila
   * elegida queda bloqueada dentro de la transaccion del UPDATE y cualquier otro
   * trabajador la salta en vez de esperarla. Sin `SKIP LOCKED` dos procesos se
   * bloquearian entre si; sin `FOR UPDATE` ambos reclamarian el mismo trabajo y
   * el archivo se renderizaria dos veces.
   */
  async claimNext(maxAttempts: number): Promise<ClaimedPrintJob | null> {
    const rows = await this.prisma.$queryRaw<ClaimRow[]>`
      WITH claimed AS (
        UPDATE print_assets
        SET status = 'rendering',
            started_at = now(),
            attempts = attempts + 1,
            "updatedAt" = now()
        WHERE id = (
          SELECT id FROM print_assets
          WHERE status = 'pending' AND attempts < ${maxAttempts}
          ORDER BY "createdAt" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        RETURNING id, design_id, attempts
      )
      SELECT
        claimed.id            AS print_asset_id,
        claimed.design_id     AS design_id,
        claimed.attempts      AS attempts,
        items.order_id        AS order_id,
        designs.side          AS side,
        designs.category      AS category,
        designs.print_area_width_mm  AS print_area_width_mm,
        designs.print_area_height_mm AS print_area_height_mm,
        designs.dpi           AS dpi,
        designs.layer         AS layer,
        assets.storage_key    AS image_storage_key
      FROM claimed
      JOIN order_item_designs designs ON designs.id = claimed.design_id
      JOIN order_items items          ON items.id = designs.order_item_id
      LEFT JOIN design_assets assets  ON assets.id = designs.image_asset_id
    `;

    const row = rows[0];
    if (!row) return null;

    return {
      printAssetId: row.print_asset_id,
      designId: row.design_id,
      orderId: row.order_id,
      side: row.side,
      category: row.category,
      printAreaWidthMm: Number(row.print_area_width_mm),
      printAreaHeightMm: Number(row.print_area_height_mm),
      dpi: row.dpi,
      layer: row.layer,
      imageStorageKey: row.image_storage_key,
      attempts: row.attempts,
    };
  }

  async markReady(printAssetId: string, result: PrintAssetReady): Promise<void> {
    await this.prisma.printAsset.update({
      where: { id: printAssetId },
      data: {
        status: PrintAssetStatus.ready,
        completedAt: new Date(),
        lastError: null,
        ...result,
      },
    });
  }

  async markFailed(printAssetId: string, error: string, maxAttempts: number): Promise<void> {
    const current = await this.prisma.printAsset.findUnique({ where: { id: printAssetId } });
    if (!current) return;

    // Vuelve a la cola mientras queden intentos. Un fallo transitorio (el bucket
    // no responde) no deberia dejar sin arte a una orden ya pagada.
    const exhausted = current.attempts >= maxAttempts;

    await this.prisma.printAsset.update({
      where: { id: printAssetId },
      data: {
        status: exhausted ? PrintAssetStatus.failed : PrintAssetStatus.pending,
        lastError: error.slice(0, 1000),
        completedAt: exhausted ? new Date() : null,
      },
    });
  }

  async listByOrder(orderId: string): Promise<PrintAsset[]> {
    return this.prisma.printAsset.findMany({
      where: { design: { orderItem: { orderId } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async findById(printAssetId: string): Promise<PrintAsset | null> {
    return this.prisma.printAsset.findUnique({ where: { id: printAssetId } });
  }

  async isOrderComplete(orderId: string): Promise<boolean> {
    const total = await this.prisma.printAsset.count({
      where: { design: { orderItem: { orderId } } },
    });
    if (total === 0) return false;

    const ready = await this.prisma.printAsset.count({
      where: { design: { orderItem: { orderId } }, status: PrintAssetStatus.ready },
    });

    return ready === total;
  }

  async requeueForOrder(orderId: string): Promise<number> {
    const { count } = await this.prisma.printAsset.updateMany({
      where: { design: { orderItem: { orderId } }, status: { not: PrintAssetStatus.rendering } },
      data: {
        status: PrintAssetStatus.pending,
        attempts: 0,
        lastError: null,
        completedAt: null,
      },
    });
    return count;
  }
}
