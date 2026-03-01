import { Controller, Get, HttpCode, HttpStatus, Query, UsePipes, ValidationPipe } from "@nestjs/common";
import { ShippingQuoteDto } from "./dto/shipping-quote.dto";
import { ShippingService } from "./shipping.service";

@Controller("api/shipping")
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get("quote")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async getQuote(@Query() query: ShippingQuoteDto) {
    const quote = await this.shippingService.calculateQuote(query);
    return { quote };
  }
}
