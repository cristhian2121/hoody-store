import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  NotificationAdapter,
  PaidOrderNotificationPayload,
} from "./notification-adapter.interface";

@Injectable()
export class WhatsAppCloudNotificationAdapter implements NotificationAdapter {
  readonly channel = "whatsapp-cloud";
  private readonly logger = new Logger(WhatsAppCloudNotificationAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async sendPaidOrderNotification(payload: PaidOrderNotificationPayload): Promise<void> {
    const token = this.configService.get<string>("WHATSAPP_CLOUD_API_TOKEN");
    const phoneNumberId = this.configService.get<string>("WHATSAPP_CLOUD_PHONE_NUMBER_ID");
    const apiVersion = this.configService.get<string>("WHATSAPP_CLOUD_API_VERSION") || "v22.0";
    const toNumber =
      this.configService.get<string>("WHATSAPP_CLOUD_TO_NUMBER") || "+573000000000";

    if (!token || !phoneNumberId) {
      this.logger.warn(
        "WhatsApp Cloud API no configurada. Se omite notificación (placeholder activo).",
      );
      return;
    }

    const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    const body = {
      messaging_product: "whatsapp",
      to: toNumber,
      type: "text",
      text: {
        body: this.buildMessage(payload),
      },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WhatsApp Cloud API error (${response.status}): ${errorText}`);
    }
  }

  private buildMessage(payload: PaidOrderNotificationPayload): string {
    const itemsSummary = payload.items
      .slice(0, 5)
      .map((item) => `- ${item.name} x${item.quantity}`)
      .join("\n");

    return [
      `Nuevo pedido pagado #${payload.orderId}`,
      `Cliente: ${payload.customerName}`,
      `Email: ${payload.customerEmail || "N/A"}`,
      `Tel: ${payload.customerPhone || "N/A"}`,
      `Envío: ${payload.shippingAddress}, ${payload.city}, ${payload.department}, ${payload.country}`,
      `Costo envío: ${payload.shippingCost} ${payload.currency}`,
      `Total pagado: ${payload.totalPaid} ${payload.currency}`,
      "Productos:",
      itemsSummary || "- Sin detalle",
    ].join("\n");
  }
}
