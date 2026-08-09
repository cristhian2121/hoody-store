import { Injectable, Logger } from "@nestjs/common";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import type { OverlayOptions } from "sharp";
import type { NormalizedLayer } from "../design-validation.service";
import { allFontFilePaths, isSupportedFontFamily } from "../fonts/font-registry";
import { centerPx, mmToPx, textFontSizeMm } from "../geometry/print-geometry";

/**
 * Version del pipeline de render.
 *
 * Se guarda en cada PrintAsset para poder identificar despues todos los archivos
 * producidos por una version con bug y reencolarlos. Subirla cada vez que cambie
 * algo que altere el resultado: geometria, formato, fuentes.
 */
export const RENDERER_VERSION = "1.0.0";

/** Lado mayor de la imagen de prueba que revisa el dueno antes de imprimir. */
const PROOF_MAX_PX = 1000;

export interface RenderInput {
  layer: NormalizedLayer;
  printAreaWidthMm: number;
  printAreaHeightMm: number;
  dpi: number;
  /** Master del diseno, ya descargado del almacenamiento. */
  imageMaster?: Buffer | null;
}

export interface RenderResult {
  /** Archivo listo para el RIP: PNG con alfa, en tamano fisico real. */
  png: Buffer;
  /** JPEG chico sobre fondo blanco, para revisar sin bajar 40 MB. */
  proof: Buffer;
  widthPx: number;
  heightPx: number;
  bytes: number;
}

/**
 * Compone el archivo que se manda a producir.
 *
 * Dos rasterizadores porque hacen cosas distintas: sharp para la capa de imagen
 * (redimensionado de calidad y rotacion con alfa) y resvg para la de texto,
 * porque necesita metricas de fuente reales. Se cargan exactamente los mismos
 * archivos .ttf que el navegador sirve como .woff2 en el editor, que es lo que
 * hace que el preview y la impresion coincidan.
 */
@Injectable()
export class PrintFileRendererService {
  private readonly logger = new Logger(PrintFileRendererService.name);

