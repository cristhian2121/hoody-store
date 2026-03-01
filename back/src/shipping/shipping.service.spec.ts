import { Test, TestingModule } from "@nestjs/testing";
import { LocationsService } from "../services/locations.service";
import { ShippingService } from "./shipping.service";
import {
  SHIPPING_PRICING_PROVIDER,
  ShippingPricingProvider,
} from "./interfaces/shipping-pricing-provider.interface";

describe("ShippingService", () => {
  let service: ShippingService;
  let locationsService: jest.Mocked<LocationsService>;
  let pricingProvider: jest.Mocked<ShippingPricingProvider>;

  beforeEach(async () => {
    const mockLocationsService = {
      getCountries: jest.fn(),
      getDepartments: jest.fn(),
      getCities: jest.fn(),
    };

    const mockPricingProvider = {
      getQuote: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        {
          provide: LocationsService,
          useValue: mockLocationsService,
        },
        {
          provide: SHIPPING_PRICING_PROVIDER,
          useValue: mockPricingProvider,
        },
      ],
    }).compile();

    service = module.get<ShippingService>(ShippingService);
    locationsService = module.get<LocationsService>(LocationsService) as jest.Mocked<LocationsService>;
    pricingProvider = module.get<ShippingPricingProvider>(
      SHIPPING_PRICING_PROVIDER,
    ) as jest.Mocked<ShippingPricingProvider>;
  });

  it("should return quote for valid colombia location", async () => {
    locationsService.getDepartments.mockResolvedValue([
      {
        id: "dept-1",
        countryCode: "CO",
        countryName: "Colombia",
        code: "11",
        name: "Bogotá D.C.",
      },
    ]);
    locationsService.getCities.mockResolvedValue([
      {
        id: "city-1",
        departmentCode: "11",
        departmentName: "Bogotá D.C.",
        code: "11001",
        name: "Bogotá",
      },
    ]);
    pricingProvider.getQuote.mockResolvedValue({
      amount: 20000,
      currency: "COP",
      provider: "fixed-default",
    });

    const result = await service.calculateQuote({
      countryCode: "CO",
      departmentCode: "11",
      cityCode: "11001",
    });

    expect(result.amount).toBe(20000);
    expect(result.department.name).toBe("Bogotá D.C.");
    expect(pricingProvider.getQuote).toHaveBeenCalledWith({
      countryCode: "CO",
      departmentCode: "11",
      cityCode: "11001",
    });
  });

  it("should reject non-colombia country", async () => {
    await expect(
      service.calculateQuote({
        countryCode: "EC",
        departmentCode: "11",
        cityCode: "11001",
      }),
    ).rejects.toThrow("Solo soportamos envíos para Colombia por ahora.");
  });
});
