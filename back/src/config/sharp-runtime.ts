import sharp from "sharp";

/**
 * Disciplina de memoria para sharp.
 *
 * Un area de estampado de 280 x 400 mm a 300 dpi son 62 megapixeles: cada
 * intermedio RGBA ronda los 250 MB y el compuesto toca varios a la vez. Es la
 * restriccion tecnica mas dura del proyecto, asi que el proceso se configura
 * para no acumular:
 *
 * - `cache(false)`: libvips no retiene buffers de operaciones anteriores.
 * - `concurrency(1)`: un solo hilo de libvips. Dos subidas grandes simultaneas
 *   se serializan en vez de sumar sus picos de memoria.
 *
 * Se llama una sola vez al arrancar; llamarlo varias veces es inofensivo.
 */
export const configureSharpRuntime = (): void => {
  sharp.cache(false);
  sharp.concurrency(1);
};
