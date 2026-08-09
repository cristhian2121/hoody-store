import { Inject, Injectable, Logger } from "@nestjs/common";
import { NOTIFICATION_ADAPTERS } from "./notification.tokens";
import {
  NotificationAdapter,
  PaidOrderNotificationPayload,
  PrintAssetsReadyPayload,
} from "./adapters/notification-adapter.interface";
import type { OrderWithItems } from "../repositories/interfaces/orders.repository.interface";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(NOTIFICATION_ADAPTERS)
    private readonly adapters: NotificationAdapter[],
  ) {}

  async notifyPaidOrder(order: OrderWithItems): Promise<void> {
    const payload = this.buildPayload(order);

    for (const adapter of this.adapters) {
      try {
        await adapter.sendPaidOrderNotification(payload);
      } catch (error) {
        // Un canal caido no puede impedir que respondamos 200 al webhook: si
        // Mercado Pago no recibe el 200 reintenta, y el reintento encuentra la
        // orden ya en estado terminal.
        this.logger.error(
          `No se pudo enviar notificación por ${adapter.channel}: ${(error as Error)?.message || error}`,
        );
      }
    }
  }

  async notifyPrintAssetsReady(payload: PrintAssetsReadyPayload): Promise<void> {
    for (const adapter of this.adapters) {
      if (!adapter.sendPrintAssetsReadyNotification) continue;
      try {
        await adapter.sendPrintAssetsReadyNotification(payload);
      } catch (error) {
        this.logger.error(
          `No se pudo avisar del arte por ${adapter.channel}: ${(error as Error)?.message || error}`,
        );
      }
    }
  }

  /**
   * Arma el payload desde columnas tipadas.
   *
   * Antes esto era un bloque de `asRecord`/`asNumber`/`asOptionalString` sobre la
   * columna Json `items`, porque no habia forma de saber que traia. Con las
   * lineas normalizadas en su propia tabla, el compilador garantiza los campos y
   * el correo puede mostrar talla, color y precio unitario sin adivinar.
   */
  private buildPayload(order: OrderWithItems): PaidOrderNotificationPayload {
    const customer = this.asRecord(order.customer);
    const shipping = this.asRecord(order.shipping);
    const totals = this.asRecord(order.totals);

    return {
      orderId: order.id,
      customerName:
        [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || "Cliente",
      customerPhone: this.asOptionalString(customer.phone),
      customerEmail: this.asOptionalString(customer.email),
      shippingAddress: this.asOptionalString(shipping.address) || "Sin dirección",
      department: this.asOptionalString(shipping.department) || "Sin departamento",
      city: this.asOptionalString(shipping.city) || "Sin ciudad",
      country: this.asOptionalString(shipping.country) || "Colombia",
      shippingCost: this.asNumber(shipping.cost),
      subtotal: this.asNumber(totals.subtotal),
      totalPaid: this.asNumber(totals.total),
      currency: this.asOptionalString(totals.currency) || "COP",
      items: order.orderItems.map((item) => ({
        name: item.productNameEs,
        quantity: item.quantity,
        unitPrice: item.unitPriceCop,
        size: item.size,
        colorName: item.colorNameEs,
        gender: item.gender,
        personalized: item.designs.length > 0,
      })),
    };
  }

  // `customer`, `shipping` y `totals` siguen siendo Json: son datos del momento
  // de la compra que no se consultan por campo y no justifican una tabla.
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
