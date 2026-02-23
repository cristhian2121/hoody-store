import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { OrderRepository } from "../interfaces/orders.repository.interface";
import { Order, Prisma } from "@prisma/client";

@Injectable()
export class OrdersRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<Order[]> {
    return this.prisma.order.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getById(id: string): Promise<Order | null> {
    return this.prisma.order.findUnique({
      where: { id },
    });
  }

  async getByExternalReference(externalReference: string): Promise<Order | null> {
    const orders = await this.prisma.order.findMany({
      where: {
        id: externalReference,
      },
    });
    return orders[0] || null;
  }

  async create(data: Prisma.OrderCreateInput): Promise<Order> {
    return this.prisma.order.create({
      data,
    });
  }

  async update(
    id: string,
    updater: ((current: Order) => Order) | Partial<Order>,
  ): Promise<Order | null> {
    const current = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!current) {
      return null;
    }

    const updated = typeof updater === "function" ? updater(current) : { ...current, ...updater };

    return this.prisma.order.update({
      where: { id },
      data: {
        updatedAt: updated.updatedAt ? new Date(updated.updatedAt) : undefined,
        status: updated.status,
        paymentProvider: updated.paymentProvider ?? current.paymentProvider,
        customer: updated.customer ?? current.customer,
        shipping: updated.shipping ?? current.shipping,
        totals: updated.totals ?? current.totals,
        items: updated.items ?? current.items,
        payment: updated.payment ?? current.payment,
      },
    });
  }
}
