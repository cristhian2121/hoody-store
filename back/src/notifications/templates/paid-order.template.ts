import type { PaidOrderNotificationPayload } from "../adapters/notification-adapter.interface";

const formatCop = (value: number): string =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

/**
 * Recibo del cliente.
 *
 * HTML con estilos en linea y tabla de una columna a proposito: los clientes de
 * correo, sobre todo Gmail y Outlook, descartan `<style>` y no soportan flexbox
 * ni grid. Lo que aca parece anticuado es lo unico que se ve igual en todos.
 */
export const paidOrderEmail = (
  payload: PaidOrderNotificationPayload,
): { subject: string; html: string; text: string } => {
  const shortId = payload.orderId.slice(0, 8).toUpperCase();

  const rows = payload.items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;">
            <div style="font-weight:600;color:#111;">${escapeHtml(item.name)}</div>
            <div style="font-size:13px;color:#666;">
              Talla ${escapeHtml(item.size)} · ${escapeHtml(item.colorName)} · ${escapeHtml(item.gender)}
              ${item.personalized ? ' · <span style="color:#16a34a;">Personalizado</span>' : ""}
            </div>
            <div style="font-size:13px;color:#666;">Cantidad: ${item.quantity}</div>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;color:#111;">
            ${formatCop(item.unitPrice * item.quantity)}
          </td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;">
      <tr><td>
        <h1 style="margin:0 0 8px;font-size:22px;color:#111;">¡Gracias por tu compra, ${escapeHtml(payload.customerName)}!</h1>
        <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
          Recibimos tu pago y ya estamos preparando tu pedido
          <strong style="color:#111;">#${shortId}</strong>. Te avisamos cuando salga para tu dirección.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;font-size:14px;color:#555;">
          <tr>
            <td style="padding:4px 0;">Subtotal</td>
            <td style="padding:4px 0;text-align:right;">${formatCop(payload.subtotal)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;">Envío</td>
            <td style="padding:4px 0;text-align:right;">${formatCop(payload.shippingCost)}</td>
          </tr>
          <tr>
            <td style="padding:12px 0 0;font-size:17px;font-weight:700;color:#111;border-top:1px solid #eee;">Total</td>
            <td style="padding:12px 0 0;font-size:17px;font-weight:700;color:#111;text-align:right;border-top:1px solid #eee;">
              ${formatCop(payload.totalPaid)}
            </td>
          </tr>
        </table>

        <div style="margin-top:28px;padding:16px;background:#f9f9f9;border-radius:8px;font-size:14px;color:#555;line-height:1.6;">
          <div style="font-weight:600;color:#111;margin-bottom:4px;">Envío a</div>
          ${escapeHtml(payload.shippingAddress)}<br />
          ${escapeHtml(payload.city)}, ${escapeHtml(payload.department)}<br />
          ${escapeHtml(payload.country)}
        </div>

        <p style="margin:28px 0 0;font-size:13px;color:#888;line-height:1.5;">
          Si algo no cuadra, respondé este correo y lo resolvemos.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;

  // Los clientes que bloquean HTML y los lectores de pantalla usan esta version.
  const text = [
    `Gracias por tu compra, ${payload.customerName}.`,
    `Pedido #${shortId}`,
    "",
    ...payload.items.map(
      (item) =>
        `- ${item.name} (talla ${item.size}, ${item.colorName}) x${item.quantity} — ${formatCop(item.unitPrice * item.quantity)}`,
    ),
    "",
    `Subtotal: ${formatCop(payload.subtotal)}`,
    `Envío: ${formatCop(payload.shippingCost)}`,
    `Total: ${formatCop(payload.totalPaid)}`,
    "",
    `Envío a: ${payload.shippingAddress}, ${payload.city}, ${payload.department}, ${payload.country}`,
  ].join("\n");

  return { subject: `Tu pedido #${shortId} está confirmado`, html, text };
};
