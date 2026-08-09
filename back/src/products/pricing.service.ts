import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import {
  PricedVariant,
  ProductsRepository,
  PRODUCTS_REPOSITORY,
} from "../repositories/interfaces/products.repository.interface";
import { toPublicUrl } from "./product-url.util";

export interface CartLineInput {
  variantId: string;
  quantity: number;
}

export interface PricedLine extends PricedVariant {
  quantity: number;
  lineTotalCop: number;
  imageUrl: string | null;
  /** Texto legible que va a la pagina de pago. Se arma aqui, nunca lo manda el cliente. */
  description: string;
}

export interface PricedCart {
  lines: PricedLine[];
  subtotalCop: number;
}

const MAX_QUANTITY_PER_LINE = 20;

/**
 * Unica clase autorizada a producir dinero.
 *
 * Vive separada de ProductsService a proposito: OrdersModule la importa y nunca
 * calcula un precio por su cuenta. Eso convierte "jamas confiar en el precio que
 * manda el cliente" en una propiedad estructural del codigo y no en un comentario
 * que alguien puede ignorar.
 */
@Injectable()
export class PricingService {
  constructor(
    @Inject(PRODUCTS_REPOSITORY)
    private readonly productsRepository: ProductsRepository,
  ) {}

  async priceCart(lines: CartLineInput[]): Promise<PricedCart> {
    if (lines.length === 0) {
      throw new BadRequestException("El carrito esta vacio.");
    }

    for (const line of lines) {
      if (!Number.isInteger(line.quantity) || line.quantity < 1) {
        throw new BadRequestException("La cantidad debe ser un entero mayor o igual a 1.");
      }
      if (line.quantity > MAX_QUANTITY_PER_LINE) {
        throw new BadRequestException(
          `La cantidad maxima por producto es ${MAX_QUANTITY_PER_LINE}.`,
        );
      }
    }

    const uniqueIds = [...new Set(lines.map((line) => line.variantId))];
    const variants = await this.productsRepository.findActiveVariantsByIds(uniqueIds);
    const byId = new Map(variants.map((variant) => [variant.variantId, variant]));

    const missing = uniqueIds.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Estos productos ya no estan disponibles: ${missing.join(", ")}. Actualiza tu carrito.`,
      );
    }

    // Las lineas con el mismo variantId NO se fusionan: pueden compartir la
    // prenda y diferir en personalizacion, y fusionarlas destruiria un diseno
    // en silencio.
    const priced: PricedLine[] = lines.map((line) => {
      const variant = byId.get(line.variantId) as PricedVariant;
      const lineTotalCop = variant.unitPriceCop * line.quantity;

      return {
        ...variant,
        quantity: line.quantity,
        lineTotalCop,
        imageUrl: variant.imageStorageKey ? toPublicUrl(variant.imageStorageKey) : null,
        description: `${variant.size} · ${variant.colorNameEs}`,
      };
    });

    const subtotalCop = priced.reduce((sum, line) => sum + line.lineTotalCop, 0);

    return { lines: priced, subtotalCop };
  }
}
