import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "node:path";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { StorageModule } from "./storage/storage.module";
import { ProductsModule } from "./products/products.module";
import { PrintModule } from "./print/print.module";
import { UploadsModule } from "./uploads/uploads.module";
import { OrdersModule } from "./orders/orders.module";
import { PaymentsModule } from "./payments/payments.module";
import { LocationsModule } from "./locations/locations.module";
import { ShippingModule } from "./shipping/shipping.module";
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
    // Solo se aplica donde se pide con @Throttle / @UseGuards(ThrottlerGuard).
    // No es guard global: el webhook de Mercado Pago puede llegar en rafagas
    // legitimas y limitarlo provocaria reintentos y ordenes sin confirmar.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    // Solo para el barrido nocturno de imagenes huerfanas.
    ScheduleModule.forRoot(),
    // Fotos de catalogo. La ruta se resuelve desde process.cwd() (la raiz de
    // back/) y no desde __dirname, para que funcione igual bajo `nest start
    // --watch` y bajo `node dist/src/main`.
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), "public"),
      serveRoot: "/static",
      serveStaticOptions: {
        index: false,
        maxAge: "7d",
        fallthrough: false,
      },
    }),
    PrismaModule,
    AuthModule,
    StorageModule,
    ProductsModule,
    PrintModule,
    UploadsModule,
    OrdersModule,
    PaymentsModule,
    LocationsModule,
    ShippingModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
