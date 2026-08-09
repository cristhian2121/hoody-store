import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UsePipes,
  UseGuards,
  NotFoundException,
  ValidationPipe,
} from "@nestjs/common";
import { OrdersService } from "../services/orders.service";
import { CheckoutDto } from "../api/dto/checkout.dto";
import { AdminGuard } from "../auth/guards/admin.guard";

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
      // Los totales viajan de vuelta para que el frontend pueda comparar contra
      // lo que le mostro al cliente. Si el catalogo cambio de precio entre que
      // se armo el carrito y se apreto pagar, el numero de aca es el real.
      totals: result.totals,
    };
  }

  // Solo admin: la respuesta contiene nombre, email, telefono y direccion de
  // cada cliente. Estuvo publico y eso es una exposicion de datos personales
  // reportable bajo la Ley 1581 (Habeas Data).
  @UseGuards(AdminGuard)
  @Get()
  async list() {
    const orders = await this.ordersService.listOrders();
    return { orders };
  }

  @UseGuards(AdminGuard)
  @Get(":id")
  async getById(@Param("id") id: string) {
    const order = await this.ordersService.getOrderById(id);
    if (!order) {
      throw new NotFoundException("Orden no encontrada.");
    }
    return { order };
  }
}
