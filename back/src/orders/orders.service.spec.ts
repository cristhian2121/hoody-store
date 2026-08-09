import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { OrdersService } from "../services/orders.service";
import { PaymentsService } from "../services/payments.service";
import { OrderRepository } from "../repositories/interfaces/orders.repository.interface";
import { ShippingService } from "../shipping/shipping.service";
import { PricingService, PricedLine } from "../products/pricing.service";
import { DesignValidationService } from "../print/design-validation.service";
import { CheckoutDto } from "../api/dto/checkout.dto";

const VARIANT_A = "11111111-1111-4111-8111-111111111111";
const VARIANT_B = "22222222-2222-4222-8222-222222222222";
const CART_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CART_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const pricedLine = (overrides: Partial<PricedLine> = {}): PricedLine => ({
  variantId: VARIANT_A,
  sku: "hoodie-premium-hombre-negro-M",
  productSlug: "hoodie-premium",
  productNameEs: "Hoodie Premium",
  productNameEn: "Premium Hoodie",
  category: "hoodies",
  gender: "hombre",
  size: "M",
  colorId: "negro",
  colorNameEs: "Negro",
  colorNameEn: "Black",
  colorHex: "#1a1a1a",
  imageStorageKey: "products/hoodie-black.jpg",
  unitPriceCop: 119900,
  quantity: 1,
  lineTotalCop: 119900,
  imageUrl: "http://localhost:4242/static/products/hoodie-black.jpg",
  description: "M · Negro",
  ...overrides,
});

