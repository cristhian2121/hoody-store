import { Test, TestingModule } from "@nestjs/testing";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "../services/orders.service";

describe("OrdersController", () => {
  let controller: OrdersController;
  let service: jest.Mocked<OrdersService>;

  beforeEach(async () => {
    const mockService = {
      createOrderWithCheckout: jest.fn(),
      listOrders: jest.fn(),
      getOrderById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get(OrdersService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("checkout", () => {
    it("should create an order and return checkout URL", async () => {
      const checkoutDto = {
        items: [
          {
            productId: "1",
            name: "Test Product",
            price: 100,
            quantity: 1,
          },
        ],
        customer: {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phone: "1234567890",
        },
        shipping: {
          city: "Bogotá",
          department: "Cundinamarca",
        },
      };

      const mockResult = {
        order: {
          id: "order-123",
          createdAt: new Date(),
          updatedAt: new Date(),
          status: "checkout_created",
          paymentProvider: "mercadopago",
          customer: {},
          shipping: {},
          totals: {},
          items: [],
          payment: null,
        },
        checkoutUrl: "https://checkout.mercadopago.com/...",
      };

      service.createOrderWithCheckout.mockResolvedValue(mockResult as any);

      const result = await controller.checkout(checkoutDto as any);
      expect(result).toEqual({
        orderId: "order-123",
        checkoutUrl: "https://checkout.mercadopago.com/...",
      });
      expect(service.createOrderWithCheckout).toHaveBeenCalledWith(checkoutDto);
    });
  });

  describe("list", () => {
    it("should return a list of orders", async () => {
      const mockOrders = [
        {
          id: "1",
          createdAt: new Date(),
          updatedAt: new Date(),
          status: "paid",
          paymentProvider: "mercadopago",
          customer: {},
          shipping: {},
          totals: {},
          items: [],
          payment: null,
        },
      ];

      service.listOrders.mockResolvedValue(mockOrders as any);

      const result = await controller.list();
      expect(result).toEqual({ orders: mockOrders });
      expect(service.listOrders).toHaveBeenCalled();
    });
  });
});
