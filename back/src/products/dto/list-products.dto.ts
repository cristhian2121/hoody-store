import { IsEnum, IsOptional } from "class-validator";
import { ProductCategory } from "@prisma/client";

export class ListProductsDto {
  @IsOptional()
  @IsEnum(ProductCategory, {
    message: `category debe ser uno de: ${Object.values(ProductCategory).join(", ")}`,
  })
  category?: ProductCategory;
}
