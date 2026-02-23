import {
  IsNotEmpty,
  IsArray,
  IsObject,
  IsString,
  ValidateNested,
  IsNumber,
  IsOptional,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

class CustomerDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;
}

class ShippingDto {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  department: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;
}

class CartItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  gender?: string;
}

export class CheckoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  @IsNotEmpty()
  items: CartItemDto[];

  @IsObject()
  @ValidateNested()
  @Type(() => CustomerDto)
  @IsNotEmpty()
  customer: CustomerDto;

  @IsObject()
  @ValidateNested()
  @Type(() => ShippingDto)
  @IsNotEmpty()
  shipping: ShippingDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number;
}
