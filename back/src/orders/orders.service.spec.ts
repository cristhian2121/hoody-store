import { Test, TestingModule } from "@nestjs/testing";
import { OrdersService } from "../services/orders.service";
import { PaymentsService } from "../services/payments.service";
import { OrderRepository } from "../repositories/interfaces/orders.repository.interface";
import { ShippingService } from "../shipping/shipping.service";

describe("OrdersService", () => {
  let service: OrdersService;
  let orderRepository: jest.Mocked<OrderRepository>;
  let paymentsService: jest.Mocked<PaymentsService>;
  let shippingService: jest.Mocked<ShippingService>;

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

    const mockShippingService = {
      calculateQuote: jest.fn(),
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
        {
          provide: ShippingService,
          useValue: mockShippingService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get("OrderRepository");
    paymentsService = module.get<PaymentsService>(PaymentsService) as jest.Mocked<PaymentsService>;
    shippingService = module.get<ShippingService>(ShippingService) as jest.Mocked<ShippingService>;
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

  describe("createOrderWithCheckout", () => {
    it("should calculate shipping on backend and include it in total/preference", async () => {
      const dto = {
        items: [
          {
            productId: "prod-1",
            name: "Hoodie",
            price: 60000,
            quantity: 2,
          },
        ],
        customer: {
          firstName: "Ana",
          lastName: "Pérez",
          email: "ana@example.com",
          phone: "3000000000",
        },
        shipping: {
          countryCode: "CO",
          departmentCode: "11",
          cityCode: "11001",
          address: "Calle 123 #45-67",
          postalCode: "110111",
        },
      };

      shippingService.calculateQuote.mockResolvedValue({
        country: { code: "CO", name: "Colombia" },
        department: { code: "11", name: "Bogotá D.C." },
        city: { code: "11001", name: "Bogotá" },
        amount: 20000,
        currency: "COP",
        provider: "fixed-default",
        calculatedAt: new Date().toISOString(),
      });

      orderRepository.create.mockImplementation(async (data: any) => ({
        id: data.id,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        status: data.status,
        paymentProvider: data.paymentProvider,
        customer: data.customer,
        shipping: data.shipping,
        totals: data.totals,
        items: data.items,
        payment: data.payment,
      }));

      paymentsService.createPreference.mockResolvedValue({
        id: "pref-1",
        init_point: "https://mp.test/checkout",
      } as any);

      orderRepository.update.mockImplementation(async (id: string, updater: any) => {
        const baseOrder = {
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: "checkout_created",
          paymentProvider: "mercadopago",
          customer: dto.customer,
          shipping: {},
          totals: {},
          items: dto.items,
          payment: null,
        };
        return typeof updater === "function" ? updater(baseOrder as any) : ({ ...baseOrder, ...updater } as any);
      });

      const result = await service.createOrderWithCheckout(dto as any);

      expect(shippingService.calculateQuote).toHaveBeenCalledWith({
        countryCode: "CO",
        departmentCode: "11",
        cityCode: "11001",
      });
      expect(paymentsService.createPreference).toHaveBeenCalledWith(
        expect.objectContaining({
          shippingCost: 20000,
        }),
      );
      expect(result.checkoutUrl).toEqual("https://mp.test/checkout");
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
