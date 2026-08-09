import sharp from "sharp";

/**
 * Imagenes de prueba generadas en el momento, no archivos binarios versionados:
 * asi se ve en el codigo exactamente que hace rara a cada una.
 */

export const pngWithTransparency = (width = 200, height = 120): Promise<Buffer> =>
  sharp({
    create: { width, height, channels: 4, background: { r: 10, g: 200, b: 30, alpha: 0.5 } },
  })
    .png()
    .toBuffer();

/** Tiene canal alfa pero completamente opaco: el caso mas comun de PNG exportado. */
export const opaquePngWithAlphaChannel = (width = 200, height = 120): Promise<Buffer> =>
  sharp({
    create: { width, height, channels: 4, background: { r: 10, g: 200, b: 30, alpha: 1 } },
  })
    .png()
    .toBuffer();

export const jpeg = (width = 200, height = 120): Promise<Buffer> =>
  sharp({ create: { width, height, channels: 3, background: "#ff0000" } })
    .jpeg()
    .toBuffer();

/**
 * JPEG apaisado que declara orientacion 6 en el EXIF: el navegador lo muestra
 * vertical y un rasterizador que ignore el EXIF lo imprime acostado.
 */
export const jpegNeedingExifRotation = (width = 200, height = 100): Promise<Buffer> =>
  sharp({ create: { width, height, channels: 3, background: "#00ff00" } })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();

export const svg = (): Buffer =>
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
      '<rect width="200" height="200" fill="red"/></svg>',
  );

const u24 = (value: number): Buffer => {
  const buffer = Buffer.alloc(3);
  buffer.writeUIntLE(value, 0, 3);
  return buffer;
};

const riffChunk = (tag: string, payload: Buffer): Buffer => {
  const header = Buffer.alloc(8);
  header.write(tag, 0, 4, "ascii");
  header.writeUInt32LE(payload.length, 4);
  const padding = payload.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0);
  return Buffer.concat([header, payload, padding]);
};

const findRiffChunk = (buffer: Buffer, tag: string): Buffer | null => {
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const current = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (current === tag) return buffer.subarray(offset, offset + 8 + size + (size % 2));
    offset += 8 + size + (size % 2);
  }
  return null;
};

/**
 * WebP animado de verdad, armado a mano.
 *
 * sharp no sabe escribir animaciones a partir de un buffer crudo (lo intenta y
 * produce un archivo de una sola pagina), asi que el contenedor RIFF se
 * construye aqui: VP8X con el bit de animacion, ANIM y dos ANMF que reusan el
 * mismo bitstream VP8.
 *
 * Importa porque sin la validacion sharp lo lee como una imagen fija de una
 * pagina: el cliente subiria su GIF favorito y se estamparia el primer cuadro
 * sin que nadie se entere hasta ver la prenda.
 */
export const animatedWebp = async (size = 64): Promise<Buffer> => {
  const still = await sharp({
    create: { width: size, height: size, channels: 3, background: "#ff0000" },
  })
    .webp({ quality: 60 })
    .toBuffer();

  const bitstream = findRiffChunk(still, "VP8 ") ?? findRiffChunk(still, "VP8L");
  if (!bitstream) throw new Error("El WebP de referencia no trae bitstream VP8");

  const frame = riffChunk(
    "ANMF",
    Buffer.concat([
      u24(0),
      u24(0),
      u24(size - 1),
      u24(size - 1),
      u24(100),
      Buffer.from([0]),
      bitstream,
    ]),
  );

  const vp8x = riffChunk(
    "VP8X",
    Buffer.concat([Buffer.from([0x02, 0, 0, 0]), u24(size - 1), u24(size - 1)]),
  );
  const anim = riffChunk(
    "ANIM",
    Buffer.concat([Buffer.from([0xff, 0xff, 0xff, 0xff]), Buffer.from([0, 0])]),
  );

  const body = Buffer.concat([Buffer.from("WEBP", "ascii"), vp8x, anim, frame, frame]);
  const size32 = Buffer.alloc(4);
  size32.writeUInt32LE(body.length);
  return Buffer.concat([Buffer.from("RIFF", "ascii"), size32, body]);
};
