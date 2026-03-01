import { IsNotEmpty, IsString } from "class-validator";

export class ShippingQuoteDto {
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @IsString()
  @IsNotEmpty()
  departmentCode: string;

  @IsString()
  @IsNotEmpty()
  cityCode: string;
}
