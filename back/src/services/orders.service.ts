import { Injectable, Inject } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { OrderRepository } from "../repositories/interfaces/orders.repository.interface";
import { PaymentsService } from "./payments.service";
import { CheckoutDto } from "../api/dto/checkout.dto";
import { Prisma } from "@prisma/client";
import { ShippingService } from "../shipping/shipping.service";

@Injectable()
export class OrdersService {
  constructor(
    @Inject("OrderRepository") private readonly orderRepository: OrderRepository,
    private readonly paymentsService: PaymentsService,
    private readonly shippingService: ShippingService,
  ) {}

  async createOrderWithCheckout(checkoutData: CheckoutDto) {
    const orderId = randomUUID();
    const createdAt = new Date().toISOString();

    // Validate and normalize items
    const items = checkoutData.items.map((item) => ({
      ...item,
      price: Number(item.price),
      quantity: Number(item.quantity),
    }));

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingQuote = await this.shippingService.calculateQuote({
      countryCode: checkoutData.shipping.countryCode,
      departmentCode: checkoutData.shipping.departmentCode,
      cityCode: checkoutData.shipping.cityCode,
    });
    const shippingCost = shippingQuote.amount;
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
        countryCode: shippingQuote.country.code,
        country: shippingQuote.country.name,
        departmentCode: shippingQuote.department.code,
        department: shippingQuote.department.name,
        cityCode: shippingQuote.city.code,
        city: shippingQuote.city.name,
        address: checkoutData.shipping.address,
        postalCode: checkoutData.shipping.postalCode ?? null,
        cost: shippingCost,
        currency: shippingQuote.currency,
        pricingProvider: shippingQuote.provider,
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
    const updatedOrder = await this.orderRepository.update(order.id, (current: any) => ({
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
