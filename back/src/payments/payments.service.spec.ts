import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { PaymentsService } from "../services/payments.service";
import { OrderRepository } from "../repositories/interfaces/orders.repository.interface";
import { MercadoPagoService } from "../services/mercadopago.service";
import { NotificationsService } from "../notifications/notifications.service";

describe("PaymentsService", () => {
  let service: PaymentsService;
  let orderRepository: jest.Mocked<OrderRepository>;
  let mercadoPagoService: jest.Mocked<MercadoPagoService>;
  let notificationsService: jest.Mocked<NotificationsService>;

  beforeEach(async () => {
    const mockOrderRepository = {
      list: jest.fn(),
      getById: jest.fn(),
      getByExternalReference: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockMercadoPagoService = {
      createPreference: jest.fn(),
      getPaymentById: jest.fn(),
    };

    const mockNotificationsService = {
      notifyPaidOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: "OrderRepository",
          useValue: mockOrderRepository,
        },
        {
          provide: MercadoPagoService,
          useValue: mockMercadoPagoService,
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    orderRepository = module.get("OrderRepository");
    mercadoPagoService = module.get<MercadoPagoService>(MercadoPagoService) as jest.Mocked<MercadoPagoService>;
    notificationsService = module.get<NotificationsService>(NotificationsService) as jest.Mocked<NotificationsService>;
  });

  it("should mark order as paid and send notification on approved payment", async () => {
    mercadoPagoService.getPaymentById.mockResolvedValue({
      id: 1001,
      external_reference: "order-1",
      status: "approved",
      status_detail: "accredited",
      date_approved: "2026-03-01T10:00:00.000Z",
      transaction_amount: 120000,
      currency_id: "COP",
    } as any);

    orderRepository.getByExternalReference.mockResolvedValue({
      id: "order-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "checkout_created",
      paymentProvider: "mercadopago",
      customer: {},
      shipping: {},
      totals: { total: 120000, currency: "COP" },
      items: [],
      payment: null,
    } as any);

    orderRepository.update.mockImplementation(async (id: string, updater: any) => {
      const current = {
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "checkout_created",
        paymentProvider: "mercadopago",
        customer: {},
        shipping: {},
        totals: { total: 120000, currency: "COP" },
        items: [],
        payment: null,
      };
      return typeof updater === "function" ? (updater(current as any) as any) : ({ ...current, ...updater } as any);
    });

    const result = await service.processWebhook("1001");

    expect(result.status).toEqual("paid");
    expect(notificationsService.notifyPaidOrder).toHaveBeenCalledTimes(1);
    expect(notificationsService.notifyPaidOrder).toHaveBeenCalledWith(
      expect.objectContaining({ id: "order-1" }),
    );
  });

  it("should not send duplicate notification when order was already paid", async () => {
    mercadoPagoService.getPaymentById.mockResolvedValue({
      id: 1002,
      external_reference: "order-2",
      status: "approved",
      status_detail: "accredited",
      date_approved: "2026-03-01T10:00:00.000Z",
      transaction_amount: 90000,
      currency_id: "COP",
    } as any);

    orderRepository.getByExternalReference.mockResolvedValue({
      id: "order-2",
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "paid",
      paymentProvider: "mercadopago",
      customer: {},
      shipping: {},
      totals: { total: 90000, currency: "COP" },
      items: [],
      payment: null,
    } as any);

    orderRepository.update.mockResolvedValue({
      id: "order-2",
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "paid",
      paymentProvider: "mercadopago",
      customer: {},
      shipping: {},
      totals: { total: 90000, currency: "COP" },
      items: [],
      payment: null,
    } as any);

    await service.processWebhook("1002");

    expect(notificationsService.notifyPaidOrder).not.toHaveBeenCalled();
  });
});
