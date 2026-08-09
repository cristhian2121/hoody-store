export type Language = "es" | "en";
export type Gender = "hombre" | "mujer";
export type ProductCategory = "hoodies" | "camisetas";
export type PrintSide = "front" | "back";

export interface ProductColor {
  name: { es: string; en: string };
  hex: string;
  id: string;
}

/** Lo que devuelve GET /api/products. Alcanza para las tarjetas del catalogo. */
export interface ProductSummary {
  id: string;
  slug: string;
  category: ProductCategory;
  name: { es: string; en: string };
  description: { es: string; en: string };
  /** Precio minimo entre las variantes disponibles. */
  priceFrom: number;
  images: string[];
  colors: ProductColor[];
}

export interface SizeMeasurement {
  chest: number;
  length: number;
  shoulder: number;
}

/**
 * Combinacion comprable concreta.
 *
 * Es lo unico que el checkout manda al servidor: de `id` se derivan el precio,
 * el nombre, la talla, el color y la foto. El cliente ya no puede proponer
 * ninguno de esos datos.
 */
export interface ProductVariant {
  id: string;
  sku: string;
  colorId: string;
  gender: Gender;
  size: string;
  price: number;
  available: boolean;
}

/** Lo que devuelve GET /api/products/:slug. */
export interface Product extends ProductSummary {
  sizes: Record<Gender, string[]>;
  variants: ProductVariant[];
  sizeGuide: Record<string, Record<string, SizeMeasurement>>;
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

/**
 * Imagen del diseno, por referencia.
 *
 * Antes esto guardaba la imagen entera como data URL base64. El editor la
 * degradaba a JPEG de 800 px (perdiendo la transparencia, que es lo unico que
 * hace que un estampado se vea recortado y no como una calcomania rectangular),
 * y ese base64 viajaba al carrito, a localStorage y al checkout. Tres items
 * personalizados bastaban para reventar la cuota de ~5 MB del navegador.
 *
 * Ahora el original vive en el servidor y aca quedan ~150 bytes: el id, la URL
 * del preview y el tamano real en pixeles, que es lo que permite calcular a que
 * DPI se va a imprimir.
 */
export interface ImageElement {
  assetId: string;
  previewUrl: string;
  /** Tamano del master en el servidor, no del preview. */
  naturalWidth: number;
  naturalHeight: number;
  /** Falso cuando la imagen se estampara con fondo rectangular. */
  hasAlpha: boolean;
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

/**
 * Linea del carrito.
 *
 * `variantId` es lo unico que viaja al servidor. Todo lo demas —nombre, precio,
 * foto, talla, color— existe solo para pintar el carrito, y el servidor lo
 * vuelve a derivar del catalogo al cobrar. Si el precio cambio mientras el
 * carrito estaba guardado, manda el del catalogo y el checkout avisa.
 */
export interface CartItem {
  cartItemId: string;
  variantId: string;
  productId: string;
  slug: string;
  name: { es: string; en: string };
  /** Solo para mostrar. El cobro usa el precio de la base de datos. */
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
