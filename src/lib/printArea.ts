import type { PrintSide, ProductCategory } from "@/lib/types";
import type { PrintArea } from "@/lib/types";

/**
 * Normalized print areas (0–100) relative to the personalization canvas.
 * These are conservative defaults and can be tuned per garment model.
 */
const PRINT_AREAS: Record<ProductCategory, Record<PrintSide, PrintArea>> = {
  hoodies: {
    // Front: above pocket, below neck, centered chest
    front: { xMin: 25, xMax: 75, yMin: 18, yMax: 58 },
    // Back: larger printable zone
    back: { xMin: 22, xMax: 78, yMin: 18, yMax: 72 },
  },
  camisetas: {
    front: { xMin: 25, xMax: 75, yMin: 20, yMax: 62 },
    back: { xMin: 22, xMax: 78, yMin: 18, yMax: 74 },
  },
};

export function getPrintArea(
  category: ProductCategory,
  side: PrintSide,
): PrintArea {
  return PRINT_AREAS[category][side];
}

export function getPrintAreaCenter(area: PrintArea): { x: number; y: number } {
  return {
    x: (area.xMin + area.xMax) / 2,
    y: (area.yMin + area.yMax) / 2,
  };
}

export function clampCenterToPrintArea(
  center: { x: number; y: number },
  area: PrintArea,
  sizePct?: { width: number; height: number },
): { x: number; y: number } {
  const halfW = Math.max(0, (sizePct?.width ?? 0) / 2);
  const halfH = Math.max(0, (sizePct?.height ?? 0) / 2);

  const xMin = Math.min(area.xMin + halfW, area.xMax);
  const xMax = Math.max(area.xMax - halfW, area.xMin);
  const yMin = Math.min(area.yMin + halfH, area.yMax);
  const yMax = Math.max(area.yMax - halfH, area.yMin);

  const x = Math.max(xMin, Math.min(xMax, center.x));
  const y = Math.max(yMin, Math.min(yMax, center.y));

  return { x, y };
}

