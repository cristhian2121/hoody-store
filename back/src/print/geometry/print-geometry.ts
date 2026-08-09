/**
 * Geometria de impresion del lado del servidor.
 *
 * Es la contraparte de front/src/lib/utils/print-geometry.ts. Los dos proyectos
 * tienen lockfiles separados y no hay workspace de pnpm, asi que la matematica
 * esta duplicada a proposito; lo que evita que se separen es el fixture dorado,
 * verificado por Vitest de un lado y por Jest del otro. Una desviacion aparece
 * como test rojo y no como una prenda mal impresa.
 *
 * El servidor la necesita para dos cosas: revalidar que el diseno que llega en
 * el checkout cae dentro del area (el navegador es falsificable) y, en la fase
 * siguiente, componer el archivo final.
 */

export const MM_PER_INCH = 25.4;

/** Ancho de la imagen, como % del ancho del area, con scale = 1. */
export const IMAGE_BASE_WIDTH_PCT = 60;

/** Divisor que le da significado fisico a `fontSize`. */
export const TEXT_REFERENCE_UNITS = 400;

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export const mmToPx = (mm: number, dpi: number): number => Math.round((mm / MM_PER_INCH) * dpi);

export const pxToMm = (px: number, dpi: number): number => (px / dpi) * MM_PER_INCH;

export const imageDrawSizeMm = (
  areaWidthMm: number,
  scale: number,
  naturalWidth: number,
  naturalHeight: number,
): Size => {
  const width = areaWidthMm * (IMAGE_BASE_WIDTH_PCT / 100) * scale;
  const ratio = naturalWidth > 0 ? naturalHeight / naturalWidth : 1;
  return { width, height: width * ratio };
};

export const textFontSizeMm = (areaWidthMm: number, fontSize: number, scale: number): number =>
  (fontSize / TEXT_REFERENCE_UNITS) * areaWidthMm * scale;

export const rotatedAabb = (width: number, height: number, rotationDeg: number): Size => {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  };
};

export const clampElementToPrintArea = (
  position: Point,
  elementSizeMm: Size,
  areaWidthMm: number,
  areaHeightMm: number,
  rotationDeg = 0,
): Point => {
  const aabb = rotatedAabb(elementSizeMm.width, elementSizeMm.height, rotationDeg);

  const halfWidthPct = (aabb.width / areaWidthMm) * 50;
  const halfHeightPct = (aabb.height / areaHeightMm) * 50;

  const clampAxis = (value: number, halfPct: number) => {
    if (halfPct >= 50) return 50;
    return Math.max(halfPct, Math.min(100 - halfPct, value));
  };

  return {
    x: clampAxis(position.x, halfWidthPct),
    y: clampAxis(position.y, halfHeightPct),
  };
};

export const effectiveDpi = (naturalWidthPx: number, drawWidthMm: number): number => {
  if (drawWidthMm <= 0) return 0;
  return naturalWidthPx / (drawWidthMm / MM_PER_INCH);
};

export type DpiVerdict = "ok" | "warn" | "poor" | "block";

export const dpiVerdict = (dpi: number): DpiVerdict => {
  if (dpi >= 200) return "ok";
  if (dpi >= 150) return "warn";
  if (dpi >= 100) return "poor";
  return "block";
};

/** Posicion del centro del elemento en pixeles dentro del lienzo de impresion. */
export const centerPx = (
  position: Point,
  areaWidthMm: number,
  areaHeightMm: number,
  dpi: number,
): Point => ({
  x: (mmToPx(areaWidthMm, dpi) * position.x) / 100,
  y: (mmToPx(areaHeightMm, dpi) * position.y) / 100,
});
