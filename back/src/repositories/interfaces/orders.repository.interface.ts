import { Order, OrderItem, OrderItemDesign, OrderStatus, Prisma } from "@prisma/client";

/** Orden con sus lineas y los lados estampados de cada una. */
export type OrderWithItems = Order & {
  orderItems: (OrderItem & { designs: OrderItemDesign[] })[];
};

/**
 * Estados de los que una orden no vuelve sola.
 *
 * `paid` porque Mercado Pago reintenta el webhook y una entrega tardia con
 * estado anterior no puede despagar una orden. `payment_review` porque significa
 * que el monto cobrado no coincidio con el total: lo resuelve una persona, no un
 * reintento.
 */
export const TERMINAL_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.paid,
  OrderStatus.payment_review,
];

export interface PaymentAttachment {
  provider: string;
  preferenceId: string | null;
  initPoint: string | null;
  status: string;
}

export interface PaymentResult {
  status: OrderStatus;
  payment: Record<string, unknown>;
}

export interface ApplyPaymentOutcome {
  order: Order;
  /**
   * Falso cuando la orden ya estaba en un estado terminal y no se toco. Es lo
   * que evita notificar dos veces al recibir el mismo webhook repetido.
   */
  applied: boolean;
}

export interface OrderRepository {
  list(): Promise<Order[]>;
  getById(id: string): Promise<Order | null>;

  /**
   * La orden con sus lineas tipadas. Es lo que necesitan las notificaciones y el
   * admin: la columna Json heredada obligaba a coercionar cada campo a mano.
   */
  getByIdWithItems(id: string): Promise<OrderWithItems | null>;

  getByExternalReference(externalReference: string): Promise<Order | null>;

  /**
   * Crea la orden con sus lineas y sus disenos en una sola transaccion. Una
   * orden a medias —cobrada pero sin saber que imprimir— no es un estado del
   * que se pueda salir.
   */
  create(data: Prisma.OrderCreateInput): Promise<Order>;

  attachPayment(id: string, payment: PaymentAttachment): Promise<Order | null>;

  /**
   * Aplica el resultado de un pago respetando los estados terminales.
   * Reemplaza al viejo leer-modificar-escribir sin transaccion, con el que dos
   * entregas concurrentes del mismo webhook se pisaban.
   */
  applyPaymentResult(id: string, result: PaymentResult): Promise<ApplyPaymentOutcome | null>;
}
