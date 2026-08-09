import { BadRequestException, NotFoundException } from "@nestjs/common";
import { DesignAsset } from "@prisma/client";
import sharp from "sharp";
import { DesignImageService } from "./design-image.service";
import { StorageProvider } from "../storage/interfaces/storage-provider.interface";
import {
  CreateDesignAssetInput,
  DesignsRepository,
} from "../repositories/interfaces/designs.repository.interface";
import { MAX_UPLOAD_BYTES, PREVIEW_MAX_PX } from "./upload-limits";
import {
  animatedWebp,
  jpeg,
  jpegNeedingExifRotation,
  opaquePngWithAlphaChannel,
  pngWithTransparency,
  svg,
} from "./__fixtures__/build-images";

class FakeStorage implements StorageProvider {
  readonly objects = new Map<string, { body: Buffer; contentType: string }>();

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    this.objects.set(key, { body, contentType });
  }

  async get(key: string): Promise<Buffer> {
    const object = this.objects.get(key);
    if (!object) throw new Error(`No existe ${key}`);
    return object.body;
  }

  async remove(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.objects.has(key);
  }
}

class FakeDesigns implements DesignsRepository {
  readonly assets: DesignAsset[] = [];
  failOnCreate = false;

  async createAsset(input: CreateDesignAssetInput): Promise<DesignAsset> {
    if (this.failOnCreate) throw new Error("la base de datos se cayo");
    const asset = { ...input, createdAt: new Date() } as DesignAsset;
    this.assets.push(asset);
    return asset;
  }

  async findAssetById(id: string): Promise<DesignAsset | null> {
    return this.assets.find((asset) => asset.id === id) ?? null;
  }

  async findOrphanAssets(): Promise<DesignAsset[]> {
    return [];
  }

  async deleteAssets(ids: string[]): Promise<number> {
    return ids.length;
  }
}

const upload = (buffer: Buffer) => ({ buffer, size: buffer.length, originalname: "diseno" });

