import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  NotificationAdapter,
  PaidOrderNotificationPayload,
  PrintAssetsReadyPayload,
} from "./notification-adapter.interface";

/**
 * Avisos al COMERCIANTE por WhatsApp.
 *
 * Es un canal de conveniencia, no el primario: el admin es donde el dueno ve y
 * descarga todo. Si falta configuracion hace no-op con un warning.
 */
@Injectable()
export class WhatsAppCloudNotificationAdapter implements NotificationAdapter {
  readonly channel = "whatsapp-cloud";
  private readonly logger = new Logger(WhatsAppCloudNotificationAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  async sendPaidOrderNotification(payload: PaidOrderNotificationPayload): Promise<void> {
    await this.send(this.buildMessage(payload));
  }

  /**
   * Segundo aviso, cuando el arte queda listo para descargar.
   *
   * El link lleva un token firmado de un solo proposito y con expiracion, no el
   * token de admin: el mensaje puede reenviarse y Meta descarga el contenido
   * desde sus propios servidores.
   */
  async sendPrintAssetsReadyNotification(payload: PrintAssetsReadyPayload): Promise<void> {
    await this.send(
      [
        `Arte listo para el pedido #${payload.orderId.slice(0, 8).toUpperCase()}`,
        `Cliente: ${payload.customerName}`,
        `${payload.fileCount} archivo(s) para imprimir`,
        `Descarga (expira en ${payload.expiresInMinutes} min):`,
        payload.downloadUrl,
      ].join("\n"),
    );
  }

  private async send(text: string): Promise<void> {
    const token = this.configService.get<string>("WHATSAPP_CLOUD_API_TOKEN");
    const phoneNumberId = this.configService.get<string>("WHATSAPP_CLOUD_PHONE_NUMBER_ID");
    const apiVersion = this.configService.get<string>("WHATSAPP_CLOUD_API_VERSION") || "v22.0";
    const toNumber = this.configService.get<string>("WHATSAPP_CLOUD_TO_NUMBER");

    if (!token || !phoneNumberId || !toNumber || toNumber === "+573000000000") {
      this.logger.warn(
        "WhatsApp Cloud API sin configurar (o con el número placeholder). Se omite la notificación.",
      );
      return;
    }

    const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toNumber,
        type: "text",
        text: { body: text },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WhatsApp Cloud API error (${response.status}): ${errorText}`);
    }
  }

  private buildMessage(payload: PaidOrderNotificationPayload): string {
    const itemsSummary = payload.items
      .slice(0, 5)
      .map(
        (item) =>
          `- ${item.name} (${item.size} · ${item.colorName}) x${item.quantity}` +
          (item.personalized ? " [personalizado]" : ""),
      )
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
      payload.items.some((item) => item.personalized)
        ? "Incluye estampado: revisá la prueba en el admin antes de imprimir."
        : "",
    ].join("\n");
  }
}
