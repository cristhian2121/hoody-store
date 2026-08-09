import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { PrintSide } from "@prisma/client";

/**
 * Contrato del checkout.
 *
 * Lo que NO esta aqui es lo importante: no hay `price`, ni `name`, ni `image`,
 * ni `category`, ni `size`, ni `gender`, ni `color`. Todo eso se deriva en el
 * servidor a partir de `variantId`. Con `forbidNonWhitelisted` activo, mandar
 * un precio no es que se ignore: es un 400. "Nunca confiar en el precio del
 * cliente" deja de ser una regla que alguien puede olvidar y pasa a ser algo
 * que el contrato no permite expresar.
 *
 * Tampoco viaja ninguna imagen en base64: el diseno referencia un assetId que
 * ya esta en el servidor.
 */

const MAX_ITEMS_PER_ORDER = 50;
const MAX_TEXTS_PER_SIDE = 8;

/** Debe coincidir con MAX_TEXT_LENGTH del frontend. */
export const MAX_TEXT_LENGTH = 40;

class CustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName: string;

  // Antes era @IsString() a secas y el correo es el unico canal por el que el
  // cliente recibe su recibo: uno mal escrito es un pedido sin comprobante.
  @IsEmail({}, { message: "El correo electronico no es valido." })
  @MaxLength(160)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone: string;
}

class ShippingDto {
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @IsString()
  @IsNotEmpty()
  departmentCode: string;

  @IsString()
  @IsNotEmpty()
  cityCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  address: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;
}

/**
 * La imagen de una capa.
 *
 * Solo el id y la ubicacion. Ni las dimensiones ni la transparencia se aceptan
 * del cliente: se leen de la fila DesignAsset, que es lo unico que permite
 * validar el DPI de verdad. Si el cliente pudiera declarar `naturalWidth`,
 * podria declarar 10000 y saltarse el piso de calidad.
 */
class DesignImageDto {
  @IsUUID()
  assetId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  x: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  y: number;

  @IsNumber()
  @Min(0.05)
  @Max(10)
  scale: number;

  @IsNumber()
  @Min(-360)
  @Max(360)
  rotation: number;
}

class DesignTextDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_TEXT_LENGTH)
  content: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  x: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  y: number;

  // Se valida contra el registro de fuentes en el servicio: una familia
  // desconocida es un 400 y nunca una sustitucion silenciosa por otra
  // tipografia al imprimir.
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  fontFamily: string;

  @IsNumber()
  @Min(4)
  @Max(200)
  fontSize: number;

  @IsHexColor()
  color: string;

  @IsBoolean()
  bold: boolean;

  @IsBoolean()
  italic: boolean;

  @IsNumber()
  @Min(0.1)
  @Max(10)
  scale: number;

  @IsNumber()
  @Min(-360)
  @Max(360)
  rotation: number;
}

class DesignDto {
  @IsEnum(PrintSide)
  side: PrintSide;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DesignImageDto)
  image?: DesignImageDto;

  @IsArray()
  @ArrayMaxSize(MAX_TEXTS_PER_SIDE)
  @ValidateNested({ each: true })
  @Type(() => DesignTextDto)
  texts: DesignTextDto[];
}

class CheckoutItemDto {
  /** Identificador de la linea en el carrito del navegador. */
  @IsUUID()
  cartItemId: string;

  @IsUUID()
  variantId: string;

  @IsInt()
  @Min(1)
  @Max(20)
  quantity: number;

  @IsArray()
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => DesignDto)
  designs: DesignDto[];
}

export class CheckoutDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_ITEMS_PER_ORDER)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

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
}

export type { CheckoutItemDto, DesignDto, DesignImageDto, DesignTextDto, CustomerDto, ShippingDto };
