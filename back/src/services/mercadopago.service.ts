import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

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
    items: Array<{
      productId: string;
      name: string;
      price: number;
      quantity: number;
      description?: string;
      image?: string;
      category?: string;
      size?: string;
    }>;
    shippingCost: number;
    frontendUrl: string;
    notificationUrl: string;
  }) {
    const preferenceItems = items.map((item) => ({
      id: item.productId,
      title: item.name,
      description: item.description || `${item.category} · ${item.size}`,
      quantity: item.quantity,
      currency_id: "COP" as const,
      unit_price: this.sanitizeUnitPrice(item.price),
      picture_url: item.image,
      category_id: item.category,
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
        error.message ||
        error.cause?.[0]?.description ||
        "Failed to create payment preference";
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
        error.message ||
        error.cause?.[0]?.description ||
        "Failed to retrieve payment";
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
