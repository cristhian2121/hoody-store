import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OrderRepository } from "../repositories/interfaces/orders.repository.interface";
import { MercadoPagoService } from "./mercadopago.service";

@Injectable()
export class PaymentsService {
  constructor(
    @Inject("OrderRepository") private readonly orderRepository: OrderRepository,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly configService: ConfigService,
  ) {}

  async createPreference({
    orderId,
    customer,
    items,
    shippingCost,
  }: {
    orderId: string;
    customer: { firstName: string; lastName: string; email: string; phone: string };
    items: Array<{ price: number; quantity: number; [key: string]: any }>;
    shippingCost: number;
  }) {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") || "http://localhost:8080";
    const backendUrl = this.configService.get<string>("BACKEND_URL") || "http://localhost:4242";

    return this.mercadoPagoService.createPreference({
      orderId,
      customer,
      items,
      shippingCost,
      frontendUrl,
      notificationUrl: `${backendUrl}/api/payments/mercadopago/webhook`,
    });
  }

  async getPaymentById(paymentId: string) {
    return this.mercadoPagoService.getPaymentById(paymentId);
  }

  async processWebhook(paymentId: string) {
    // Get payment from Mercado Pago
    const payment = await this.getPaymentById(paymentId);

    if (!payment.external_reference) {
      throw new Error("Payment missing external_reference");
    }

    // Find order by external reference
    const order = await this.orderRepository.getByExternalReference(payment.external_reference);

    if (!order) {
      throw new Error(`Order not found for external reference: ${payment.external_reference}`);
    }

    // Map Mercado Pago status to internal status
    const status = this.mapMercadoPagoStatus(payment.status);

    // Update order
    const updatedOrder = await this.orderRepository.update(order.id, (current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      status,
      payment: {
        ...(current.payment || {}),
        provider: "mercadopago",
        paymentId: String(payment.id),
        status: payment.status,
        statusDetail: payment.status_detail,
        paidAt: payment.date_approved || null,
      } as any,
    }));

    if (!updatedOrder) {
      throw new Error("Failed to update order");
    }

    return updatedOrder;
  }

  private mapMercadoPagoStatus(paymentStatus: string): string {
    switch (paymentStatus) {
      case "approved":
        return "paid";
      case "in_process":
      case "pending":
      case "authorized":
        return "payment_pending";
      case "cancelled":
      case "rejected":
      case "refunded":
      case "charged_back":
        return "payment_failed";
      default:
        return "payment_unknown";
    }
  }
}
