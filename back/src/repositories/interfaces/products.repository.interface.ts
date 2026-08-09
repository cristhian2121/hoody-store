import { Gender, ProductCategory } from "@prisma/client";

export interface LocalizedText {
  es: string;
  en: string;
}

export interface ProductColorDto {
  id: string;
  name: LocalizedText;
  hex: string;
}

export interface ProductVariantDto {
  id: string;
  sku: string;
  colorId: string;
  gender: Gender;
  size: string;
  price: number;
  available: boolean;
}

export interface ProductSummaryDto {
  id: string;
  slug: string;
  category: ProductCategory;
  name: LocalizedText;
  description: LocalizedText;
  /** Precio minimo entre las variantes activas. Para el "desde $X" de la tarjeta. */
  priceFrom: number;
  images: string[];
  colors: ProductColorDto[];
}

export interface SizeGuideMeasurement {
  chest: number;
  length: number;
  shoulder: number;
}

export type SizeGuide = Record<string, Record<string, SizeGuideMeasurement>>;

export interface ProductDetailDto extends ProductSummaryDto {
  sizes: Record<string, string[]>;
  variants: ProductVariantDto[];
  sizeGuide: SizeGuide;
}

/**
 * Variante resuelta contra la base de datos, con todo lo que una linea de orden
 * necesita congelar al momento de la compra.
 */
export interface PricedVariant {
  variantId: string;
  sku: string;
  productSlug: string;
  productNameEs: string;
  productNameEn: string;
  category: ProductCategory;
  gender: Gender;
  size: string;
  colorId: string;
  colorNameEs: string;
  colorNameEn: string;
  colorHex: string;
  imageStorageKey: string | null;
  unitPriceCop: number;
}

export interface ProductsRepository {
  listProducts(category?: ProductCategory): Promise<ProductSummaryDto[]>;
  getProductBySlug(slug: string): Promise<ProductDetailDto | null>;
  /** Devuelve solo las variantes activas encontradas. Las faltantes se omiten. */
  findActiveVariantsByIds(ids: string[]): Promise<PricedVariant[]>;
}

export const PRODUCTS_REPOSITORY = "ProductsRepository";
