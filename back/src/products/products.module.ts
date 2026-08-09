import { Module } from "@nestjs/common";
import { ProductsController } from "./products.controller";
import { ProductsService } from "../services/products.service";
import { PricingService } from "./pricing.service";
import { ProductsRepositoryPrisma } from "../repositories/prisma/products.repository";
import { PRODUCTS_REPOSITORY } from "../repositories/interfaces/products.repository.interface";

@Module({
  controllers: [ProductsController],
  providers: [
    ProductsService,
    PricingService,
    {
      provide: PRODUCTS_REPOSITORY,
      useClass: ProductsRepositoryPrisma,
    },
  ],
  exports: [ProductsService, PricingService],
})
export class ProductsModule {}
