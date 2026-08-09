import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { PrintSide, ProductCategory } from "@prisma/client";
import type { DesignDto } from "../api/dto/checkout.dto";
import {
  DESIGNS_REPOSITORY,
  DesignsRepository,
} from "../repositories/interfaces/designs.repository.interface";
import { getFontCapabilities, isSupportedFontFamily } from "./fonts/font-registry";
import { MIN_PRINT_DPI, PRINT_DPI, getPrintArea } from "./geometry/print-areas";
import {
  clampElementToPrintArea,
  dpiVerdict,
  effectiveDpi,
  imageDrawSizeMm,
} from "./geometry/print-geometry";

/** Capa ya validada y normalizada, tal como se guarda en OrderItemDesign.layer. */
export interface NormalizedLayer {
  image: {
    assetId: string;
    x: number;
    y: number;
    scale: number;
    rotation: number;
    /** Copiado de DesignAsset, no del cliente. */
    naturalWidth: number;
    naturalHeight: number;
    hasAlpha: boolean;
    /** Tamano real que va a ocupar el estampado. */
    drawWidthMm: number;
    drawHeightMm: number;
    effectiveDpi: number;
  } | null;
  texts: Array<{
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
  }>;
}

export interface NormalizedDesign {
  side: PrintSide;
  category: ProductCategory;
  printAreaWidthMm: number;
  printAreaHeightMm: number;
  dpi: number;
  imageAssetId: string | null;
  layer: NormalizedLayer;
}

/**
 * Revalida en el servidor lo que el editor ya validaba en el navegador.
 *
 * No es desconfianza del frontend, es que el frontend no es una barrera: el
 * cuerpo del checkout se puede escribir a mano. Todo lo que decide como sale
 * impresa una prenda —el tamano fisico, la resolucion, la tipografia, que la
 * imagen exista— se comprueba aqui, ANTES de crear la preferencia de pago, para
 * que un diseno imposible falle antes de que alguien pague por el.
 */
@Injectable()
export class DesignValidationService {
  constructor(@Inject(DESIGNS_REPOSITORY) private readonly designs: DesignsRepository) {}

  async validateItemDesigns(
    designs: DesignDto[],
    category: ProductCategory,
  ): Promise<NormalizedDesign[]> {
    if (designs.length === 0) return [];

    this.assertOneDesignPerSide(designs);

    const normalized: NormalizedDesign[] = [];
    for (const design of designs) {
      const result = await this.normalizeDesign(design, category);
      // Un lado sin imagen ni textos no es un diseno: se descarta en vez de
      // generar una orden de impresion vacia que alguien tendria que revisar.
      if (result.layer.image === null && result.layer.texts.length === 0) continue;
      normalized.push(result);
    }

    return normalized;
  }

  private assertOneDesignPerSide(designs: DesignDto[]): void {
    const sides = designs.map((design) => design.side);
    if (new Set(sides).size !== sides.length) {
      // La tabla tiene @@unique([orderItemId, side]); sin esto el error saldria
      // como una violacion de constraint de Postgres a mitad de la transaccion.
      throw new BadRequestException("Cada lado de la prenda solo puede tener un diseno.");
    }
  }

  private async normalizeDesign(
    design: DesignDto,
    category: ProductCategory,
  ): Promise<NormalizedDesign> {
    const area = getPrintArea(category, design.side);

    return {
      side: design.side,
      category,
      printAreaWidthMm: area.widthMm,
      printAreaHeightMm: area.heightMm,
      dpi: PRINT_DPI,
      imageAssetId: design.image?.assetId ?? null,
      layer: {
        image: design.image
          ? await this.normalizeImage(design.image, area.widthMm, area.heightMm)
          : null,
        texts: design.texts.map((text) => this.normalizeText(text)),
      },
    };
  }

  private async normalizeImage(
    image: NonNullable<DesignDto["image"]>,
    areaWidthMm: number,
    areaHeightMm: number,
  ): Promise<NonNullable<NormalizedLayer["image"]>> {
    const asset = await this.designs.findAssetById(image.assetId);
    if (!asset) {
      throw new BadRequestException(
        "Una de las imagenes de tu diseno ya no esta disponible. Vuelve a subirla.",
      );
    }

    // Las dimensiones salen del asset, nunca del cuerpo del pedido: es lo unico
    // que hace que el piso de calidad no se pueda esquivar declarando un ancho
    // inventado.
    const size = imageDrawSizeMm(areaWidthMm, image.scale, asset.width, asset.height);
    const dpi = effectiveDpi(asset.width, size.width);

    if (dpiVerdict(dpi) === "block") {
      throw new BadRequestException(
        `Una de tus imagenes quedaria a ${Math.round(dpi)} dpi al tamano elegido ` +
          `(minimo ${MIN_PRINT_DPI}). Reducí el tamano del diseno o subí una imagen de mas resolucion.`,
      );
    }

    // El clamp se aplica en silencio en vez de rechazar: para un cliente honesto
    // es una operacion nula, y para uno que manda coordenadas fuera del area el
    // resultado correcto es imprimir dentro del rectangulo, no perder la venta.
    const position = clampElementToPrintArea(
      { x: image.x, y: image.y },
      size,
      areaWidthMm,
      areaHeightMm,
      image.rotation,
    );

    return {
      assetId: asset.id,
      x: position.x,
      y: position.y,
      scale: image.scale,
      rotation: image.rotation,
      naturalWidth: asset.width,
      naturalHeight: asset.height,
      hasAlpha: asset.hasAlpha,
      drawWidthMm: size.width,
      drawHeightMm: size.height,
      effectiveDpi: dpi,
    };
  }

  private normalizeText(
    text: NonNullable<DesignDto["texts"]>[number],
  ): NormalizedLayer["texts"][number] {
    if (!isSupportedFontFamily(text.fontFamily)) {
      throw new BadRequestException(
        `La tipografia "${text.fontFamily}" no esta disponible para estampar.`,
      );
    }

    // Bebas Neue no tiene negrita ni italica reales. Se apagan en vez de
    // rechazar: el navegador las falsificaria y el servidor no, asi que dejarlas
    // encendidas garantizaria que lo impreso no coincida con lo aprobado.
    const capabilities = getFontCapabilities(text.fontFamily);

    // Los saltos de linea se eliminan: el editor los envuelve en un <div> y el
    // render del servidor los pondra en un <text> de SVG, que no envuelve.
    // Aceptarlos significaria dos maquetados distintos.
    const content = text.content.replace(/[\r\n\t]+/g, " ").trim();
    if (content.length === 0) {
      throw new BadRequestException("Hay un texto vacio en tu diseno.");
    }

    return {
      content,
      // El texto se acota como punto y no por su caja: medir su ancho real
      // necesita metricas de la fuente, que solo tiene el rasterizador. El
      // renderer de la fase siguiente hara el recorte fino.
      x: Math.min(100, Math.max(0, text.x)),
      y: Math.min(100, Math.max(0, text.y)),
      fontFamily: text.fontFamily,
      fontSize: text.fontSize,
      color: text.color.toLowerCase(),
      bold: text.bold && (capabilities?.hasBold ?? false),
      italic: text.italic && (capabilities?.hasItalic ?? false),
      scale: text.scale,
      rotation: text.rotation,
    };
  }
}
