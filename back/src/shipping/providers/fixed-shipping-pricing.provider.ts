import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ShippingPricingContext,
  ShippingPricingProvider,
  ShippingPricingQuote,
} from "../interfaces/shipping-pricing-provider.interface";

const DEFAULT_SHIPPING_COST_COP = 20000;

@Injectable()
export class FixedShippingPricingProvider implements ShippingPricingProvider {
  constructor(private readonly configService: ConfigService) {}

  async getQuote(_: ShippingPricingContext): Promise<ShippingPricingQuote> {
    const configuredValue = this.configService.get<string>("SHIPPING_DEFAULT_COST_COP");
    const parsedValue = configuredValue ? Number(configuredValue) : DEFAULT_SHIPPING_COST_COP;

    const amount = Number.isFinite(parsedValue) && parsedValue >= 0
      ? parsedValue
      : DEFAULT_SHIPPING_COST_COP;

    return {
      amount,
      currency: "COP",
      provider: "fixed-default",
    };
  }
}
