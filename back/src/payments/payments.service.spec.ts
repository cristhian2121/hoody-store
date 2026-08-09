import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { Order, OrderStatus } from "@prisma/client";
import { PaymentsService } from "../services/payments.service";
import {
  ApplyPaymentOutcome,
  OrderRepository,
  PaymentResult,
} from "../repositories/interfaces/orders.repository.interface";
import { MercadoPagoService } from "../services/mercadopago.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PRINT_ASSETS_REPOSITORY } from "../repositories/interfaces/print-assets.repository.interface";

const order = (overrides: Partial<Order> = {}): Order =>
  ({
    id: "order-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    status: OrderStatus.checkout_created,
    paymentProvider: "mercadopago",
    customer: {},
    shipping: {},
    totals: { subtotal: 100000, shipping: 20000, total: 120000, currency: "COP" },
    items: [],
    payment: null,
    ...overrides,
  }) as Order;

const approvedPayment = (overrides: Record<string, unknown> = {}) => ({
  id: 1001,
  external_reference: "order-1",
  status: "approved",
  status_detail: "accredited",
  date_approved: "2026-03-01T10:00:00.000Z",
  transaction_amount: 120000,
  currency_id: "COP",
  ...overrides,
});

describe("PaymentsService.processWebhook", () => {
  let service: PaymentsService;
  let orderRepository: jest.Mocked<OrderRepository>;
  let mercadoPagoService: jest.Mocked<MercadoPagoService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let printAssets: { enqueueForOrder: jest.Mock };
  let applied: PaymentResult | undefined;

  beforeEach(async () => {
    applied = undefined;
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);

    const mockOrderRepository = {
      list: jest.fn(),
      getById: jest.fn(),
      getByExternalReference: jest.fn(),
      // Se relee con las lineas para armar el recibo del cliente.
      getByIdWithItems: jest.fn(async (id: string) => ({ ...order({ id }), orderItems: [] })),
      create: jest.fn(),
      attachPayment: jest.fn(),
      applyPaymentResult: jest.fn(
        async (id: string, result: PaymentResult): Promise<ApplyPaymentOutcome> => {
          applied = result;
          return { order: order({ id, status: result.status }), applied: true };
        },
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: "OrderRepository", useValue: mockOrderRepository },
        {
          provide: MercadoPagoService,
          useValue: { createPreference: jest.fn(), getPaymentById: jest.fn() },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: NotificationsService, useValue: { notifyPaidOrder: jest.fn() } },
        {
          provide: PRINT_ASSETS_REPOSITORY,
          useValue: { enqueueForOrder: jest.fn(async () => 1) },
        },
      ],
    }).compile();

    service = module.get(PaymentsService);
    orderRepository = module.get("OrderRepository");
    mercadoPagoService = module.get(MercadoPagoService);
    notificationsService = module.get(NotificationsService);
    printAssets = module.get(PRINT_ASSETS_REPOSITORY);
  });

  afterEach(() => jest.restoreAllMocks());

  it("marca la orden como pagada y notifica cuando el monto coincide", async () => {
    mercadoPagoService.getPaymentById.mockResolvedValue(approvedPayment() as never);
    orderRepository.getByExternalReference.mockResolvedValue(order());

    const result = await service.processWebhook("1001");

    expect(result.status).toBe(OrderStatus.paid);
    expect(applied?.status).toBe(OrderStatus.paid);
    expect(notificationsService.notifyPaidOrder).toHaveBeenCalledTimes(1);
  });

  describe("verificacion de monto", () => {
    // El fallo que esto cubre: antes el webhook SOBRESCRIBIA totals.totalPaid
    // con lo que reportara Mercado Pago, con lo cual un monto manipulado quedaba
    // registrado como si fuera el correcto y la orden se marcaba pagada.
    it("deja en revision un pago por menos de lo que costaba", async () => {
      mercadoPagoService.getPaymentById.mockResolvedValue(
        approvedPayment({ transaction_amount: 1 }) as never,
      );
      orderRepository.getByExternalReference.mockResolvedValue(order());

      const result = await service.processWebhook("1001");

      expect(result.status).toBe(OrderStatus.payment_review);
      expect(notificationsService.notifyPaidOrder).not.toHaveBeenCalled();
    });

    it("deja en revision un pago en otra moneda", async () => {
      mercadoPagoService.getPaymentById.mockResolvedValue(
        approvedPayment({ currency_id: "ARS" }) as never,
      );
      orderRepository.getByExternalReference.mockResolvedValue(order());

      expect((await service.processWebhook("1001")).status).toBe(OrderStatus.payment_review);
      expect(notificationsService.notifyPaidOrder).not.toHaveBeenCalled();
    });

    it("deja en revision un monto ilegible", async () => {
      mercadoPagoService.getPaymentById.mockResolvedValue(
        approvedPayment({ transaction_amount: null }) as never,
      );
      orderRepository.getByExternalReference.mockResolvedValue(order());

      expect((await service.processWebhook("1001")).status).toBe(OrderStatus.payment_review);
    });

    // Mercado Pago devuelve decimales; la orden esta en pesos enteros.
    it("tolera la diferencia de decimales", async () => {
      mercadoPagoService.getPaymentById.mockResolvedValue(
        approvedPayment({ transaction_amount: 120000.0 }) as never,
      );
      orderRepository.getByExternalReference.mockResolvedValue(order());

      expect((await service.processWebhook("1001")).status).toBe(OrderStatus.paid);
    });

    it("no verifica el monto cuando el pago no fue aprobado", async () => {
      mercadoPagoService.getPaymentById.mockResolvedValue(
        approvedPayment({ status: "pending", transaction_amount: 5 }) as never,
      );
      orderRepository.getByExternalReference.mockResolvedValue(order());

      expect((await service.processWebhook("1001")).status).toBe(OrderStatus.payment_pending);
    });
  });

  // Mercado Pago reintenta los webhooks. Notificar en cada reintento le mandaria
  // al dueno el mismo pedido varias veces.
  it("no notifica cuando el repositorio dice que la orden ya estaba resuelta", async () => {
    mercadoPagoService.getPaymentById.mockResolvedValue(approvedPayment() as never);
    orderRepository.getByExternalReference.mockResolvedValue(order({ status: OrderStatus.paid }));
    orderRepository.applyPaymentResult.mockResolvedValue({
      order: order({ status: OrderStatus.paid }),
      applied: false,
    });

    await service.processWebhook("1001");

    expect(notificationsService.notifyPaidOrder).not.toHaveBeenCalled();
  });

  it("nunca toca los totales de la orden", async () => {
    mercadoPagoService.getPaymentById.mockResolvedValue(approvedPayment() as never);
    orderRepository.getByExternalReference.mockResolvedValue(order());

    await service.processWebhook("1001");

    expect(Object.keys(applied ?? {})).toEqual(["status", "payment"]);
  });

  it("registra el pago con lo que reporto Mercado Pago", async () => {
    mercadoPagoService.getPaymentById.mockResolvedValue(approvedPayment() as never);
    orderRepository.getByExternalReference.mockResolvedValue(order());

    await service.processWebhook("1001");

    expect(applied?.payment).toMatchObject({
      provider: "mercadopago",
      paymentId: "1001",
      status: "approved",
      transactionAmount: 120000,
      currency: "COP",
    });
  });

  describe("cola de impresion", () => {
    it("encola el arte al confirmarse el pago", async () => {
      mercadoPagoService.getPaymentById.mockResolvedValue(approvedPayment() as never);
      orderRepository.getByExternalReference.mockResolvedValue(order());

      await service.processWebhook("1001");

      expect(printAssets.enqueueForOrder).toHaveBeenCalledWith("order-1");
    });

    it("no encola nada si el pago quedo en revision", async () => {
      mercadoPagoService.getPaymentById.mockResolvedValue(
        approvedPayment({ transaction_amount: 1 }) as never,
      );
      orderRepository.getByExternalReference.mockResolvedValue(order());

      await service.processWebhook("1001");

      expect(printAssets.enqueueForOrder).not.toHaveBeenCalled();
    });

    it("no encola dos veces ante un webhook repetido", async () => {
      mercadoPagoService.getPaymentById.mockResolvedValue(approvedPayment() as never);
      orderRepository.getByExternalReference.mockResolvedValue(order({ status: OrderStatus.paid }));
      orderRepository.applyPaymentResult.mockResolvedValue({
        order: order({ status: OrderStatus.paid }),
        applied: false,
      });

      await service.processWebhook("1001");

      expect(printAssets.enqueueForOrder).not.toHaveBeenCalled();
    });

    // Si esto tumbara el webhook, Mercado Pago reintentaria, la orden ya estaria
    // en estado terminal y el cliente se quedaria sin recibo por un fallo de la
    // cola de renders.
    it("un fallo al encolar no rompe el webhook ni impide notificar", async () => {
      mercadoPagoService.getPaymentById.mockResolvedValue(approvedPayment() as never);
      orderRepository.getByExternalReference.mockResolvedValue(order());
      printAssets.enqueueForOrder.mockRejectedValue(new Error("la base no responde"));

      const result = await service.processWebhook("1001");

      expect(result.status).toBe(OrderStatus.paid);
      expect(notificationsService.notifyPaidOrder).toHaveBeenCalledTimes(1);
    });
  });

  it("falla si el pago no trae referencia externa", async () => {
    mercadoPagoService.getPaymentById.mockResolvedValue(
      approvedPayment({ external_reference: null }) as never,
    );

    await expect(service.processWebhook("1001")).rejects.toThrow(/external_reference/);
  });

  it("falla si la orden no existe", async () => {
    mercadoPagoService.getPaymentById.mockResolvedValue(approvedPayment() as never);
    orderRepository.getByExternalReference.mockResolvedValue(null);

    await expect(service.processWebhook("1001")).rejects.toThrow(/Order not found/);
  });
});
