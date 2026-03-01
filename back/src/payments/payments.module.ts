import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "../services/payments.service";
import { MercadoPagoService } from "../services/mercadopago.service";
import { OrdersRepository } from "../repositories/prisma/orders.repository";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    MercadoPagoService,
    {
      provide: "OrderRepository",
      useClass: OrdersRepository,
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
