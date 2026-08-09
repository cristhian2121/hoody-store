import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "../services/orders.service";
import { PaymentsService } from "../services/payments.service";
import { MercadoPagoService } from "../services/mercadopago.service";
import { OrdersRepository } from "../repositories/prisma/orders.repository";
import { ShippingModule } from "../shipping/shipping.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AuthModule } from "../auth/auth.module";
import { ProductsModule } from "../products/products.module";
import { PrintModule } from "../print/print.module";

@Module({
  // ProductsModule aporta PricingService, la unica clase autorizada a producir
  // dinero; PrintModule aporta la validacion de disenos. OrdersModule no calcula
  // ni un precio ni una geometria por su cuenta.
  imports: [ShippingModule, NotificationsModule, AuthModule, ProductsModule, PrintModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    PaymentsService,
    MercadoPagoService,
    {
      provide: "OrderRepository",
      useClass: OrdersRepository,
    },
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
