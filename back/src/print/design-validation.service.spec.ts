import { BadRequestException } from "@nestjs/common";
import { DesignAsset } from "@prisma/client";
import { DesignValidationService } from "./design-validation.service";
import { DesignsRepository } from "../repositories/interfaces/designs.repository.interface";
import type { DesignDto } from "../api/dto/checkout.dto";

const ASSET_ID = "44444444-4444-4444-8444-444444444444";

const asset = (overrides: Partial<DesignAsset> = {}): DesignAsset =>
  ({
    id: ASSET_ID,
    storageKey: `designs/${ASSET_ID}/master.png`,
    previewKey: `designs/${ASSET_ID}/preview.webp`,
    mimeType: "image/png",
    bytes: 100000,
    width: 2000,
    height: 1200,
    hasAlpha: true,
    checksumSha256: "a".repeat(64),
    createdAt: new Date(),
    ...overrides,
  }) as DesignAsset;

const text = (overrides: Partial<DesignDto["texts"][number]> = {}) =>
  ({
    content: "Hola",
    x: 50,
    y: 60,
    fontFamily: "Plus Jakarta Sans",
    fontSize: 24,
    color: "#FFFFFF",
    bold: false,
    italic: false,
    scale: 1,
    rotation: 0,
    ...overrides,
  }) as DesignDto["texts"][number];

const image = (overrides: Partial<NonNullable<DesignDto["image"]>> = {}) =>
  ({
    assetId: ASSET_ID,
    x: 50,
    y: 50,
    scale: 1,
    rotation: 0,
    ...overrides,
  }) as NonNullable<DesignDto["image"]>;

