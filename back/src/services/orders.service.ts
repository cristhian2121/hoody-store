import { Injectable, Inject } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { OrderRepository } from "../repositories/interfaces/orders.repository.interface";
import { PaymentsService } from "./payments.service";
import { CheckoutDto } from "../api/dto/checkout.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class OrdersService {
  constructor(
    @Inject("OrderRepository") private readonly orderRepository: OrderRepository,
    private readonly paymentsService: PaymentsService,
  ) {}

  async createOrderWithCheckout(checkoutData: CheckoutDto) {
    const orderId = randomUUID();
    const createdAt = new Date().toISOString();
    const shippingCost = Number(checkoutData.shippingCost || 0);

    // Validate and normalize items
    const items = checkoutData.items.map((item) => ({
      ...item,
      price: Number(item.price),
      quantity: Number(item.quantity),
    }));

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal + shippingCost;

    // Create order
    const orderData: Prisma.OrderCreateInput = {
      id: orderId,
      createdAt: new Date(createdAt),
      updatedAt: new Date(createdAt),
      status: "checkout_created",
      paymentProvider: "mercadopago",
      customer: checkoutData.customer as any,
      shipping: {
        ...checkoutData.shipping,
        cost: shippingCost,
      } as any,
      totals: {
        subtotal,
        shipping: shippingCost,
        total,
        currency: "COP",
      } as any,
      items: items as any,
      payment: Prisma.JsonNull,
    };

    const order = await this.orderRepository.create(orderData);

    // Create payment preference
    const preference = await this.paymentsService.createPreference({
      orderId,
      customer: checkoutData.customer,
      items,
      shippingCost,
    });

    // Update order with payment info
    const updatedOrder = await this.orderRepository.update(order.id, (current) => ({
      ...current,
      updatedAt: new Date(),
      payment: {
        provider: "mercadopago",
        preferenceId: preference.id,
        initPoint: preference.init_point,
        status: "pending",
      } as any,
    }));

    if (!updatedOrder) {
      throw new Error("Failed to update order with payment information");
    }

    return {
      order: updatedOrder,
      checkoutUrl: preference.init_point,
    };
  }

  async listOrders() {
    return this.orderRepository.list();
  }

  async getOrderById(id: string) {
    return this.orderRepository.getById(id);
  }
}
