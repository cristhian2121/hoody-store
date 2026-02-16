export type Language = "es" | "en";
export type Gender = "hombre" | "mujer";
export type ProductCategory = "hoodies" | "camisetas";
export type PrintSide = "front" | "back";

export interface PrintArea {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface ProductColor {
  name: { es: string; en: string };
  hex: string;
  id: string;
}

export interface Product {
  id: string;
  slug: string;
  category: ProductCategory;
  name: { es: string; en: string };
  description: { es: string; en: string };
  price: number;
  images: string[];
  colors: ProductColor[];
  sizes: Record<Gender, string[]>;
}

export interface TextElement {
  id: string;
  content: string;
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  scale: number;
  rotation: number;
}

export interface ImageElement {
  src: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface DesignLayer {
  image: ImageElement | null;
  texts: TextElement[];
}

export interface PersonalizationData {
  front: DesignLayer;
  back: DesignLayer;
}

export interface CartItem {
  cartItemId: string;
  productId: string;
  name: { es: string; en: string };
  price: number;
  quantity: number;
  gender: Gender;
  size: string;
  color: ProductColor;
  personalization?: PersonalizationData;
  image: string;
  category: ProductCategory;
}

export const emptyDesignLayer = (): DesignLayer => ({
  image: null,
  texts: [],
});

export const emptyPersonalization = (): PersonalizationData => ({
  front: emptyDesignLayer(),
  back: emptyDesignLayer(),
});
