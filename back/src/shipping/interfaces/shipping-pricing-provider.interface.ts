export interface ShippingPricingContext {
  countryCode: string;
  departmentCode: string;
  cityCode: string;
}

export interface ShippingPricingQuote {
  amount: number;
  currency: string;
  provider: string;
}

export interface ShippingPricingProvider {
  getQuote(context: ShippingPricingContext): Promise<ShippingPricingQuote>;
}

export const SHIPPING_PRICING_PROVIDER = "ShippingPricingProvider";
