import { Order, Prisma } from "@prisma/client";

export interface OrderRepository {
  list(): Promise<Order[]>;
  getById(id: string): Promise<Order | null>;
  getByExternalReference(externalReference: string): Promise<Order | null>;
  create(data: Prisma.OrderCreateInput): Promise<Order>;
  update(id: string, updater: ((current: Order) => Order) | Partial<Order>): Promise<Order | null>;
}