  async render(input: RenderInput): Promise<RenderResult> {
    const width = mmToPx(input.printAreaWidthMm, input.dpi);
    const height = mmToPx(input.printAreaHeightMm, input.dpi);

    const overlays: OverlayOptions[] = [];

    const imageOverlay = await this.buildImageOverlay(input, width, height);
    if (imageOverlay) overlays.push(imageOverlay);

    const textOverlay = this.buildTextOverlay(input, width, height);
    if (textOverlay) overlays.push({ input: textOverlay, top: 0, left: 0 });

    // Lienzo totalmente transparente: en DTF lo que no tiene tinta no se
    // imprime, y ahi es donde se ve la tela.
    const base = () =>
      sharp({
        create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
      });

    const png = await base()
      .composite(overlays)
      // El chunk pHYs es lo que hace que Photoshop o CorelDRAW abran el archivo
      // como "280 x 400 mm a 300 dpi" y no como "3307 x 4724 px a 72 dpi". Sin
      // el, el operador tiene que adivinar la escala y el estampado sale del
      // tamano equivocado.
      .withMetadata({ density: input.dpi })
      .png({ compressionLevel: 9 })
      .toBuffer();

    const proof = await sharp(png)
      .resize(PROOF_MAX_PX, PROOF_MAX_PX, { fit: "inside", withoutEnlargement: true })
      // Aplanar sobre blanco: un JPEG no tiene alfa y sin esto el fondo saldria
      // negro, que se confunde con tinta negra al revisar.
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 80 })
      .toBuffer();

    this.logger.log(
      `Render ${width}x${height}px @${input.dpi}dpi ` +
        `(${input.printAreaWidthMm}x${input.printAreaHeightMm}mm), ${Math.round(png.length / 1024)} KB`,
    );

    return { png, proof, widthPx: width, heightPx: height, bytes: png.length };
  }

  /**
   * Capa de imagen: escalar al tamano fisico, rotar y ubicar por su centro.
   *
   * `sharp.rotate` expande el lienzo a la caja envolvente del rectangulo girado,
   * que es exactamente lo que asume el clamp de la geometria. El sentido de giro
   * coincide con el de CSS y el de SVG (verificado con una imagen asimetrica),
   * asi que un diseno rotado sale igual que en el preview y no espejado.
   */
  private async buildImageOverlay(
    input: RenderInput,
    canvasWidth: number,
    canvasHeight: number,
  ): Promise<OverlayOptions | null> {
    const image = input.layer.image;
    if (!image || !input.imageMaster) return null;

    const drawWidthPx = mmToPx(image.drawWidthMm, input.dpi);
    const drawHeightPx = mmToPx(image.drawHeightMm, input.dpi);

    const rotated = await sharp(input.imageMaster)
      .resize(drawWidthPx, drawHeightPx, { fit: "fill", kernel: "lanczos3" })
      .rotate(image.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer({ resolveWithObject: true });

    const center = centerPx(image, input.printAreaWidthMm, input.printAreaHeightMm, input.dpi);
    const left = Math.round(center.x - rotated.info.width / 2);
    const top = Math.round(center.y - rotated.info.height / 2);

    return this.clipToCanvas(rotated.data, rotated.info, left, top, canvasWidth, canvasHeight);
  }

  /**
   * Recorta la capa a lo que cabe en el area de estampado.
   *
   * Hace falta porque un diseno puede ser mas grande que el area: el clamp
   * mantiene su centro adentro pero no su tamano. Sin esto `composite` falla con
   * "Image to composite must have same dimensions or smaller" y se cae el render
   * de una orden ya pagada.
   */
  private async clipToCanvas(
    data: Buffer,
    info: { width: number; height: number },
    left: number,
    top: number,
    canvasWidth: number,
    canvasHeight: number,
  ): Promise<OverlayOptions | null> {
    const visibleLeft = Math.max(0, left);
    const visibleTop = Math.max(0, top);
    const visibleRight = Math.min(canvasWidth, left + info.width);
    const visibleBottom = Math.min(canvasHeight, top + info.height);

    const visibleWidth = visibleRight - visibleLeft;
    const visibleHeight = visibleBottom - visibleTop;

    // Quedo entero fuera del area: no hay nada que estampar.
    if (visibleWidth <= 0 || visibleHeight <= 0) return null;

    if (visibleWidth === info.width && visibleHeight === info.height) {
      return { input: data, top, left };
    }

    const cropped = await sharp(data)
      .extract({
        left: visibleLeft - left,
        top: visibleTop - top,
        width: visibleWidth,
        height: visibleHeight,
      })
      .png()
      .toBuffer();

    return { input: cropped, top: visibleTop, left: visibleLeft };
  }

  /**
   * Capa de texto: un solo SVG del tamano del lienzo con un <text> por elemento.
   *
   * Uno solo y no uno por texto porque asi resvg resuelve las fuentes una vez y
   * el recorte al borde del area lo hace el propio viewport del SVG.
   */
  private buildTextOverlay(input: RenderInput, width: number, height: number): Buffer | null {
    const texts = input.layer.texts;
    if (texts.length === 0) return null;

    const elements = texts.map((text) => {
      // Defensa en profundidad: el DTO ya valida la familia contra el registro,
      // pero resvg NO falla ante una desconocida, sustituye en silencio por otra
      // de las cargadas (verificado). Un diseno guardado antes de que una fuente
      // saliera del registro se imprimiria con otra tipografia sin aviso.
      if (!isSupportedFontFamily(text.fontFamily)) {
        throw new Error(
          `La tipografia "${text.fontFamily}" no esta en el registro; no se puede renderizar.`,
        );
      }

      const fontSizePx = mmToPx(
        textFontSizeMm(input.printAreaWidthMm, text.fontSize, text.scale),
        input.dpi,
      );
      const center = centerPx(text, input.printAreaWidthMm, input.printAreaHeightMm, input.dpi);

      return (
        `<text x="${center.x.toFixed(2)}" y="${center.y.toFixed(2)}"` +
        ` font-family="${escapeXml(text.fontFamily)}"` +
        ` font-size="${fontSizePx}"` +
        ` font-weight="${text.bold ? "bold" : "normal"}"` +
        ` font-style="${text.italic ? "italic" : "normal"}"` +
        ` fill="${escapeXml(text.color)}"` +
        ` text-anchor="middle" dominant-baseline="central"` +
        ` transform="rotate(${text.rotation} ${center.x.toFixed(2)} ${center.y.toFixed(2)})"` +
        `>${escapeXml(text.content)}</text>`
      );
    });

    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
      `viewBox="0 0 ${width} ${height}">${elements.join("")}</svg>`;

    const resvg = new Resvg(svg, {
      font: {
        fontFiles: allFontFilePaths(),
        // Nunca usar fuentes de la maquina: lo que hay instalado en el
        // contenedor no es lo que vio el cliente.
        loadSystemFonts: false,
      },
    });

    return Buffer.from(resvg.render().asPng());
  }
}

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

/**
 * El contenido lo escribe el cliente y termina dentro de un documento XML. Sin
 * escapar, un texto con `<` produce un SVG malformado y el render de una orden
 * pagada falla; con `]]>` o una entidad se podria intentar cosas peores.
 */
const escapeXml = (value: string): string => value.replace(/[&<>"']/g, (c) => XML_ESCAPES[c]);
