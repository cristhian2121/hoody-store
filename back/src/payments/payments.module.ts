import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "../services/payments.service";
import { MercadoPagoService } from "../services/mercadopago.service";
import { OrdersRepository } from "../repositories/prisma/orders.repository";
import { NotificationsModule } from "../notifications/notifications.module";
import { PrintModule } from "../print/print.module";

@Module({
  // PrintModule aporta la cola de renders: al confirmarse un pago hay que
  // encolar el arte de esa orden.
  imports: [NotificationsModule, PrintModule],
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