describe("DesignImageService", () => {
  let storage: FakeStorage;
  let designs: FakeDesigns;
  let service: DesignImageService;

  beforeEach(() => {
    storage = new FakeStorage();
    designs = new FakeDesigns();
    service = new DesignImageService(storage, designs);
    process.env.BACKEND_URL = "https://api.atuestampa.test";
  });

  describe("transparencia", () => {
    it("un PNG transparente sobrevive la ida y vuelta con alfa real", async () => {
      const result = await service.createFromUpload(upload(await pngWithTransparency(200, 120)));

      expect(result.hasAlpha).toBe(true);
      expect(result).toMatchObject({ width: 200, height: 120 });

      const master = await storage.get(`designs/${result.assetId}/master.png`);
      const stats = await sharp(master).stats();
      expect(stats.isOpaque).toBe(false);

      const metadata = await sharp(master).metadata();
      expect(metadata.format).toBe("png");
      expect(metadata.hasAlpha).toBe(true);
    });

    // Distinguirlos es lo que decide si al cliente se le avisa que su estampado
    // saldra con un rectangulo de fondo en vez de recortado.
    it("distingue tener canal alfa de usarlo", async () => {
      const result = await service.createFromUpload(
        upload(await opaquePngWithAlphaChannel(200, 120)),
      );
      expect(result.hasAlpha).toBe(false);
    });

    it("un JPEG nunca reporta transparencia", async () => {
      const result = await service.createFromUpload(upload(await jpeg()));
      expect(result.hasAlpha).toBe(false);
    });
  });

  describe("normalizacion", () => {
    it("aplica la orientacion EXIF, asi que la foto no se imprime acostada", async () => {
      const result = await service.createFromUpload(
        upload(await jpegNeedingExifRotation(200, 100)),
      );

      // El archivo declara 200x100 con orientacion 6 (girar 90 grados).
      expect(result.width).toBe(100);
      expect(result.height).toBe(200);
    });

    it("reencodea todo a PNG, sea cual sea el formato de entrada", async () => {
      const result = await service.createFromUpload(upload(await jpeg()));
      const master = await storage.get(`designs/${result.assetId}/master.png`);
      expect((await sharp(master).metadata()).format).toBe("png");
    });

    // La recodificacion es el saneamiento: lo que sale son pixeles vueltos a
    // codificar por libvips, no el archivo del cliente con otro nombre.
    it("descarta el EXIF del original", async () => {
      const result = await service.createFromUpload(upload(await jpegNeedingExifRotation()));
      const master = await storage.get(`designs/${result.assetId}/master.png`);
      const metadata = await sharp(master).metadata();

      expect(metadata.exif).toBeUndefined();
      // Girado de verdad, no girado por una etiqueta que el siguiente lector
      // podria volver a aplicar.
      expect(metadata.orientation).toBeUndefined();
    });

    it("genera un preview de 600 px derivado del master", async () => {
      const result = await service.createFromUpload(upload(await pngWithTransparency(1200, 600)));
      const preview = await storage.get(`designs/${result.assetId}/preview.webp`);
      const metadata = await sharp(preview).metadata();

      expect(metadata.format).toBe("webp");
      expect(metadata.width).toBe(PREVIEW_MAX_PX);
      expect(metadata.height).toBe(300);
    });

    it("no agranda un original mas chico que el preview", async () => {
      const result = await service.createFromUpload(upload(await pngWithTransparency(120, 80)));
      const preview = await storage.get(`designs/${result.assetId}/preview.webp`);
      expect((await sharp(preview).metadata()).width).toBe(120);
    });
  });

  describe("rechazos", () => {
    const rejects = async (buffer: Buffer, fragment: string) => {
      await expect(service.createFromUpload(upload(buffer))).rejects.toThrow(BadRequestException);
      await expect(service.createFromUpload(upload(buffer))).rejects.toThrow(
        expect.objectContaining({ message: expect.stringContaining(fragment) }),
      );
    };

    it("rechaza SVG", async () => {
      await rejects(svg(), "svg");
    });

    // sharp lo lee como una imagen fija de una sola pagina, asi que sin esta
    // validacion se estamparia el primer cuadro en silencio.
    it("rechaza imagenes animadas", async () => {
      await rejects(await animatedWebp(), "animadas");
    });

    it("rechaza un archivo que no es una imagen", async () => {
      await rejects(Buffer.from("PK esto es un zip renombrado"), "No pudimos leer");
    });

    it("rechaza un archivo vacio", async () => {
      await expect(service.createFromUpload(upload(Buffer.alloc(0)))).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createFromUpload(undefined)).rejects.toThrow(BadRequestException);
    });

    it("rechaza dimensiones desmedidas", async () => {
      await rejects(await pngWithTransparency(9000, 20), "8000 px");
    });

    it("rechaza una imagen demasiado pequena para estampar", async () => {
      await rejects(await pngWithTransparency(40, 40), "pequena");
    });

    it("rechaza un buffer mas grande que el tope", async () => {
      const oversized = Buffer.alloc(MAX_UPLOAD_BYTES + 1);
      await expect(service.createFromUpload(upload(oversized))).rejects.toThrow(/supera el maximo/);
    });

    it("no deja nada en el almacenamiento cuando rechaza", async () => {
      await expect(service.createFromUpload(upload(svg()))).rejects.toThrow();
      expect(storage.objects.size).toBe(0);
    });
  });

  describe("consistencia entre almacenamiento y base de datos", () => {
    it("guarda master y preview antes de crear la fila", async () => {
      const result = await service.createFromUpload(upload(await pngWithTransparency()));

      expect([...storage.objects.keys()].sort()).toEqual([
        `designs/${result.assetId}/master.png`,
        `designs/${result.assetId}/preview.webp`,
      ]);
      expect(designs.assets).toHaveLength(1);
      expect(designs.assets[0].checksumSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(designs.assets[0].bytes).toBe(result.bytes);
    });

    // Una fila apuntando a un objeto inexistente reventaria al imprimir una
    // orden ya pagada; un objeto sin fila solo ocupa espacio hasta el barrido.
    it("borra los archivos si la fila no se pudo crear", async () => {
      designs.failOnCreate = true;
      await expect(service.createFromUpload(upload(await pngWithTransparency()))).rejects.toThrow(
        "la base de datos se cayo",
      );
      expect(storage.objects.size).toBe(0);
    });
  });

  describe("preview", () => {
    it("devuelve los bytes del preview y su content type", async () => {
      const result = await service.createFromUpload(upload(await pngWithTransparency()));
      const preview = await service.readPreview(result.assetId);

      expect(preview.contentType).toBe("image/webp");
      expect((await sharp(preview.body).metadata()).format).toBe("webp");
    });

    it("404 cuando el asset no existe", async () => {
      await expect(service.readPreview("00000000-0000-4000-8000-000000000000")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("la url del preview usa la base publica del backend", async () => {
      const result = await service.createFromUpload(upload(await pngWithTransparency()));
      expect(result.previewUrl).toBe(
        `https://api.atuestampa.test/api/uploads/design-image/${result.assetId}/preview`,
      );
    });

    // El master no se sirve nunca por HTTP: solo lo lee el renderer.
    it("la url publica no expone el master", async () => {
      const result = await service.createFromUpload(upload(await pngWithTransparency()));
      expect(result.previewUrl).not.toContain("master");
    });
  });
});
