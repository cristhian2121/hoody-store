/**
 * Geometria de impresion: traduce el diseno del editor a milimetros reales.
 *
 * Antes `x`/`y` eran porcentajes del contenedor completo de la prenda y el area
 * de estampado era solo un rectangulo punteado decorativo, asi que un diseno
 * podia terminar sobre la manga o el dobladillo. Ahora `x`/`y` son porcentajes
 * DEL AREA DE ESTAMPADO, y el area tiene un tamano fisico declarado.
 *
 * Este modulo es puro a proposito: no toca el DOM ni React. El backend tiene una
 * copia de esta misma matematica y ambos se verifican contra el mismo fixture
 * dorado, para que una desviacion aparezca como test rojo y no como un hoodie
 * mal impreso.
 */

export const MM_PER_INCH = 25.4;

/** Ancho de la imagen, como % del ancho del area, con scale = 1. */
export const IMAGE_BASE_WIDTH_PCT = 60;

/**
 * Divisor que le da significado fisico a `fontSize`.
 * Con TEXT_REFERENCE_UNITS = 400, un fontSize 24 sobre un area de 280 mm mide
 * 16.8 mm de caja tipografica.
 */
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

/**
 * Tamano dibujado de la imagen, en mm.
 * El ancho depende del area y del scale; el alto conserva la relacion de aspecto
 * del original. Esto reemplaza el `w-28 sm:w-36` anterior, que hacia que el
 * tamano del diseno cambiara con el breakpoint del navegador.
 */
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

/** Tamano tipografico en mm a partir del fontSize del editor. */
export const textFontSizeMm = (areaWidthMm: number, fontSize: number, scale: number): number =>
  (fontSize / TEXT_REFERENCE_UNITS) * areaWidthMm * scale;

/**
 * Caja envolvente alineada a los ejes de un rectangulo rotado.
 * Se necesita para que el clamp considere el tamano real que ocupa un elemento
 * girado y no el de su rectangulo sin rotar.
 */
export const rotatedAabb = (width: number, height: number, rotationDeg: number): Size => {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  };
};

/**
 * Mantiene el centro del elemento dentro del area de estampado.
 *
 * Si el elemento es mas grande que el area colapsa a 50: es preferible dejarlo
 * centrado y que el aviso de tamano haga su trabajo, a moverlo a una esquina.
 */
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

/**
 * Resolucion efectiva a la que se imprimira la imagen.
 * Es la unica cifra que dice si un archivo subido alcanza para el tamano
 * elegido: una imagen chica estirada al maximo se ve pixelada en la prenda
 * aunque en pantalla se vea bien.
 */
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

/**
 * Ancho de la imagen en unidades `cqw` (1cqw = 1% del ancho del area).
 *
 * Es el mecanismo que hace determinista el preview: el tamano queda expresado
 * como fraccion del area de estampado, asi que no depende del ancho de la
 * ventana. Vive aqui, y no en el JSX, para que se pueda probar sin DOM: jsdom
 * descarta las unidades de container query y no permite leerlas del elemento.
 */
export const imageWidthCqw = (scale: number): number => IMAGE_BASE_WIDTH_PCT * scale;

/** Tamano tipografico en `cqw`, equivalente de pantalla de textFontSizeMm. */
export const textFontSizeCqw = (fontSize: number, scale: number): number =>
  (fontSize / TEXT_REFERENCE_UNITS) * 100 * scale;

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
