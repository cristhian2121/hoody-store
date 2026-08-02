import { BadRequestException } from "@nestjs/common";
import { PricingService } from "./pricing.service";
import {
  PricedVariant,
  ProductsRepository,
} from "../repositories/interfaces/products.repository.interface";

const variant = (overrides: Partial<PricedVariant> = {}): PricedVariant => ({
  variantId: "v-hoodie-negro-m",
  sku: "HOODIE-CLASICO-HOMBRE-NEGRO-M",
  productSlug: "hoodie-clasico",
  productNameEs: "Hoodie Clásico",
  productNameEn: "Classic Hoodie",
  category: "hoodies",
  gender: "hombre",
  size: "M",
  colorId: "negro",
  colorNameEs: "Negro",
  colorNameEn: "Black",
  colorHex: "#1a1a1a",
  imageStorageKey: "products/hoodie-black.jpg",
  unitPriceCop: 89900,
  ...overrides,
});

const buildRepo = (variants: PricedVariant[]) =>
  ({
    listProducts: jest.fn(),
    getProductBySlug: jest.fn(),
    findActiveVariantsByIds: jest.fn(async (ids: string[]) =>
      variants.filter((v) => ids.includes(v.variantId)),
    ),
  }) as unknown as jest.Mocked<ProductsRepository>;

describe("PricingService", () => {
  beforeEach(() => {
    process.env.BACKEND_URL = "https://api.atuestampa.com";
    delete process.env.PUBLIC_ASSETS_BASE_URL;
  });

  it("cotiza desde la base de datos, no desde el request", async () => {
    const service = new PricingService(buildRepo([variant()]));

    const result = await service.priceCart([{ variantId: "v-hoodie-negro-m", quantity: 2 }]);

    expect(result.subtotalCop).toBe(179800);
    expect(result.lines[0].unitPriceCop).toBe(89900);
    expect(result.lines[0].lineTotalCop).toBe(179800);
  });

  it("arma la descripcion en el servidor", async () => {
    const service = new PricingService(buildRepo([variant()]));
    const result = await service.priceCart([{ variantId: "v-hoodie-negro-m", quantity: 1 }]);
    expect(result.lines[0].description).toBe("M · Negro");
  });

  it("resuelve la imagen a URL absoluta", async () => {
    const service = new PricingService(buildRepo([variant()]));
    const result = await service.priceCart([{ variantId: "v-hoodie-negro-m", quantity: 1 }]);
    expect(result.lines[0].imageUrl).toBe(
      "https://api.atuestampa.com/static/products/hoodie-black.jpg",
    );
  });

  it("suma varias lineas distintas", async () => {
    const service = new PricingService(
      buildRepo([
        variant(),
        variant({ variantId: "v-camiseta-blanco-l", unitPriceCop: 49900, size: "L" }),
      ]),
    );

    const result = await service.priceCart([
      { variantId: "v-hoodie-negro-m", quantity: 1 },
      { variantId: "v-camiseta-blanco-l", quantity: 3 },
    ]);

    expect(result.subtotalCop).toBe(89900 + 149700);
    expect(result.lines).toHaveLength(2);
  });

  // Dos lineas pueden compartir prenda y diferir en personalizacion.
  // Fusionarlas destruiria un diseno en silencio.
  it("NO fusiona lineas con el mismo variantId", async () => {
    const service = new PricingService(buildRepo([variant()]));

    const result = await service.priceCart([
      { variantId: "v-hoodie-negro-m", quantity: 1 },
      { variantId: "v-hoodie-negro-m", quantity: 1 },
    ]);

    expect(result.lines).toHaveLength(2);
    expect(result.subtotalCop).toBe(179800);
  });

  it("rechaza una variante desconocida", async () => {
    const service = new PricingService(buildRepo([variant()]));
    await expect(service.priceCart([{ variantId: "no-existe", quantity: 1 }])).rejects.toThrow(
      BadRequestException,
    );
  });

  it("rechaza una variante inactiva (el repo no la devuelve)", async () => {
    const service = new PricingService(buildRepo([]));
    await expect(
      service.priceCart([{ variantId: "v-hoodie-negro-m", quantity: 1 }]),
    ).rejects.toThrow(/ya no estan disponibles/);
  });

  it("rechaza el carrito vacio", async () => {
    const service = new PricingService(buildRepo([]));
    await expect(service.priceCart([])).rejects.toThrow(BadRequestException);
  });

  it("rechaza cantidad cero o negativa", async () => {
    const service = new PricingService(buildRepo([variant()]));
    await expect(
      service.priceCart([{ variantId: "v-hoodie-negro-m", quantity: 0 }]),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.priceCart([{ variantId: "v-hoodie-negro-m", quantity: -3 }]),
    ).rejects.toThrow(BadRequestException);
  });

  it("rechaza cantidad no entera", async () => {
    const service = new PricingService(buildRepo([variant()]));
    await expect(
      service.priceCart([{ variantId: "v-hoodie-negro-m", quantity: 1.5 }]),
    ).rejects.toThrow(BadRequestException);
  });

  it("rechaza cantidades absurdas", async () => {
    const service = new PricingService(buildRepo([variant()]));
    await expect(
      service.priceCart([{ variantId: "v-hoodie-negro-m", quantity: 9999 }]),
    ).rejects.toThrow(/cantidad maxima/i);
  });

  it("consulta el repositorio una sola vez con ids deduplicados", async () => {
    const repo = buildRepo([variant()]);
    const service = new PricingService(repo);

    await service.priceCart([
      { variantId: "v-hoodie-negro-m", quantity: 1 },
      { variantId: "v-hoodie-negro-m", quantity: 2 },
    ]);

    expect(repo.findActiveVariantsByIds).toHaveBeenCalledTimes(1);
    expect(repo.findActiveVariantsByIds).toHaveBeenCalledWith(["v-hoodie-negro-m"]);
  });

  it("tolera una variante sin imagen", async () => {
    const service = new PricingService(buildRepo([variant({ imageStorageKey: null })]));
    const result = await service.priceCart([{ variantId: "v-hoodie-negro-m", quantity: 1 }]);
    expect(result.lines[0].imageUrl).toBeNull();
  });
});
