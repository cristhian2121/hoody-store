import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

/**
 * Linea tal como se le muestra al cliente en la pagina de pago.
 *
 * Todos los campos los arma el servidor a partir del catalogo. Antes el titulo y
 * la descripcion venian del cuerpo del pedido, o sea que un comprador podia
 * elegir que texto aparecia en su propia pantalla de cobro.
 */
export interface PreferenceLineItem {
  /** SKU de la variante. */
  id: string;
  title: string;
  description: string;
  quantity: number;
  unitPrice: number;
  /** Se omite cuando la URL no es alcanzable desde afuera (dev local). */
  pictureUrl?: string;
  categoryId: string;
}

@Injectable()
export class MercadoPagoService {
  private preferenceClient: Preference;
  private paymentClient: Payment;

  constructor(private configService: ConfigService) {
    const accessToken = this.configService.get<string>("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) {
      throw new Error("Missing required environment variable: MERCADOPAGO_ACCESS_TOKEN");
    }

    const client = new MercadoPagoConfig({ accessToken });
    this.preferenceClient = new Preference(client);
    this.paymentClient = new Payment(client);
  }

  private sanitizeUnitPrice(value: number): number {
    return Number(Number(value).toFixed(2));
  }

  async createPreference({
    orderId,
    customer,
    items,
    shippingCost,
    frontendUrl,
    notificationUrl,
  }: {
    orderId: string;
    customer: { firstName: string; lastName: string; email: string; phone: string };
    items: PreferenceLineItem[];
    shippingCost: number;
    frontendUrl: string;
    notificationUrl: string;
  }) {
    const preferenceItems = items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      quantity: item.quantity,
      currency_id: "COP" as const,
      unit_price: this.sanitizeUnitPrice(item.unitPrice),
      picture_url: item.pictureUrl,
      category_id: item.categoryId,
    }));

    if (shippingCost > 0) {
      preferenceItems.push({
        id: `shipping-${orderId}`,
        title: "Costo de envío",
        description: "Costo de envío",
        quantity: 1,
        currency_id: "COP" as const,
        unit_price: this.sanitizeUnitPrice(shippingCost),
        picture_url: undefined,
        category_id: "shipping",
      });
    }

    const baseUrl = frontendUrl.replace(/\/$/, "");
    const backUrls = {
      success: `${baseUrl}/checkout/success`,
      failure: `${baseUrl}/checkout/cancel`,
      pending: `${baseUrl}/checkout/pending`,
    };

    const payload = {
      external_reference: orderId,
      statement_descriptor: "ATUESTAMPA",
      items: preferenceItems,
      payer: {
        name: customer.firstName,
        surname: customer.lastName,
        email: customer.email,
        phone: { number: customer.phone },
      },
      metadata: { orderId },
      back_urls: backUrls,
      ...(frontendUrl.startsWith("https://") && { auto_return: "approved" as const }),
      notification_url: notificationUrl,
    };

    try {
      const response = await this.preferenceClient.create({ body: payload });
      return response;
    } catch (error: any) {
      const errorMessage =
        error.message || error.cause?.[0]?.description || "Failed to create payment preference";
      const errorDetails = {
        message: errorMessage,
        ...(error.cause && { cause: error.cause }),
        ...(error.status && { status: error.status }),
      };
      console.error("[Mercado Pago SDK Error]", JSON.stringify(errorDetails, null, 2));
      throw new Error(errorMessage);
    }
  }

  async getPaymentById(paymentId: string) {
    try {
      const response = await this.paymentClient.get({ id: paymentId });
      return response;
    } catch (error: any) {
      const errorMessage =
        error.message || error.cause?.[0]?.description || "Failed to retrieve payment";
      const errorDetails = {
        message: errorMessage,
        ...(error.cause && { cause: error.cause }),
        ...(error.status && { status: error.status }),
      };
      console.error("[Mercado Pago SDK Error]", JSON.stringify(errorDetails, null, 2));
      throw new Error(errorMessage);
    }
  }
}
