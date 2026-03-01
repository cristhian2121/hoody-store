import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { LocationsService } from "../services/locations.service";
import {
  SHIPPING_PRICING_PROVIDER,
  ShippingPricingContext,
  ShippingPricingProvider,
} from "./interfaces/shipping-pricing-provider.interface";

const SUPPORTED_COUNTRY_CODE = "CO";

export interface ShippingQuote {
  country: {
    code: string;
    name: string;
  };
  department: {
    code: string;
    name: string;
  };
  city: {
    code: string;
    name: string;
  };
  amount: number;
  currency: string;
  provider: string;
  calculatedAt: string;
}

@Injectable()
export class ShippingService {
  constructor(
    @Inject(SHIPPING_PRICING_PROVIDER)
    private readonly pricingProvider: ShippingPricingProvider,
    private readonly locationsService: LocationsService,
  ) {}

  async calculateQuote(params: ShippingPricingContext): Promise<ShippingQuote> {
    const countryCode = params.countryCode.toUpperCase().trim();
    const departmentCode = params.departmentCode.trim();
    const cityCode = params.cityCode.trim();

    if (!countryCode || !departmentCode || !cityCode) {
      throw new BadRequestException("countryCode, departmentCode y cityCode son requeridos.");
    }

    if (countryCode !== SUPPORTED_COUNTRY_CODE) {
      throw new BadRequestException("Solo soportamos envíos para Colombia por ahora.");
    }

    const departments = await this.locationsService.getDepartments(countryCode);
    const department = departments.find((item) => item.code === departmentCode);

    if (!department) {
      throw new BadRequestException("Departamento inválido para Colombia.");
    }

    const cities = await this.locationsService.getCities(departmentCode);
    const city = cities.find((item) => item.code === cityCode);

    if (!city) {
      throw new BadRequestException("Ciudad inválida para el departamento seleccionado.");
    }

    const pricingQuote = await this.pricingProvider.getQuote({
      countryCode,
      departmentCode,
      cityCode,
    });

    return {
      country: {
        code: countryCode,
        name: department.countryName,
      },
      department: {
        code: department.code,
        name: department.name,
      },
      city: {
        code: city.code,
        name: city.name,
      },
      amount: pricingQuote.amount,
      currency: pricingQuote.currency,
      provider: pricingQuote.provider,
      calculatedAt: new Date().toISOString(),
    };
  }
}
