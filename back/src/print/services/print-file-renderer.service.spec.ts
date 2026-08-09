import sharp from "sharp";
import { PrintFileRendererService, RENDERER_VERSION } from "./print-file-renderer.service";
import type { NormalizedLayer } from "../design-validation.service";
import { PRINT_AREAS, PRINT_DPI } from "../geometry/print-areas";
import { mmToPx } from "../geometry/print-geometry";

/** dpi bajo para la mayoria de los casos: la geometria es la misma y el test vuela. */
const FAST_DPI = 72;

const AREA = PRINT_AREAS.camisetas.back; // 280 x 400 mm

const emptyLayer = (): NormalizedLayer => ({ image: null, texts: [] });

const text = (overrides: Partial<NormalizedLayer["texts"][number]> = {}) => ({
  content: "ATUESTAMPA",
  x: 50,
  y: 50,
  fontFamily: "Plus Jakarta Sans",
  fontSize: 24,
  color: "#ff0000",
  bold: false,
  italic: false,
  scale: 1,
  rotation: 0,
  ...overrides,
});

const imageLayer = (
  overrides: Partial<NonNullable<NormalizedLayer["image"]>> = {},
): NonNullable<NormalizedLayer["image"]> => ({
  assetId: "a1",
  x: 50,
  y: 50,
  scale: 1,
  rotation: 0,
  naturalWidth: 1000,
  naturalHeight: 1000,
  hasAlpha: true,
  drawWidthMm: 168,
  drawHeightMm: 168,
  effectiveDpi: 300,
  ...overrides,
});

