import { Controller, Get, Param, Query } from "@nestjs/common";
import { ProductsService } from "../services/products.service";
import { ListProductsDto } from "./dto/list-products.dto";

@Controller("api/products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async list(@Query() query: ListProductsDto) {
    const products = await this.productsService.listProducts(query.category);
    return { products };
  }

  @Get(":slug")
  async getBySlug(@Param("slug") slug: string) {
    const product = await this.productsService.getProductBySlug(slug);
    return { product };
  }
}
