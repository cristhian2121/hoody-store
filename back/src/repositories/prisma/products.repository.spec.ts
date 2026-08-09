import { ProductsRepositoryPrisma } from "./products.repository";
import { PrismaService } from "../../prisma/prisma.service";

const color = (id: string, nameEs: string, hex: string) => ({
  id,
  nameEs,
  nameEn: nameEs,
  hex,
});

const buildProduct = (overrides: Record<string, unknown> = {}) => ({
  id: "p1",
  slug: "hoodie-clasico",
  category: "hoodies",
  nameEs: "Hoodie Clásico",
  nameEn: "Classic Hoodie",
  descriptionEs: "desc es",
  descriptionEn: "desc en",
  basePriceCop: 89900,
  images: [{ storageKey: "products/hoodie-black.jpg" }],
  colorOptions: [
    { colorId: "negro", color: color("negro", "Negro", "#1a1a1a") },
    { colorId: "gris", color: color("gris", "Gris", "#9ca3af") },
    { colorId: "blanco", color: color("blanco", "Blanco", "#f5f5f5") },
  ],
  variants: [
    { priceCop: 89900, colorId: "negro", color: color("negro", "Negro", "#1a1a1a") },
    { priceCop: 89900, colorId: "gris", color: color("gris", "Gris", "#9ca3af") },
    { priceCop: 89900, colorId: "blanco", color: color("blanco", "Blanco", "#f5f5f5") },
  ],
  ...overrides,
});

const buildPrisma = (products: unknown[]) =>
  ({
    product: {
      findMany: jest.fn().mockResolvedValue(products),
      findFirst: jest.fn().mockResolvedValue(products[0] ?? null),
    },
    sizeGuideEntry: { findMany: jest.fn().mockResolvedValue([]) },
    productVariant: { findMany: jest.fn().mockResolvedValue([]) },
  }) as unknown as PrismaService;

describe("ProductsRepositoryPrisma", () => {
  beforeEach(() => {
    process.env.BACKEND_URL = "https://api.atuestampa.com";
    delete process.env.PUBLIC_ASSETS_BASE_URL;
  });

  describe("orden de colores", () => {
    // El primer color es el que queda seleccionado por defecto en la ficha, y
    // el orden es una decision de merchandising por producto.
    it("respeta el orden declarado en colorOptions, no el de las variantes", async () => {
      const repo = new ProductsRepositoryPrisma(
        buildPrisma([
          buildProduct({
            // las variantes llegan en otro orden a proposito
            variants: [
              { priceCop: 89900, colorId: "blanco", color: color("blanco", "Blanco", "#f5f5f5") },
              { priceCop: 89900, colorId: "negro", color: color("negro", "Negro", "#1a1a1a") },
              { priceCop: 89900, colorId: "gris", color: color("gris", "Gris", "#9ca3af") },
            ],
          }),
        ]),
      );

      const [product] = await repo.listProducts();
      expect(product.colors.map((c) => c.id)).toEqual(["negro", "gris", "blanco"]);
    });

    // Invariante: nunca anunciar un color que no se puede comprar.
    it("omite un color sin variante activa aunque este en colorOptions", async () => {
      const repo = new ProductsRepositoryPrisma(
        buildPrisma([
          buildProduct({
            variants: [
              { priceCop: 89900, colorId: "negro", color: color("negro", "Negro", "#1a1a1a") },
              { priceCop: 89900, colorId: "blanco", color: color("blanco", "Blanco", "#f5f5f5") },
            ],
          }),
        ]),
      );

      const [product] = await repo.listProducts();
      expect(product.colors.map((c) => c.id)).toEqual(["negro", "blanco"]);
    });
  });

  describe("priceFrom", () => {
    it("toma el precio minimo entre las variantes activas", async () => {
      const repo = new ProductsRepositoryPrisma(
        buildPrisma([
          buildProduct({
            variants: [
              { priceCop: 129900, colorId: "negro", color: color("negro", "Negro", "#1a1a1a") },
              { priceCop: 99900, colorId: "gris", color: color("gris", "Gris", "#9ca3af") },
            ],
          }),
        ]),
      );

      const [product] = await repo.listProducts();
      expect(product.priceFrom).toBe(99900);
    });

    it("cae a basePriceCop si no hay variantes activas", async () => {
      const repo = new ProductsRepositoryPrisma(
        buildPrisma([buildProduct({ variants: [], colorOptions: [] })]),
      );

      const [product] = await repo.listProducts();
      expect(product.priceFrom).toBe(89900);
      expect(product.colors).toEqual([]);
    });
  });

  it("devuelve las imagenes como URL absoluta", async () => {
    const repo = new ProductsRepositoryPrisma(buildPrisma([buildProduct()]));
    const [product] = await repo.listProducts();
    expect(product.images).toEqual(["https://api.atuestampa.com/static/products/hoodie-black.jpg"]);
  });

  it("reensambla el bilingue en la forma { es, en } que espera el frontend", async () => {
    const repo = new ProductsRepositoryPrisma(buildPrisma([buildProduct()]));
    const [product] = await repo.listProducts();
    expect(product.name).toEqual({ es: "Hoodie Clásico", en: "Classic Hoodie" });
    expect(product.description).toEqual({ es: "desc es", en: "desc en" });
  });

  describe("findActiveVariantsByIds", () => {
    it("no consulta la base con una lista vacia", async () => {
      const prisma = buildPrisma([]);
      const repo = new ProductsRepositoryPrisma(prisma);

      await expect(repo.findActiveVariantsByIds([])).resolves.toEqual([]);
      expect(prisma.productVariant.findMany).not.toHaveBeenCalled();
    });
  });
});
