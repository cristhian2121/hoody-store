import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { OrdersModule } from "./orders/orders.module";
import { PaymentsModule } from "./payments/payments.module";
import { LocationsModule } from "./locations/locations.module";
import { AppController } from "./app.controller";
import { loadDotEnv } from "./config/env";

// Load .env file
loadDotEnv();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    PrismaModule,
    OrdersModule,
    PaymentsModule,
    LocationsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
