import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProductCategory } from "@prisma/client";
import {
  ProductsRepository,
  ProductSummaryDto,
  ProductDetailDto,
  PRODUCTS_REPOSITORY,
} from "../repositories/interfaces/products.repository.interface";

@Injectable()
export class ProductsService {
  constructor(
    @Inject(PRODUCTS_REPOSITORY)
    private readonly productsRepository: ProductsRepository,
  ) {}

  async listProducts(category?: ProductCategory): Promise<ProductSummaryDto[]> {
    return this.productsRepository.listProducts(category);
  }

  async getProductBySlug(slug: string): Promise<ProductDetailDto> {
    const product = await this.productsRepository.getProductBySlug(slug);
    if (!product) {
      throw new NotFoundException("Producto no encontrado.");
    }
    return product;
  }
}
