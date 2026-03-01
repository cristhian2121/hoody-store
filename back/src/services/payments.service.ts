import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OrderRepository } from "../repositories/interfaces/orders.repository.interface";
import { MercadoPagoService } from "./mercadopago.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class PaymentsService {
  constructor(
    @Inject("OrderRepository") private readonly orderRepository: OrderRepository,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createPreference({
    orderId,
    customer,
    items,
    shippingCost,
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
    if (!payment.status) {
      throw new Error("Payment missing status");
    }
    const status = this.mapMercadoPagoStatus(payment.status);
    const wasPaid = order.status === "paid";

    // Update order
    const updatedOrder = await this.orderRepository.update(order.id, (current: any) => {
      const currentTotals = (current.totals as Record<string, unknown>) || {};
      const approvedAmount = Number(payment.transaction_amount);
      const paidAmount =
        Number.isFinite(approvedAmount) && approvedAmount >= 0
          ? approvedAmount
          : Number(currentTotals.total || 0);

      return {
        ...current,
        updatedAt: new Date(),
        status,
        totals: {
          ...currentTotals,
          ...(status === "paid" && {
            totalPaid: paidAmount,
            currency: payment.currency_id || currentTotals.currency || "COP",
          }),
        } as any,
        payment: {
          ...((current.payment as Record<string, unknown>) || {}),
          provider: "mercadopago",
          paymentId: String(payment.id),
          status: payment.status,
          statusDetail: payment.status_detail,
          paidAt: payment.date_approved || null,
          transactionAmount: paidAmount,
          currency: payment.currency_id || "COP",
        } as any,
      };
    });

    if (!updatedOrder) {
      throw new Error("Failed to update order");
    }

    if (status === "paid" && !wasPaid) {
      await this.notificationsService.notifyPaidOrder(updatedOrder);
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
