import type { DesignAsset } from "@prisma/client";

export interface CreateDesignAssetInput {
  id: string;
  storageKey: string;
  previewKey: string;
  mimeType: string;
  bytes: number;
  width: number;
  height: number;
  hasAlpha: boolean;
  checksumSha256: string;
}

export interface DesignsRepository {
  createAsset(input: CreateDesignAssetInput): Promise<DesignAsset>;

  findAssetById(id: string): Promise<DesignAsset | null>;

  /**
   * Assets sin ningun OrderItemDesign asociado y mas viejos que `olderThan`.
   * Son subidas que nunca terminaron en una compra.
   */
  findOrphanAssets(olderThan: Date, limit: number): Promise<DesignAsset[]>;

  deleteAssets(ids: string[]): Promise<number>;
}

export const DESIGNS_REPOSITORY = "DesignsRepository";
