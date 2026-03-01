import { Module } from "@nestjs/common";
import { LocationsModule } from "../locations/locations.module";
import { ShippingController } from "./shipping.controller";
import { ShippingService } from "./shipping.service";
import { FixedShippingPricingProvider } from "./providers/fixed-shipping-pricing.provider";
import { SHIPPING_PRICING_PROVIDER } from "./interfaces/shipping-pricing-provider.interface";

@Module({
  imports: [LocationsModule],
  controllers: [ShippingController],
  providers: [
    ShippingService,
    FixedShippingPricingProvider,
    {
      provide: SHIPPING_PRICING_PROVIDER,
      useExisting: FixedShippingPricingProvider,
    },
  ],
  exports: [ShippingService],
})
export class ShippingModule {}
