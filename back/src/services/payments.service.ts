import { Injectable, Inject, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Order, OrderStatus } from "@prisma/client";
import { OrderRepository } from "../repositories/interfaces/orders.repository.interface";
import { MercadoPagoService, PreferenceLineItem } from "./mercadopago.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  PRINT_ASSETS_REPOSITORY,
  PrintAssetsRepository,
} from "../repositories/interfaces/print-assets.repository.interface";
import { ORDER_CURRENCY } from "./orders.service";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject("OrderRepository") private readonly orderRepository: OrderRepository,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    @Inject(PRINT_ASSETS_REPOSITORY) private readonly printAssets: PrintAssetsRepository,
  ) {}

  async createPreference({
    orderId,
    customer,
    items,
    shippingCost,
  }: {
    orderId: string;
    customer: { firstName: string; lastName: string; email: string; phone: string };
    items: PreferenceLineItem[];
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
    const payment = await this.getPaymentById(paymentId);

    if (!payment.external_reference) {
      throw new Error("Payment missing external_reference");
    }

    const order = await this.orderRepository.getByExternalReference(payment.external_reference);
    if (!order) {
      throw new Error(`Order not found for external reference: ${payment.external_reference}`);
    }

    if (!payment.status) {
      throw new Error("Payment missing status");
    }

    const status = this.resolveStatus(order, payment);

    const outcome = await this.orderRepository.applyPaymentResult(order.id, {
      status,
      payment: {
        provider: "mercadopago",
        paymentId: String(payment.id),
        status: payment.status,
        statusDetail: payment.status_detail,
        paidAt: payment.date_approved || null,
        transactionAmount: Number(payment.transaction_amount),
        currency: payment.currency_id || ORDER_CURRENCY,
      },
    });

    if (!outcome) {
      throw new Error("Failed to update order");
    }

    // `applied` es falso cuando la orden ya estaba en un estado terminal, o sea
    // cuando este webhook es un reintento del mismo pago. Notificar ahi seria
    // mandarle al dueno el mismo pedido dos veces.
    if (outcome.applied && status === OrderStatus.paid) {
      // Solo las ordenes pagadas necesitan arte. Se encola aqui y no se
      // renderiza en linea: Mercado Pago reintenta el webhook ante una respuesta
      // lenta, y renderizar un PNG de decenas de MB dentro de la peticion
      // garantizaria hacerlo dos veces.
      await this.enqueuePrintAssets(outcome.order.id);

      // Se relee con las lineas para que el recibo pueda mostrar talla, color y
      // precio unitario en vez de un nombre suelto.
      const withItems = await this.orderRepository.getByIdWithItems(outcome.order.id);
      if (withItems) {
        await this.notificationsService.notifyPaidOrder(withItems);
      }
    }

    return outcome.order;
  }

  /**
   * Encolar no puede tumbar el webhook.
   *
   * Si Mercado Pago no recibe un 200 vuelve a intentar, y en el reintento la
   * orden ya estaria en estado terminal: no se notificaria y el cliente se
   * quedaria sin recibo por un fallo de la cola. Se registra el error y el arte
   * se puede reencolar despues desde el admin.
   */
  private async enqueuePrintAssets(orderId: string): Promise<void> {
    try {
      const queued = await this.printAssets.enqueueForOrder(orderId);
      if (queued > 0) {
        this.logger.log(`Encolados ${queued} archivos de impresion para la orden ${orderId}`);
      }
    } catch (error) {
      this.logger.error(
        `No se pudo encolar el arte de la orden ${orderId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Traduce el estado de Mercado Pago y, cuando dice aprobado, comprueba que lo
   * cobrado sea lo que la orden decia.
   *
   * Antes esto hacia lo contrario de verificar: sobrescribia `totals.totalPaid`
   * con lo que reportara Mercado Pago, con lo cual un monto manipulado quedaba
   * registrado como si fuera el correcto. Ahora un desajuste no marca la orden
   * como pagada ni dispara notificaciones: queda en `payment_review` para que la
   * mire una persona.
   */
  private resolveStatus(
    order: Order,
    payment: {
      status?: string | null;
      transaction_amount?: number | null;
      currency_id?: string | null;
    },
  ): OrderStatus {
    const status = this.mapMercadoPagoStatus(payment.status as string);
    if (status !== OrderStatus.paid) return status;

    const totals = (order.totals as Record<string, unknown> | null) ?? {};
    const expected = Number(totals.total);
    const charged = Number(payment.transaction_amount);
    const currency = payment.currency_id || ORDER_CURRENCY;

    const amountsMatch =
      Number.isFinite(expected) &&
      Number.isFinite(charged) &&
      Math.round(charged) === Math.round(expected);

    if (!amountsMatch || currency !== ORDER_CURRENCY) {
      this.logger.error(
        `Pago con monto o moneda inesperados en la orden ${order.id}: ` +
          `esperado ${expected} ${ORDER_CURRENCY}, cobrado ${charged} ${currency}. ` +
          "Queda en revision y no se notifica.",
      );
      return OrderStatus.payment_review;
    }

    return OrderStatus.paid;
  }

  // El tipo de retorno es OrderStatus, no string: la columna es un enum de
  // Postgres y un valor fuera de el reventaria en runtime al escribir. Asi lo
  // atrapa el compilador.
  private mapMercadoPagoStatus(paymentStatus: string): OrderStatus {
    switch (paymentStatus) {
      case "approved":
        return OrderStatus.paid;
      case "in_process":
      case "pending":
      case "authorized":
        return OrderStatus.payment_pending;
      case "cancelled":
      case "rejected":
      case "refunded":
      case "charged_back":
        return OrderStatus.payment_failed;
      default:
        return OrderStatus.payment_unknown;
    }
  }
}
