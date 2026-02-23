import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "../services/orders.service";
import { PaymentsService } from "../services/payments.service";
import { MercadoPagoService } from "../services/mercadopago.service";
import { OrdersRepository } from "../repositories/prisma/orders.repository";
import { OrderRepository } from "../repositories/interfaces/orders.repository.interface";

@Module({
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
