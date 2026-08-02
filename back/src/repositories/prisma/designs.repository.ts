import { Injectable } from "@nestjs/common";
import { DesignAsset } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateDesignAssetInput,
  DesignsRepository,
} from "../interfaces/designs.repository.interface";

@Injectable()
export class DesignsRepositoryPrisma implements DesignsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createAsset(input: CreateDesignAssetInput): Promise<DesignAsset> {
    return this.prisma.designAsset.create({ data: input });
  }

  async findAssetById(id: string): Promise<DesignAsset | null> {
    return this.prisma.designAsset.findUnique({ where: { id } });
  }

  async findOrphanAssets(olderThan: Date, limit: number): Promise<DesignAsset[]> {
    return this.prisma.designAsset.findMany({
      where: {
        createdAt: { lt: olderThan },
        // `none` traduce a NOT EXISTS: el asset no esta referenciado por ninguna
        // linea de ninguna orden, ni pagada ni abandonada.
        designs: { none: {} },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  async deleteAssets(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await this.prisma.designAsset.deleteMany({ where: { id: { in: ids } } });
    return result.count;
  }
}
