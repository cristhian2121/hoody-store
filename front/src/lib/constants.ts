import type { ProductCategory, PrintSide } from "./types";

export type HorizontalPosition = "left" | "center" | "right";
export type VerticalPosition = "top" | "middle" | "bottom";

export const POSITION_MAP: Record<
  "horizontal" | "vertical",
  Record<string, number>
> = {
  horizontal: { left: 25, center: 50, right: 75 },
  vertical: { top: 30, middle: 50, bottom: 70 },
};

export const HORIZONTAL_POSITIONS: HorizontalPosition[] = [
  "left",
  "center",
  "right",
];

export const VERTICAL_POSITIONS: VerticalPosition[] = ["top", "middle", "bottom"];

/** Resolucion del archivo listo para imprimir. Configurable para poder bajar a 200 dpi. */
export const PRINT_DPI = 300;

/** Debajo de este dpi efectivo no se permite agregar al carrito. */
export const MIN_PRINT_DPI = 100;

export interface PrintArea {
  /** Tamano fisico real del estampado. Es lo autoritativo para el archivo. */
  widthMm: number;
  heightMm: number;
  /**
   * Ubicacion aproximada de la caja sobre la foto de la prenda. Solo cosmetico:
   * la altura sale de aspect-ratio (widthMm/heightMm), asi que la caja nunca
   * puede contradecir al rectangulo en milimetros.
   */
  preview: { topPct: number; leftPct: number; widthPct: number };
}

/**
 * Un area por categoria y lado, INDEPENDIENTE de la talla: un archivo que sirva
 * de XS a XXL es todo el punto de automatizar la impresion. Medidas tipicas de
 * DTF; el frente del hoodie va topado por el bolsillo canguro.
 */
export const PRINT_AREAS: Record<ProductCategory, Record<PrintSide, PrintArea>> = {
  hoodies: {
    front: {
      widthMm: 260,
      heightMm: 260,
      preview: { topPct: 30, leftPct: 32, widthPct: 36 },
    },
    back: {
      widthMm: 280,
      heightMm: 400,
      preview: { topPct: 22, leftPct: 31, widthPct: 38 },
    },
  },
  camisetas: {
    front: {
      widthMm: 280,
      heightMm: 350,
      preview: { topPct: 25, leftPct: 30, widthPct: 40 },
    },
    back: {
      widthMm: 280,
      heightMm: 400,
      preview: { topPct: 22, leftPct: 30, widthPct: 40 },
    },
  },
};

export interface FontOption {
  /** Debe coincidir exactamente con el font-family de fonts.css y del registro del backend. */
  family: string;
  label: string;
  /** Falso cuando no existe archivo real de ese estilo. Nunca sintetizar. */
  hasBold: boolean;
  hasItalic: boolean;
}

/**
 * Fuentes disponibles para estampar.
 *
 * Todas SIL Open Font License y auto-hospedadas. Las anteriores (Arial,
 * Georgia, Courier New, Impact, Comic Sans MS) son licenciadas de
 * Microsoft/Monotype: no se pueden empaquetar en la imagen de Docker, asi que
 * el servidor nunca habria podido renderizar el estampado con ellas.
 *
 * Bebas Neue solo existe en un peso y sin italica; por eso hay banderas por
 * familia y los botones de negrita/italica se deshabilitan en ese caso, en vez
 * de dejar que el navegador la falsifique.
 */
export const FONT_OPTIONS: FontOption[] = [
  { family: "Plus Jakarta Sans", label: "Plus Jakarta Sans", hasBold: true, hasItalic: true },
  { family: "Bebas Neue", label: "Bebas Neue", hasBold: false, hasItalic: false },
  { family: "Playfair Display", label: "Playfair Display", hasBold: true, hasItalic: true },
  { family: "Comic Neue", label: "Comic Neue", hasBold: true, hasItalic: true },
];

export const FONTS = FONT_OPTIONS.map((font) => font.family);

export const getFontOption = (family: string): FontOption | undefined =>
  FONT_OPTIONS.find((font) => font.family === family);

/**
 * El texto se estampa en una sola linea.
 *
 * En el editor vive en un <div>, que el navegador envolveria; en el render del
 * servidor va en un <text> de SVG, que no envuelve. Permitir saltos de linea
 * significaria dos maquetados distintos, asi que por ahora se limita el largo y
 * se eliminan los saltos.
 */
export const MAX_TEXT_LENGTH = 40;

/**
 * 25 MB, igual que el tope del servidor.
 *
 * Los 5 MB anteriores no daban: un original util para estampar 280 mm a 300 dpi
 * ronda los 3300 px de ancho, y un PNG con transparencia de ese tamano pesa
 * entre 8 y 20 MB. Se valida aca ademas del servidor solo para dar un mensaje
 * en espanol antes de gastar la subida.
 */
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * SVG salio de la lista: no tiene tamano en pixeles validable, resuelve fuentes
 * por su cuenta (lo que romperia la equivalencia entre preview e impresion) y es
 * un vector conocido de XSS. El servidor tambien lo rechaza.
 */
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const IMAGE_FILE_ACCEPT = ".png,.jpg,.jpeg,.webp";

export const POSITION_TOLERANCE = 6;

export const BLUR_DELAY_MS = 150;

export const DEFAULT_TEXT_CONTENT = "Tu texto";

export const DEFAULT_TEXT_POSITION = { x: 50, y: 60 };

export const DEFAULT_IMAGE_POSITION = { x: 50, y: 50 };

export const DEFAULT_SCALE = 1;

export const DEFAULT_ROTATION = 0;

export const DEFAULT_FONT_SIZE = 24;

export const DEFAULT_TEXT_COLOR = "#ffffff";
