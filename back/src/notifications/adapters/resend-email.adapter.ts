import { Injectable, Logger } from "@nestjs/common";
import {
  NotificationAdapter,
  PaidOrderNotificationPayload,
} from "./notification-adapter.interface";
import { paidOrderEmail } from "../templates/paid-order.template";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Correo al cliente vía Resend.
 *
 * Resend y no SMTP porque es un POST HTTP: sin conexiones persistentes, sin
 * puertos bloqueados por el proveedor de hosting y sin una dependencia mas.
 *
 * A diferencia del canal de WhatsApp, este le escribe al COMPRADOR. Cada adapter
 * conoce su propia audiencia; por eso el payload no lleva un campo `audience`.
 */
@Injectable()
export class ResendEmailNotificationAdapter implements NotificationAdapter {
  readonly channel = "email";
  private readonly logger = new Logger(ResendEmailNotificationAdapter.name);

  private config() {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    return { apiKey, from };
  }

  async sendPaidOrderNotification(payload: PaidOrderNotificationPayload): Promise<void> {
    const { apiKey, from } = this.config();

    // Sin credenciales avisa y sigue: el webhook tiene que devolver 200 igual, y
    // que no salga el recibo no puede dejar la orden sin confirmar.
    if (!apiKey || !from) {
      this.logger.warn(
        `RESEND_API_KEY o RESEND_FROM_EMAIL sin configurar: no se envió el recibo de la orden ${payload.orderId}.`,
      );
      return;
    }

    if (!payload.customerEmail) {
      this.logger.warn(`La orden ${payload.orderId} no tiene correo del cliente.`);
      return;
    }

    const { subject, html, text } = paidOrderEmail(payload);

    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [payload.customerEmail],
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Resend respondió ${response.status}: ${detail.slice(0, 300)}`);
    }

    this.logger.log(`Recibo enviado a ${payload.customerEmail} por la orden ${payload.orderId}`);
  }
}
