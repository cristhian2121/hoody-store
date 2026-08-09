import { Injectable } from "@nestjs/common";
import { Order, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  ApplyPaymentOutcome,
  OrderRepository,
  OrderWithItems,
  PaymentAttachment,
  PaymentResult,
  TERMINAL_ORDER_STATUSES,
} from "../interfaces/orders.repository.interface";

@Injectable()
export class OrdersRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<Order[]> {
    return this.prisma.order.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(id: string): Promise<Order | null> {
    return this.prisma.order.findUnique({ where: { id } });
  }

  async getByIdWithItems(id: string): Promise<OrderWithItems | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: { orderItems: { include: { designs: true }, orderBy: { createdAt: "asc" } } },
    });
  }

  async getByExternalReference(externalReference: string): Promise<Order | null> {
    return this.prisma.order.findUnique({ where: { id: externalReference } });
  }

  async create(data: Prisma.OrderCreateInput): Promise<Order> {
    // Los `create` anidados de Prisma corren en una sola transaccion: la orden,
    // sus lineas y sus disenos existen todos o no existe ninguno.
    return this.prisma.order.create({ data });
  }

  async attachPayment(id: string, payment: PaymentAttachment): Promise<Order | null> {
    try {
      return await this.prisma.order.update({
        where: { id },
        data: { payment: payment as unknown as Prisma.InputJsonValue },
      });
    } catch {
      return null;
    }
  }

  /**
   * `updateMany` con la guarda dentro del WHERE es una sola sentencia atomica:
   * Postgres bloquea la fila mientras la actualiza, asi que de dos entregas
   * concurrentes del webhook una gana y la otra no encuentra fila que cumpla la
   * condicion. Devuelve `applied: false` en ese caso.
   */
  async applyPaymentResult(id: string, result: PaymentResult): Promise<ApplyPaymentOutcome | null> {
    const current = await this.prisma.order.findUnique({ where: { id } });
    if (!current) return null;

    // El preferenceId y el initPoint se generaron al crear la orden y el
    // webhook no los trae; se conservan para no perder la trazabilidad del pago.
    const previousPayment = (current.payment as Record<string, unknown> | null) ?? {};
    const mergedPayment = { ...previousPayment, ...result.payment };

    const { count } = await this.prisma.order.updateMany({
      where: { id, status: { notIn: TERMINAL_ORDER_STATUSES } },
      data: {
        status: result.status,
        payment: mergedPayment as Prisma.InputJsonValue,
      },
    });

    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) return null;

    return { order, applied: count > 0 };
  }
}
