import { Test, TestingModule } from "@nestjs/testing";
import { OrdersService } from "../services/orders.service";
import { PaymentsService } from "../services/payments.service";
import { OrderRepository } from "../repositories/interfaces/orders.repository.interface";

describe("OrdersService", () => {
  let service: OrdersService;
  let orderRepository: jest.Mocked<OrderRepository>;
  let paymentsService: jest.Mocked<PaymentsService>;

  beforeEach(async () => {
    const mockOrderRepository = {
      list: jest.fn(),
      getById: jest.fn(),
      getByExternalReference: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockPaymentsService = {
      createPreference: jest.fn(),
      getPaymentById: jest.fn(),
      processWebhook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: "OrderRepository",
          useValue: mockOrderRepository,
        },
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get("OrderRepository");
    paymentsService = module.get<PaymentsService>(PaymentsService) as jest.Mocked<PaymentsService>;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("listOrders", () => {
    it("should return an array of orders", async () => {
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

      orderRepository.list.mockResolvedValue(mockOrders as any);

      const result = await service.listOrders();
      expect(result).toEqual(mockOrders);
      expect(orderRepository.list).toHaveBeenCalled();
    });
  });

  describe("getOrderById", () => {
    it("should return an order by id", async () => {
      const mockOrder = {
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
      };

      orderRepository.getById.mockResolvedValue(mockOrder as any);

      const result = await service.getOrderById("1");
      expect(result).toEqual(mockOrder);
      expect(orderRepository.getById).toHaveBeenCalledWith("1");
    });

    it("should return null if order not found", async () => {
      orderRepository.getById.mockResolvedValue(null);

      const result = await service.getOrderById("nonexistent");
      expect(result).toBeNull();
    });
  });
});
