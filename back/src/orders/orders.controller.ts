import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { OrdersService } from "../services/orders.service";
import { CheckoutDto } from "../api/dto/checkout.dto";

@Controller("api/orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("checkout")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async checkout(@Body() checkoutDto: CheckoutDto) {
    const result = await this.ordersService.createOrderWithCheckout(checkoutDto);
    return {
      orderId: result.order.id,
      checkoutUrl: result.checkoutUrl,
    };
  }

  @Get()
  async list() {
    const orders = await this.ordersService.listOrders();
    return { orders };
  }

  @Get(":id")
  async getById(@Param("id") id: string) {
    const order = await this.ordersService.getOrderById(id);
    if (!order) {
      return { message: "Orden no encontrada." };
    }
    return { order };
  }
}
