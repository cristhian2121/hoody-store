import { useMemo } from "react";
import type { DesignLayer, PersonalizationData, PrintSide, ProductCategory } from "@/lib/types";
import { PRINT_AREAS } from "@/lib/constants";
import {
  dpiVerdict,
  effectiveDpi,
  imageDrawSizeMm,
  type DpiVerdict,
} from "@/lib/utils/print-geometry";

export interface DesignImageQuality {
  /** Resolucion a la que realmente se va a imprimir, al tamano elegido. */
  dpi: number;
  verdict: DpiVerdict;
  drawWidthMm: number;
  drawHeightMm: number;
  /** Falso cuando el estampado saldra con fondo rectangular. */
  hasAlpha: boolean;
}

export interface DesignValidation {
  front: DesignImageQuality | null;
  back: DesignImageQuality | null;
  /**
   * Cierto cuando algun lado esta por debajo del piso de calidad. Es lo unico
   * que bloquea la compra: por encima del piso se avisa pero se deja comprar,
   * porque hay disenos deliberadamente pixelados y no nos toca decidir por el
   * cliente.
   */
  blocked: boolean;
}

export const evaluateLayer = (
  layer: DesignLayer,
  category: ProductCategory,
  side: PrintSide,
): DesignImageQuality | null => {
  const image = layer.image;
  if (!image) return null;

  const area = PRINT_AREAS[category][side];
  const size = imageDrawSizeMm(area.widthMm, image.scale, image.naturalWidth, image.naturalHeight);
  const dpi = effectiveDpi(image.naturalWidth, size.width);

  return {
    dpi,
    verdict: dpiVerdict(dpi),
    drawWidthMm: size.width,
    drawHeightMm: size.height,
    hasAlpha: image.hasAlpha,
  };
};

/**
 * Evalua si las imagenes del diseno alcanzan para imprimirse al tamano elegido.
 *
 * En pantalla toda imagen se ve bien: el navegador la escala a unos pocos
 * cientos de pixeles. El problema aparece en la prenda, donde esa misma imagen
 * ocupa 15 cm reales. Un logo de 300 px estirado a 168 mm se imprime a 45 dpi y
 * sale borroso, y el cliente no tiene forma de saberlo sin este aviso.
 */
export const useDesignValidation = (
  data: PersonalizationData | undefined,
  category: ProductCategory | undefined,
): DesignValidation =>
  useMemo(() => {
    if (!data || !category) return { front: null, back: null, blocked: false };

    const front = evaluateLayer(data.front, category, "front");
    const back = evaluateLayer(data.back, category, "back");

    return {
      front,
      back,
      blocked: [front, back].some((quality) => quality?.verdict === "block"),
    };
  }, [data, category]);
