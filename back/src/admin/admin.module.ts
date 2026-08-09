import { Module } from "@nestjs/common";
import { AdminController, PrintDownloadController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AuthModule } from "../auth/auth.module";
import { PrintModule } from "../print/print.module";
import { OrdersRepository } from "../repositories/prisma/orders.repository";

@Module({
  imports: [AuthModule, PrintModule],
  controllers: [AdminController, PrintDownloadController],
  providers: [
    AdminService,
    {
      provide: "OrderRepository",
      useClass: OrdersRepository,
    },
  ],
})
export class AdminModule {}
