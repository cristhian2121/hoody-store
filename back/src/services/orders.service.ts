import { Injectable, Inject, BadRequestException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Prisma, OrderStatus } from "@prisma/client";
import { OrderRepository } from "../repositories/interfaces/orders.repository.interface";
import { PaymentsService } from "./payments.service";
import { CheckoutDto } from "../api/dto/checkout.dto";
import { ShippingService } from "../shipping/shipping.service";
import { PricingService, PricedLine } from "../products/pricing.service";
import { DesignValidationService, NormalizedDesign } from "../print/design-validation.service";
import { toRemoteFetchableUrl } from "../products/product-url.util";

export const ORDER_CURRENCY = "COP";

@Injectable()
export class OrdersService {
  constructor(
    @Inject("OrderRepository") private readonly orderRepository: OrderRepository,
    private readonly paymentsService: PaymentsService,
    private readonly shippingService: ShippingService,
    private readonly pricingService: PricingService,
    private readonly designValidation: DesignValidationService,
  ) {}

  /**
   * Crea la orden y la preferencia de pago.
   *
   * El orden de los pasos no es casual: todo lo que puede fallar por culpa del
   * pedido —precio, envio, disenos— se comprueba antes de que exista una orden
   * y antes de que se genere un link de pago. Un cliente nunca deberia poder
   * pagar algo que despues no se puede producir.
   */
  async createOrderWithCheckout(checkoutData: CheckoutDto) {
    this.assertUniqueCartItemIds(checkoutData);

    // 1. El precio sale de la base de datos. `checkoutData` ni siquiera tiene un
    //    campo de precio que se pudiera leer por accidente.
    const priced = await this.pricingService.priceCart(
      checkoutData.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    );

    const shippingQuote = await this.shippingService.calculateQuote({
      countryCode: checkoutData.shipping.countryCode,
      departmentCode: checkoutData.shipping.departmentCode,
      cityCode: checkoutData.shipping.cityCode,
    });

    // 2. Los disenos se validan contra el catalogo real y contra los assets
    //    subidos. Falla aqui es un 400 antes de cobrar; fallar despues seria un
    //    cliente con el dinero descontado y una prenda que no se puede imprimir.
    const designsPerItem: NormalizedDesign[][] = [];
    for (const [index, item] of checkoutData.items.entries()) {
      designsPerItem.push(
        await this.designValidation.validateItemDesigns(item.designs, priced.lines[index].category),
      );
    }

    const subtotal = priced.subtotalCop;
    const shippingCost = shippingQuote.amount;
    const total = subtotal + shippingCost;
    const orderId = randomUUID();

    const orderData: Prisma.OrderCreateInput = {
      id: orderId,
      status: OrderStatus.checkout_created,
      paymentProvider: "mercadopago",
      customer: { ...checkoutData.customer } as unknown as Prisma.InputJsonValue,
      shipping: {
        countryCode: shippingQuote.country.code,
        country: shippingQuote.country.name,
        departmentCode: shippingQuote.department.code,
        department: shippingQuote.department.name,
        cityCode: shippingQuote.city.code,
        city: shippingQuote.city.name,
        address: checkoutData.shipping.address,
        postalCode: checkoutData.shipping.postalCode ?? null,
        cost: shippingCost,
        currency: shippingQuote.currency,
        pricingProvider: shippingQuote.provider,
      } as unknown as Prisma.InputJsonValue,
      totals: {
        subtotal,
        shipping: shippingCost,
        total,
        currency: ORDER_CURRENCY,
      } as unknown as Prisma.InputJsonValue,
      // Columna heredada. La fuente de verdad es la relacion orderItems; esto se
      // conserva mientras las notificaciones sigan leyendola, y se elimina en la
      // limpieza final.
      items: priced.lines.map((line) => ({
        name: line.productNameEs,
        quantity: line.quantity,
        price: line.unitPriceCop,
      })) as unknown as Prisma.InputJsonValue,
      payment: Prisma.JsonNull,
      orderItems: {
        create: priced.lines.map((line, index) =>
          this.toOrderItemCreate(line, checkoutData.items[index].cartItemId, designsPerItem[index]),
        ),
      },
    };

    // 3. Una sola transaccion: orden, lineas y disenos.
    const order = await this.orderRepository.create(orderData);

    const preference = await this.paymentsService.createPreference({
      orderId,
      customer: checkoutData.customer,
      items: priced.lines.map((line) => ({
        id: line.sku,
        // El titulo y la descripcion se arman en el servidor. Antes se
        // interpolaba un string del cliente directo en la pagina de pago.
        title: line.productNameEs,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPriceCop,
        pictureUrl: line.imageStorageKey ? toRemoteFetchableUrl(line.imageStorageKey) : undefined,
        categoryId: line.category,
      })),
      shippingCost,
    });

    const updatedOrder = await this.orderRepository.attachPayment(order.id, {
      provider: "mercadopago",
      preferenceId: preference.id ?? null,
      initPoint: preference.init_point ?? null,
      status: "pending",
    });

    if (!updatedOrder) {
      throw new Error("Failed to update order with payment information");
    }

    return {
      order: updatedOrder,
      checkoutUrl: preference.init_point,
      totals: { subtotal, shipping: shippingCost, total, currency: ORDER_CURRENCY },
    };
  }

  /**
   * La tabla tiene @@unique([orderId, cartItemId]). Sin esta comprobacion, un
   * carrito con ids repetidos reventaria como violacion de constraint a mitad de
   * la transaccion en vez de como un 400 explicable.
   */
  private assertUniqueCartItemIds(checkoutData: CheckoutDto): void {
    const ids = checkoutData.items.map((item) => item.cartItemId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException("Hay lineas repetidas en el carrito.");
    }
  }

  private toOrderItemCreate(
    line: PricedLine,
    cartItemId: string,
    designs: NormalizedDesign[],
  ): Prisma.OrderItemCreateWithoutOrderInput {
    return {
      cartItemId,
      variant: { connect: { id: line.variantId } },
      // Columnas snapshot: no son redundantes con variantId, son el registro de
      // que se vendio y a que precio. Retocar el catalogo despues no las cambia.
      productSlug: line.productSlug,
      productNameEs: line.productNameEs,
      productNameEn: line.productNameEn,
      category: line.category,
      gender: line.gender,
      size: line.size,
      colorId: line.colorId,
      colorNameEs: line.colorNameEs,
      colorNameEn: line.colorNameEn,
      colorHex: line.colorHex,
      imageUrl: line.imageUrl,
      unitPriceCop: line.unitPriceCop,
      quantity: line.quantity,
      lineTotalCop: line.lineTotalCop,
      designs: {
        create: designs.map((design) => ({
          side: design.side,
          category: design.category,
          printAreaWidthMm: design.printAreaWidthMm,
          printAreaHeightMm: design.printAreaHeightMm,
          dpi: design.dpi,
          layer: design.layer as unknown as Prisma.InputJsonValue,
          ...(design.imageAssetId ? { imageAsset: { connect: { id: design.imageAssetId } } } : {}),
        })),
      },
    };
  }

  async listOrders() {
    return this.orderRepository.list();
  }

  async getOrderById(id: string) {
    return this.orderRepository.getById(id);
  }
}
