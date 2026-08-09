import { DesignAsset } from "@prisma/client";
import { DesignAssetSweepService } from "./design-asset-sweep.service";
import { StorageProvider } from "../storage/interfaces/storage-provider.interface";
import { DesignsRepository } from "../repositories/interfaces/designs.repository.interface";

const asset = (id: string): DesignAsset =>
  ({
    id,
    storageKey: `designs/${id}/master.png`,
    previewKey: `designs/${id}/preview.webp`,
    mimeType: "image/png",
    bytes: 1000,
    width: 100,
    height: 100,
    hasAlpha: true,
    checksumSha256: "a".repeat(64),
    createdAt: new Date("2026-01-01T00:00:00Z"),
  }) as DesignAsset;

class FakeDesigns implements DesignsRepository {
  orphans: DesignAsset[] = [];
  deleted: string[] = [];
  lastCutoff?: Date;
  lastLimit?: number;

  async createAsset(): Promise<DesignAsset> {
    throw new Error("no usado");
  }

  async findAssetById(): Promise<DesignAsset | null> {
    return null;
  }

  async findOrphanAssets(olderThan: Date, limit: number): Promise<DesignAsset[]> {
    this.lastCutoff = olderThan;
    this.lastLimit = limit;
    return this.orphans;
  }

  async deleteAssets(ids: string[]): Promise<number> {
    this.deleted.push(...ids);
    return ids.length;
  }
}

class FakeStorage implements StorageProvider {
  removed: string[] = [];
  failFor = new Set<string>();

  async put(): Promise<void> {}

  async get(): Promise<Buffer> {
    return Buffer.alloc(0);
  }

  async remove(key: string): Promise<void> {
    if (this.failFor.has(key)) throw new Error("el bucket no responde");
    this.removed.push(key);
  }

  async exists(): Promise<boolean> {
    return true;
  }
}

describe("DesignAssetSweepService", () => {
  let designs: FakeDesigns;
  let storage: FakeStorage;
  let service: DesignAssetSweepService;
  const now = new Date("2026-08-02T03:00:00Z");

  beforeEach(() => {
    designs = new FakeDesigns();
    storage = new FakeStorage();
    service = new DesignAssetSweepService(designs, storage);
    delete process.env.DESIGN_ASSET_RETENTION_DAYS;
  });

  it("no hace nada cuando no hay huerfanos", async () => {
    expect(await service.sweep(now)).toBe(0);
    expect(storage.removed).toEqual([]);
    expect(designs.deleted).toEqual([]);
  });

  it("borra los dos derivados y luego la fila", async () => {
    designs.orphans = [asset("uno"), asset("dos")];

    expect(await service.sweep(now)).toBe(2);
    expect(storage.removed).toEqual([
      "designs/uno/master.png",
      "designs/uno/preview.webp",
      "designs/dos/master.png",
      "designs/dos/preview.webp",
    ]);
    expect(designs.deleted).toEqual(["uno", "dos"]);
  });

  it("usa una ventana de 7 dias por defecto", async () => {
    await service.sweep(now);
    expect(designs.lastCutoff).toEqual(new Date("2026-07-26T03:00:00Z"));
  });

  it("respeta DESIGN_ASSET_RETENTION_DAYS", async () => {
    process.env.DESIGN_ASSET_RETENTION_DAYS = "30";
    await service.sweep(now);
    expect(designs.lastCutoff).toEqual(new Date("2026-07-03T03:00:00Z"));
  });

  it("ignora un valor invalido de retencion en vez de borrar todo", async () => {
    process.env.DESIGN_ASSET_RETENTION_DAYS = "cero";
    await service.sweep(now);
    expect(designs.lastCutoff).toEqual(new Date("2026-07-26T03:00:00Z"));

    process.env.DESIGN_ASSET_RETENTION_DAYS = "0";
    await service.sweep(now);
    expect(designs.lastCutoff).toEqual(new Date("2026-07-26T03:00:00Z"));
  });

  // Borrar la fila sin poder borrar el objeto lo dejaria en el bucket sin nada
  // que lo apunte: invisible y pagandose para siempre.
  it("conserva la fila si el archivo no se pudo borrar", async () => {
    designs.orphans = [asset("falla"), asset("ok")];
    storage.failFor.add("designs/falla/master.png");

    expect(await service.sweep(now)).toBe(1);
    expect(designs.deleted).toEqual(["ok"]);
  });

  it("el cron no propaga errores: la limpieza no puede tumbar el proceso", async () => {
    jest.spyOn(designs, "findOrphanAssets").mockRejectedValueOnce(new Error("db caida"));
    await expect(service.sweepScheduled()).resolves.toBeUndefined();
  });
});
