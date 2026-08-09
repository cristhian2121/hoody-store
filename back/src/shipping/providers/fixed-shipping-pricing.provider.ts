import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ShippingPricingProvider,
  ShippingPricingQuote,
} from "../interfaces/shipping-pricing-provider.interface";

const DEFAULT_SHIPPING_COST_COP = 20000;

@Injectable()
export class FixedShippingPricingProvider implements ShippingPricingProvider {
  constructor(private readonly configService: ConfigService) {}

  // El contexto se omite: esta tarifa es plana para todo el pais. El seam existe
  // para que el dia que haya tarifas por ciudad solo cambie la implementacion.
  async getQuote(): Promise<ShippingPricingQuote> {
    const configuredValue = this.configService.get<string>("SHIPPING_DEFAULT_COST_COP");
    const parsedValue = configuredValue ? Number(configuredValue) : DEFAULT_SHIPPING_COST_COP;

    const amount =
      Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : DEFAULT_SHIPPING_COST_COP;

    return {
      amount,
      currency: "COP",
      provider: "fixed-default",
    };
  }
}
