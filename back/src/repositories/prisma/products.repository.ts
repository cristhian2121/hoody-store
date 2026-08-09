import { Injectable } from "@nestjs/common";
import { ProductCategory } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { toPublicUrl } from "../../products/product-url.util";
import {
  ProductsRepository,
  ProductSummaryDto,
  ProductDetailDto,
  ProductColorDto,
  PricedVariant,
  SizeGuide,
} from "../interfaces/products.repository.interface";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

const bySizeOrder = (a: string, b: string) => {
  const ia = SIZE_ORDER.indexOf(a);
  const ib = SIZE_ORDER.indexOf(b);
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
};

@Injectable()
export class ProductsRepositoryPrisma implements ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts(category?: ProductCategory): Promise<ProductSummaryDto[]> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
      orderBy: [{ sortOrder: "asc" }, { nameEs: "asc" }],
      include: {
        images: { orderBy: { position: "asc" } },
        colorOptions: { orderBy: { position: "asc" }, include: { color: true } },
        variants: {
          where: { isActive: true },
          include: { color: true },
        },
      },
    });

    return products.map((product) => this.mapSummary(product));
  }

  async getProductBySlug(slug: string): Promise<ProductDetailDto | null> {
    const product = await this.prisma.product.findFirst({
      where: { slug, isActive: true },
      include: {
        images: { orderBy: { position: "asc" } },
        colorOptions: { orderBy: { position: "asc" }, include: { color: true } },
        variants: {
          where: { isActive: true },
          include: { color: true },
          orderBy: [{ gender: "asc" }, { size: "asc" }],
        },
      },
    });

    if (!product) return null;

    const sizeGuideRows = await this.prisma.sizeGuideEntry.findMany({
      where: { category: product.category },
    });

    const sizeGuide: SizeGuide = {};
    for (const row of sizeGuideRows) {
      sizeGuide[row.gender] ??= {};
      sizeGuide[row.gender][row.size] = {
        chest: row.chestCm,
        length: row.lengthCm,
        shoulder: row.shoulderCm,
      };
    }

    // Las tallas se derivan de las variantes activas, no de una lista estatica:
    // si no hay variante comprable, la talla no se ofrece.
    const sizes: Record<string, string[]> = {};
    for (const variant of product.variants) {
      sizes[variant.gender] ??= [];
      if (!sizes[variant.gender].includes(variant.size)) {
        sizes[variant.gender].push(variant.size);
      }
    }
    for (const gender of Object.keys(sizes)) {
      sizes[gender].sort(bySizeOrder);
    }

    return {
      ...this.mapSummary(product),
      sizes,
      sizeGuide,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        colorId: variant.colorId,
        gender: variant.gender,
        size: variant.size,
        price: variant.priceCop,
        available: variant.isActive,
      })),
    };
  }

  async findActiveVariantsByIds(ids: string[]): Promise<PricedVariant[]> {
    if (ids.length === 0) return [];

    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: ids }, isActive: true, product: { isActive: true } },
      include: {
        color: true,
        product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } },
      },
    });

    return variants.map((variant) => ({
      variantId: variant.id,
      sku: variant.sku,
      productSlug: variant.product.slug,
      productNameEs: variant.product.nameEs,
      productNameEn: variant.product.nameEn,
      category: variant.product.category,
      gender: variant.gender,
      size: variant.size,
      colorId: variant.colorId,
      colorNameEs: variant.color.nameEs,
      colorNameEn: variant.color.nameEn,
      colorHex: variant.color.hex,
      imageStorageKey: variant.product.images[0]?.storageKey ?? null,
      unitPriceCop: variant.priceCop,
    }));
  }

  private mapSummary(product: {
    id: string;
    slug: string;
    category: ProductCategory;
    nameEs: string;
    nameEn: string;
    descriptionEs: string;
    descriptionEn: string;
    basePriceCop: number;
    images: { storageKey: string }[];
    colorOptions: {
      colorId: string;
      color: { id: string; nameEs: string; nameEn: string; hex: string };
    }[];
    variants: {
      priceCop: number;
      colorId: string;
      color: { id: string; nameEs: string; nameEn: string; hex: string };
    }[];
  }): ProductSummaryDto {
    // El ORDEN viene de colorOptions (dato de merchandising, el primero es el
    // color por defecto). La lista efectiva se filtra contra las variantes
    // activas, asi que sigue siendo imposible anunciar un color sin variante
    // comprable.
    const buyableColorIds = new Set(product.variants.map((variant) => variant.colorId));
    const colors: ProductColorDto[] = product.colorOptions
      .filter((option) => buyableColorIds.has(option.colorId))
      .map((option) => ({
        id: option.color.id,
        name: { es: option.color.nameEs, en: option.color.nameEn },
        hex: option.color.hex,
      }));

    const prices = product.variants.map((v) => v.priceCop);
    const priceFrom = prices.length > 0 ? Math.min(...prices) : product.basePriceCop;

    return {
      id: product.id,
      slug: product.slug,
      category: product.category,
      name: { es: product.nameEs, en: product.nameEn },
      description: { es: product.descriptionEs, en: product.descriptionEn },
      priceFrom,
      images: product.images.map((image) => toPublicUrl(image.storageKey)),
      colors,
    };
  }
}
