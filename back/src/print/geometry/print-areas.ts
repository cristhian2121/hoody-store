import { ProductCategory } from "@prisma/client";

/**
 * Areas fisicas de estampado, en milimetros reales.
 *
 * Copia autoritativa del lado del servidor de PRINT_AREAS en
 * front/src/lib/constants.ts. El fixture dorado verifica que ambas coincidan.
 *
 * Una por categoria y lado, INDEPENDIENTE de la talla: que un mismo archivo
 * sirva de XS a XXL es todo el punto de automatizar la impresion.
 */

export type PrintSideKey = "front" | "back";

export interface PrintAreaMm {
  widthMm: number;
  heightMm: number;
}

export const PRINT_DPI = 300;

/** Piso de calidad: por debajo no se acepta la compra. */
export const MIN_PRINT_DPI = 100;

export const PRINT_AREAS: Record<ProductCategory, Record<PrintSideKey, PrintAreaMm>> = {
  hoodies: {
    front: { widthMm: 260, heightMm: 260 },
    back: { widthMm: 280, heightMm: 400 },
  },
  camisetas: {
    front: { widthMm: 280, heightMm: 350 },
    back: { widthMm: 280, heightMm: 400 },
  },
};

export const getPrintArea = (category: ProductCategory, side: PrintSideKey): PrintAreaMm =>
  PRINT_AREAS[category][side];
