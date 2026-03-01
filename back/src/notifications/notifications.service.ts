import { Inject, Injectable, Logger } from "@nestjs/common";
import { Order } from "@prisma/client";
import { NOTIFICATION_ADAPTERS } from "./notification.tokens";
import {
  NotificationAdapter,
  PaidOrderNotificationPayload,
} from "./adapters/notification-adapter.interface";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(NOTIFICATION_ADAPTERS)
    private readonly adapters: NotificationAdapter[],
  ) {}

  async notifyPaidOrder(order: Order): Promise<void> {
    const payload = this.buildPayload(order);

    for (const adapter of this.adapters) {
      try {
        await adapter.sendPaidOrderNotification(payload);
      } catch (error: any) {
        this.logger.error(
          `No se pudo enviar notificación por ${adapter.channel}: ${error?.message || error}`,
        );
      }
    }
  }

  private buildPayload(order: Order): PaidOrderNotificationPayload {
    const customer = this.asRecord(order.customer);
    const shipping = this.asRecord(order.shipping);
    const totals = this.asRecord(order.totals);
    const items = Array.isArray(order.items) ? order.items : [];

    return {
      orderId: order.id,
      customerName: [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || "Cliente",
      customerPhone: this.asOptionalString(customer.phone),
      customerEmail: this.asOptionalString(customer.email),
      shippingAddress: this.asOptionalString(shipping.address) || "Sin dirección",
      department: this.asOptionalString(shipping.department) || "Sin departamento",
      city: this.asOptionalString(shipping.city) || "Sin ciudad",
      country: this.asOptionalString(shipping.country) || "Colombia",
      shippingCost: this.asNumber(shipping.cost),
      totalPaid: this.asNumber((totals.totalPaid ?? totals.total) as unknown),
      currency: this.asOptionalString(totals.currency) || "COP",
      items: items.map((item: unknown) => {
        const product = this.asRecord(item);
        return {
          name: this.asOptionalString(product.name) || "Producto",
          quantity: Math.max(1, this.asNumber(product.quantity)),
        };
      }),
    };
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private asOptionalString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private asNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