const checkoutDto = (overrides: Partial<CheckoutDto> = {}): CheckoutDto =>
  ({
    items: [{ cartItemId: CART_A, variantId: VARIANT_A, quantity: 1, designs: [] }],
    customer: {
      firstName: "Ana",
      lastName: "Perez",
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
    ...overrides,
  }) as CheckoutDto;

describe("OrdersService.createOrderWithCheckout", () => {
  let service: OrdersService;
  let orderRepository: jest.Mocked<OrderRepository>;
  let paymentsService: jest.Mocked<PaymentsService>;
  let shippingService: jest.Mocked<ShippingService>;
  let pricingService: jest.Mocked<PricingService>;
  let designValidation: jest.Mocked<DesignValidationService>;
  let created: Prisma.OrderCreateInput | undefined;

  beforeEach(async () => {
    created = undefined;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: "OrderRepository",
          useValue: {
            list: jest.fn(),
            getById: jest.fn(),
            getByExternalReference: jest.fn(),
            create: jest.fn(async (data: Prisma.OrderCreateInput) => {
              created = data;
              return { id: data.id, ...data } as never;
            }),
            attachPayment: jest.fn(async (id: string) => ({ id }) as never),
            applyPaymentResult: jest.fn(),
          },
        },
        {
          provide: PaymentsService,
          useValue: {
            createPreference: jest.fn(async () => ({
              id: "pref-1",
              init_point: "https://mp.test/checkout",
            })),
          },
        },
        {
          provide: ShippingService,
          useValue: {
            calculateQuote: jest.fn(async () => ({
              country: { code: "CO", name: "Colombia" },
              department: { code: "11", name: "Bogota D.C." },
              city: { code: "11001", name: "Bogota" },
              amount: 20000,
              currency: "COP",
              provider: "fixed-default",
              calculatedAt: new Date().toISOString(),
            })),
          },
        },
        {
          provide: PricingService,
          useValue: {
            priceCart: jest.fn(async () => ({
              lines: [pricedLine()],
              subtotalCop: 119900,
            })),
          },
        },
        {
          provide: DesignValidationService,
          useValue: { validateItemDesigns: jest.fn(async () => []) },
        },
      ],
    }).compile();

    service = module.get(OrdersService);
    orderRepository = module.get("OrderRepository");
    paymentsService = module.get(PaymentsService);
    shippingService = module.get(ShippingService);
    pricingService = module.get(PricingService);
    designValidation = module.get(DesignValidationService);
  });

  describe("el precio nunca viene del cliente", () => {
    it("solo le pasa variantId y cantidad al servicio de precios", async () => {
      await service.createOrderWithCheckout(
        checkoutDto({
          items: [
            { cartItemId: CART_A, variantId: VARIANT_A, quantity: 3, designs: [] },
          ] as CheckoutDto["items"],
        }),
      );

      expect(pricingService.priceCart).toHaveBeenCalledWith([
        { variantId: VARIANT_A, quantity: 3 },
      ]);
    });

    it("guarda el precio de la base, no el del pedido", async () => {
      await service.createOrderWithCheckout(checkoutDto());

      const items = (created?.orderItems as { create: Record<string, unknown>[] }).create;
      expect(items[0]).toMatchObject({
        unitPriceCop: 119900,
        lineTotalCop: 119900,
        productSlug: "hoodie-premium",
      });
    });

    it("el total es subtotal de la base mas el envio calculado en el servidor", async () => {
      const result = await service.createOrderWithCheckout(checkoutDto());

      expect(result.totals).toEqual({
        subtotal: 119900,
        shipping: 20000,
        total: 139900,
        currency: "COP",
      });
      expect(created?.totals).toMatchObject({ total: 139900 });
    });

    // El titulo y la descripcion que ve el comprador en la pantalla de cobro se
    // arman con datos del catalogo. Antes se interpolaba un string del pedido.
    it("arma las lineas de Mercado Pago con datos del catalogo", async () => {
      await service.createOrderWithCheckout(checkoutDto());

      expect(paymentsService.createPreference).toHaveBeenCalledWith(
        expect.objectContaining({
          shippingCost: 20000,
          items: [
            expect.objectContaining({
              id: "hoodie-premium-hombre-negro-M",
              title: "Hoodie Premium",
              description: "M · Negro",
              unitPrice: 119900,
              quantity: 1,
            }),
          ],
        }),
      );
    });
  });

  describe("orden de operaciones", () => {
    // Si el diseno se validara despues de crear la preferencia, existiria un
    // link de pago para algo que no se puede imprimir.
    it("valida los disenos antes de generar el link de pago", async () => {
      const calls: string[] = [];
      designValidation.validateItemDesigns.mockImplementation(async () => {
        calls.push("validate");
        return [];
      });
      paymentsService.createPreference.mockImplementation(async () => {
        calls.push("preference");
        return { id: "pref-1", init_point: "https://mp.test/checkout" } as never;
      });

      await service.createOrderWithCheckout(checkoutDto());

      expect(calls).toEqual(["validate", "preference"]);
    });

    it("no crea la orden si el precio falla", async () => {
      pricingService.priceCart.mockRejectedValue(new BadRequestException("no disponible"));

      await expect(service.createOrderWithCheckout(checkoutDto())).rejects.toThrow("no disponible");
      expect(orderRepository.create).not.toHaveBeenCalled();
      expect(paymentsService.createPreference).not.toHaveBeenCalled();
    });

    it("no genera link de pago si un diseno es invalido", async () => {
      designValidation.validateItemDesigns.mockRejectedValue(
        new BadRequestException("imagen muy pequena"),
      );

      await expect(service.createOrderWithCheckout(checkoutDto())).rejects.toThrow(
        "imagen muy pequena",
      );
      expect(paymentsService.createPreference).not.toHaveBeenCalled();
    });

    it("valida cada linea contra la categoria que dice el catalogo", async () => {
      pricingService.priceCart.mockResolvedValue({
        lines: [pricedLine(), pricedLine({ variantId: VARIANT_B, category: "camisetas" })],
        subtotalCop: 239800,
      });

      await service.createOrderWithCheckout(
        checkoutDto({
          items: [
            { cartItemId: CART_A, variantId: VARIANT_A, quantity: 1, designs: [] },
            { cartItemId: CART_B, variantId: VARIANT_B, quantity: 1, designs: [] },
          ] as CheckoutDto["items"],
        }),
      );

      expect(designValidation.validateItemDesigns).toHaveBeenNthCalledWith(1, [], "hoodies");
      expect(designValidation.validateItemDesigns).toHaveBeenNthCalledWith(2, [], "camisetas");
    });
  });

  // La tabla tiene @@unique([orderId, cartItemId]): sin esto seria una violacion
  // de constraint a mitad de la transaccion en vez de un error explicable.
  it("rechaza lineas de carrito repetidas", async () => {
    await expect(
      service.createOrderWithCheckout(
        checkoutDto({
          items: [
            { cartItemId: CART_A, variantId: VARIANT_A, quantity: 1, designs: [] },
            { cartItemId: CART_A, variantId: VARIANT_B, quantity: 1, designs: [] },
          ] as CheckoutDto["items"],
        }),
      ),
    ).rejects.toThrow(BadRequestException);

    expect(pricingService.priceCart).not.toHaveBeenCalled();
  });

  it("calcula el envio con la ubicacion del pedido", async () => {
    await service.createOrderWithCheckout(checkoutDto());

    expect(shippingService.calculateQuote).toHaveBeenCalledWith({
      countryCode: "CO",
      departmentCode: "11",
      cityCode: "11001",
    });
  });

  it("guarda la orden con sus lineas y disenos en una sola llamada", async () => {
    designValidation.validateItemDesigns.mockResolvedValue([
      {
        side: "front",
        category: "hoodies",
        printAreaWidthMm: 260,
        printAreaHeightMm: 260,
        dpi: 300,
        imageAssetId: "33333333-3333-4333-8333-333333333333",
        layer: { image: null, texts: [] },
      },
    ]);

    await service.createOrderWithCheckout(checkoutDto());

    expect(orderRepository.create).toHaveBeenCalledTimes(1);
    const items = (created?.orderItems as { create: Record<string, unknown>[] }).create;
    const designs = (items[0].designs as { create: Record<string, unknown>[] }).create;
    expect(designs[0]).toMatchObject({ side: "front", printAreaWidthMm: 260, dpi: 300 });
  });

  it("devuelve la url de pago", async () => {
    const result = await service.createOrderWithCheckout(checkoutDto());
    expect(result.checkoutUrl).toBe("https://mp.test/checkout");
  });
});

describe("OrdersService: lecturas", () => {
  it("delega listar y buscar por id al repositorio", async () => {
    const repository = {
      list: jest.fn(async () => []),
      getById: jest.fn(async () => null),
    } as unknown as OrderRepository;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: "OrderRepository", useValue: repository },
        { provide: PaymentsService, useValue: {} },
        { provide: ShippingService, useValue: {} },
        { provide: PricingService, useValue: {} },
        { provide: DesignValidationService, useValue: {} },
      ],
    }).compile();

    const service = module.get(OrdersService);

    expect(await service.listOrders()).toEqual([]);
    expect(await service.getOrderById("nope")).toBeNull();
    expect(repository.getById).toHaveBeenCalledWith("nope");
  });
});