/** Master de prueba: cuadrado rojo opaco, asimetrico por su esquina verde. */
const master = async (size = 400): Promise<Buffer> => {
  const base = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const marker = await sharp({
    create: {
      width: Math.round(size / 5),
      height: Math.round(size / 5),
      channels: 4,
      background: { r: 0, g: 255, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  return sharp(base)
    .composite([{ input: marker, top: 0, left: 0 }])
    .png()
    .toBuffer();
};

const pixelAt = async (png: Buffer, x: number, y: number) => {
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * info.channels;
  return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
};

const inkPixels = async (png: Buffer) => {
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  let n = 0;
  for (let i = 0; i < data.length; i += info.channels) if (data[i + 3] > 20) n++;
  return n;
};

describe("PrintFileRendererService", () => {
  const renderer = new PrintFileRendererService();

  const render = (layer: NormalizedLayer, imageMaster?: Buffer | null, dpi = FAST_DPI) =>
    renderer.render({
      layer,
      printAreaWidthMm: AREA.widthMm,
      printAreaHeightMm: AREA.heightMm,
      dpi,
      imageMaster,
    });

  describe("el lienzo es el area fisica", () => {
    it("el tamano en pixeles sale de los milimetros y el dpi", async () => {
      const result = await render({ ...emptyLayer(), texts: [text()] });

      expect(result.widthPx).toBe(mmToPx(280, FAST_DPI));
      expect(result.heightPx).toBe(mmToPx(400, FAST_DPI));
    });

    it.each([
      ["hoodies", "front", 260, 260],
      ["hoodies", "back", 280, 400],
      ["camisetas", "front", 280, 350],
      ["camisetas", "back", 280, 400],
    ] as const)("%s %s = %imm x %imm", async (category, side, widthMm, heightMm) => {
      const area = PRINT_AREAS[category][side];
      expect([area.widthMm, area.heightMm]).toEqual([widthMm, heightMm]);

      const result = await renderer.render({
        layer: { ...emptyLayer(), texts: [text()] },
        printAreaWidthMm: area.widthMm,
        printAreaHeightMm: area.heightMm,
        dpi: FAST_DPI,
      });

      expect(result.widthPx).toBe(mmToPx(widthMm, FAST_DPI));
      expect(result.heightPx).toBe(mmToPx(heightMm, FAST_DPI));
    });

    // Sin el chunk pHYs, Photoshop abre el archivo como "3307 x 4724 px a 72
    // dpi" y el operador tiene que adivinar la escala: el estampado sale del
    // tamano equivocado aunque el archivo sea correcto.
    it("declara la densidad fisica en el PNG", async () => {
      const result = await render({ ...emptyLayer(), texts: [text()] }, null, PRINT_DPI);
      const metadata = await sharp(result.png).metadata();

      expect(metadata.density).toBe(PRINT_DPI);
      expect(metadata.width).toBe(3307);
      expect(metadata.height).toBe(4724);
    });

    it("el fondo queda completamente transparente", async () => {
      const result = await render({ ...emptyLayer(), texts: [text()] });
      const corner = await pixelAt(result.png, 2, 2);

      expect(corner.a).toBe(0);
    });

    it("el PNG conserva el canal alfa", async () => {
      const result = await render({ ...emptyLayer(), texts: [text()] });
      expect((await sharp(result.png).metadata()).hasAlpha).toBe(true);
    });
  });

  describe("capa de imagen", () => {
    it("estampa la imagen centrada donde dice el diseno", async () => {
      const result = await render({ ...emptyLayer(), image: imageLayer() }, await master());

      const center = await pixelAt(
        result.png,
        Math.round(result.widthPx / 2),
        Math.round(result.heightPx / 2),
      );
      expect(center.a).toBeGreaterThan(200);
      expect(center.r).toBeGreaterThan(200);
    });

    it("la imagen ocupa el tamano fisico declarado", async () => {
      const result = await render(
        { ...emptyLayer(), image: imageLayer({ drawWidthMm: 140, drawHeightMm: 140 }) },
        await master(),
      );

      const expectedPx = mmToPx(140, FAST_DPI);
      const ink = await inkPixels(result.png);
      // Cuadrado opaco: la tinta es aproximadamente su area.
      expect(ink).toBeGreaterThan(expectedPx * expectedPx * 0.9);
      expect(ink).toBeLessThan(expectedPx * expectedPx * 1.1);
    });

    it("una posicion distinta mueve el estampado", async () => {
      const arriba = await render(
        { ...emptyLayer(), image: imageLayer({ y: 20 }) },
        await master(),
      );
      const centro = await render({ ...emptyLayer(), image: imageLayer() }, await master());

      const y = Math.round(arriba.heightPx * 0.2);
      expect((await pixelAt(arriba.png, Math.round(arriba.widthPx / 2), y)).a).toBeGreaterThan(200);
      expect((await pixelAt(centro.png, Math.round(centro.widthPx / 2), y)).a).toBe(0);
    });

    // Un signo invertido produciria estampados espejados en todo diseno rotado y
    // ningun test de dimensiones lo detectaria.
    it("rota en el mismo sentido que el preview", async () => {
      // El marcador verde esta arriba a la izquierda. Girando 90 grados en
      // sentido horario tiene que quedar arriba a la derecha.
      const result = await render(
        { ...emptyLayer(), image: imageLayer({ rotation: 90 }) },
        await master(),
      );

      const halfSide = mmToPx(168, FAST_DPI) / 2;
      const cx = result.widthPx / 2;
      const cy = result.heightPx / 2;

      const supDer = await pixelAt(
        result.png,
        Math.round(cx + halfSide * 0.7),
        Math.round(cy - halfSide * 0.7),
      );
      const supIzq = await pixelAt(
        result.png,
        Math.round(cx - halfSide * 0.7),
        Math.round(cy - halfSide * 0.7),
      );

      expect(supDer.g).toBeGreaterThan(200);
      expect(supIzq.g).toBeLessThan(100);
    });

    // El clamp mantiene el centro dentro del area pero no el tamano. Sin recorte
    // sharp falla con "Image to composite must have same dimensions or smaller"
    // y se cae el render de una orden ya pagada.
    it("recorta una imagen mas grande que el area en vez de fallar", async () => {
      const result = await render(
        { ...emptyLayer(), image: imageLayer({ drawWidthMm: 900, drawHeightMm: 900 }) },
        await master(),
      );

      expect(result.widthPx).toBe(mmToPx(280, FAST_DPI));
      // Cubre todo el lienzo.
      expect(await inkPixels(result.png)).toBe(result.widthPx * result.heightPx);
    });

    it("sin master no dibuja capa de imagen", async () => {
      const result = await render({ ...emptyLayer(), image: imageLayer() }, null);
      expect(await inkPixels(result.png)).toBe(0);
    });
  });

  describe("capa de texto", () => {
    it("dibuja el texto con la tipografia pedida", async () => {
      const result = await render({ ...emptyLayer(), texts: [text()] });
      expect(await inkPixels(result.png)).toBeGreaterThan(0);
    });

    it("cada familia produce un render distinto", async () => {
      const renders = await Promise.all(
        ["Plus Jakarta Sans", "Bebas Neue", "Playfair Display", "Comic Neue"].map(
          async (fontFamily) =>
            inkPixels((await render({ ...emptyLayer(), texts: [text({ fontFamily })] })).png),
        ),
      );

      expect(new Set(renders).size).toBe(4);
    });

    it("la negrita usa el archivo real y cambia el resultado", async () => {
      const normal = await inkPixels((await render({ ...emptyLayer(), texts: [text()] })).png);
      const negrita = await inkPixels(
        (await render({ ...emptyLayer(), texts: [text({ bold: true })] })).png,
      );

      expect(negrita).toBeGreaterThan(normal);
    });

    // resvg NO falla ante una familia desconocida: sustituye en silencio por otra
    // de las cargadas. Sin esta guarda un diseno guardado antes de que una fuente
    // saliera del registro se imprimiria con otra tipografia sin aviso.
    it("falla ruidosamente ante una tipografia fuera del registro", async () => {
      await expect(
        render({ ...emptyLayer(), texts: [text({ fontFamily: "Comic Sans MS" })] }),
      ).rejects.toThrow(/registro/);
    });

    // El contenido lo escribe el cliente y termina dentro de un documento XML.
    it("escapa el contenido para no romper el SVG", async () => {
      const result = await render({
        ...emptyLayer(),
        texts: [text({ content: '<tspan>& "roto"' })],
      });

      expect(await inkPixels(result.png)).toBeGreaterThan(0);
    });

    it("dibuja varios textos a la vez", async () => {
      const uno = await inkPixels((await render({ ...emptyLayer(), texts: [text()] })).png);
      const dos = await inkPixels(
        (await render({ ...emptyLayer(), texts: [text({ y: 30 }), text({ y: 70 })] })).png,
      );

      expect(dos).toBeGreaterThan(uno * 1.8);
    });
  });

  describe("imagen de prueba", () => {
    it("es un JPEG chico y opaco", async () => {
      const result = await render({ ...emptyLayer(), texts: [text()] });
      const metadata = await sharp(result.proof).metadata();

      expect(metadata.format).toBe("jpeg");
      expect(Math.max(metadata.width as number, metadata.height as number)).toBeLessThanOrEqual(
        1000,
      );
      expect(metadata.hasAlpha).toBe(false);
    });

    // Sin aplanar sobre blanco el fondo transparente sale negro y se confunde
    // con tinta negra al revisar.
    it("el fondo de la prueba es blanco, no negro", async () => {
      const result = await render({ ...emptyLayer(), texts: [text()] });
      const corner = await pixelAt(result.proof, 2, 2);

      expect(corner.r).toBeGreaterThan(240);
      expect(corner.g).toBeGreaterThan(240);
      expect(corner.b).toBeGreaterThan(240);
    });

    it("pesa mucho menos que el archivo de impresion", async () => {
      const result = await render({ ...emptyLayer(), image: imageLayer() }, await master(), 150);
      expect(result.proof.length).toBeLessThan(result.png.length);
    });
  });

  it("la version del renderer esta declarada", () => {
    expect(RENDERER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