describe("DesignValidationService", () => {
  let designs: jest.Mocked<DesignsRepository>;
  let service: DesignValidationService;

  beforeEach(() => {
    designs = {
      createAsset: jest.fn(),
      findAssetById: jest.fn(async () => asset()),
      findOrphanAssets: jest.fn(),
      deleteAssets: jest.fn(),
    } as unknown as jest.Mocked<DesignsRepository>;

    service = new DesignValidationService(designs);
  });

  describe("imagenes", () => {
    it("rechaza una imagen que ya no existe", async () => {
      designs.findAssetById.mockResolvedValue(null);

      await expect(
        service.validateItemDesigns([{ side: "front", image: image(), texts: [] }], "hoodies"),
      ).rejects.toThrow(BadRequestException);
    });

    // Este es el punto de todo el servicio: el cuerpo del checkout se puede
    // escribir a mano, asi que las dimensiones tienen que salir de la fila del
    // asset. Si vinieran del pedido, declarar 10000 px saltaria el piso de dpi.
    it("toma las dimensiones del asset, no del pedido", async () => {
      designs.findAssetById.mockResolvedValue(asset({ width: 3000, height: 1500 }));

      const [design] = await service.validateItemDesigns(
        [{ side: "front", image: image(), texts: [] }],
        "hoodies",
      );

      expect(design.layer.image).toMatchObject({ naturalWidth: 3000, naturalHeight: 1500 });
    });

    it("calcula el tamano fisico y el dpi con el area de la categoria", async () => {
      const [design] = await service.validateItemDesigns(
        [{ side: "front", image: image(), texts: [] }],
        "hoodies",
      );

      // Frente de hoodie: 260 mm. Escala 1 -> 60% = 156 mm.
      expect(design.printAreaWidthMm).toBe(260);
      expect(design.layer.image?.drawWidthMm).toBeCloseTo(156, 6);
      expect(design.layer.image?.effectiveDpi).toBeCloseTo((2000 * 25.4) / 156, 4);
    });

    it("rechaza una imagen que quedaria por debajo del piso de calidad", async () => {
      designs.findAssetById.mockResolvedValue(asset({ width: 200, height: 120 }));

      await expect(
        service.validateItemDesigns([{ side: "front", image: image(), texts: [] }], "hoodies"),
      ).rejects.toThrow(/dpi/i);
    });

    it("acepta una calidad mediocre pero imprimible", async () => {
      // 700 px sobre 156 mm ~ 114 dpi: se ve pixelado, se puede comprar.
      designs.findAssetById.mockResolvedValue(asset({ width: 700, height: 420 }));

      const [design] = await service.validateItemDesigns(
        [{ side: "front", image: image(), texts: [] }],
        "hoodies",
      );

      expect(design.layer.image?.effectiveDpi).toBeGreaterThan(100);
    });

    // Corregir en silencio y no rechazar: para un cliente honesto es una
    // operacion nula, y para uno con coordenadas raras lo correcto es imprimir
    // dentro del rectangulo, no perder la venta.
    it("mete de vuelta al area una imagen posicionada afuera", async () => {
      const [design] = await service.validateItemDesigns(
        [{ side: "front", image: image({ x: 0, y: 100 }), texts: [] }],
        "hoodies",
      );

      expect(design.layer.image!.x).toBeGreaterThan(0);
      expect(design.layer.image!.y).toBeLessThan(100);
    });

    it("copia la transparencia del asset", async () => {
      designs.findAssetById.mockResolvedValue(asset({ hasAlpha: false }));

      const [design] = await service.validateItemDesigns(
        [{ side: "front", image: image(), texts: [] }],
        "hoodies",
      );

      expect(design.layer.image?.hasAlpha).toBe(false);
    });
  });

  describe("textos", () => {
    it("rechaza una tipografia que no se puede estampar", async () => {
      await expect(
        service.validateItemDesigns(
          [{ side: "front", texts: [text({ fontFamily: "Comic Sans MS" })] }],
          "hoodies",
        ),
      ).rejects.toThrow(/tipografia/i);
    });

    // Bebas Neue no tiene archivos de negrita ni italica. Dejar las banderas
    // encendidas garantizaria que lo impreso no coincida con lo aprobado: el
    // navegador las falsifica y el rasterizador del servidor no.
    it("apaga negrita e italica en una familia que no las tiene", async () => {
      const [design] = await service.validateItemDesigns(
        [
          {
            side: "front",
            texts: [text({ fontFamily: "Bebas Neue", bold: true, italic: true })],
          },
        ],
        "hoodies",
      );

      expect(design.layer.texts[0]).toMatchObject({ bold: false, italic: false });
    });

    it("conserva negrita e italica en una familia que si las tiene", async () => {
      const [design] = await service.validateItemDesigns(
        [{ side: "front", texts: [text({ bold: true, italic: true })] }],
        "hoodies",
      );

      expect(design.layer.texts[0]).toMatchObject({ bold: true, italic: true });
    });

    // El editor lo envuelve en un <div>; el render lo pondra en un <text> de
    // SVG, que no envuelve. Aceptar saltos seria tener dos maquetados.
    it("elimina saltos de linea y tabulaciones", async () => {
      const [design] = await service.validateItemDesigns(
        [{ side: "front", texts: [text({ content: "linea uno\nlinea\tdos" })] }],
        "hoodies",
      );

      expect(design.layer.texts[0].content).toBe("linea uno linea dos");
    });

    it("rechaza un texto que queda vacio al limpiarlo", async () => {
      await expect(
        service.validateItemDesigns(
          [{ side: "front", texts: [text({ content: "   " })] }],
          "hoodies",
        ),
      ).rejects.toThrow(/vacio/i);
    });

    it("normaliza el color a minusculas", async () => {
      const [design] = await service.validateItemDesigns(
        [{ side: "front", texts: [text({ color: "#AABBCC" })] }],
        "hoodies",
      );

      expect(design.layer.texts[0].color).toBe("#aabbcc");
    });

    it("acota la posicion al rango del area", async () => {
      const [design] = await service.validateItemDesigns(
        [{ side: "front", texts: [text({ x: 250, y: -80 })] }],
        "hoodies",
      );

      expect(design.layer.texts[0]).toMatchObject({ x: 100, y: 0 });
    });
  });

  describe("estructura", () => {
    // La tabla tiene @@unique([orderItemId, side]); sin esto saldria como
    // violacion de constraint a mitad de la transaccion.
    it("rechaza dos disenos para el mismo lado", async () => {
      await expect(
        service.validateItemDesigns(
          [
            { side: "front", texts: [text()] },
            { side: "front", texts: [text()] },
          ],
          "hoodies",
        ),
      ).rejects.toThrow(/un diseno/i);
    });

    it("acepta frente y espalda a la vez, cada uno con su area", async () => {
      const result = await service.validateItemDesigns(
        [
          { side: "front", texts: [text()] },
          { side: "back", texts: [text()] },
        ],
        "hoodies",
      );

      expect(result.map((d) => [d.side, d.printAreaWidthMm, d.printAreaHeightMm])).toEqual([
        ["front", 260, 260],
        ["back", 280, 400],
      ]);
    });

    it("usa el area de camisetas para camisetas", async () => {
      const [design] = await service.validateItemDesigns(
        [{ side: "front", texts: [text()] }],
        "camisetas",
      );

      expect([design.printAreaWidthMm, design.printAreaHeightMm]).toEqual([280, 350]);
    });

    // Un lado sin nada no es un diseno: generaria una orden de impresion vacia
    // que alguien tendria que revisar a mano.
    it("descarta un lado sin imagen ni textos", async () => {
      const result = await service.validateItemDesigns(
        [
          { side: "front", texts: [] },
          { side: "back", texts: [text()] },
        ],
        "hoodies",
      );

      expect(result.map((d) => d.side)).toEqual(["back"]);
    });

    it("un item sin disenos no produce nada", async () => {
      expect(await service.validateItemDesigns([], "hoodies")).toEqual([]);
      expect(designs.findAssetById).not.toHaveBeenCalled();
    });

    it("expone el assetId para poder enlazar la fila", async () => {
      const [design] = await service.validateItemDesigns(
        [{ side: "front", image: image(), texts: [] }],
        "hoodies",
      );

      expect(design.imageAssetId).toBe(ASSET_ID);
    });
  });
});
