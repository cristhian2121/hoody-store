import { INestApplication } from "@nestjs/common";
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from "@nestjs/swagger";

const SWAGGER_PATH = "api/docs";

const isSwaggerEnabled = () => {
  const explicitFlag = process.env.SWAGGER_ENABLED;
  if (typeof explicitFlag === "string") {
    return explicitFlag.toLowerCase() === "true";
  }

  return (process.env.NODE_ENV || "development") !== "production";
};

export const setupSwagger = (app: INestApplication) => {
  if (!isSwaggerEnabled()) {
    console.log("[Swagger] Documentation disabled");
    return;
  }

  const config = new DocumentBuilder()
    .setTitle("Atuestampa API")
    .setDescription("Public API documentation for hoodie store endpoints.")
    .setVersion(process.env.npm_package_version || "1.0.0")
    .addServer("/", "Current server")
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey}_${methodKey}`,
  });

  const customOptions: SwaggerCustomOptions = {
    customSiteTitle: "Atuestampa API Docs",
    swaggerOptions: {
      docExpansion: "none",
      operationsSorter: "alpha",
      tagsSorter: "alpha",
      persistAuthorization: true,
    },
  };

  SwaggerModule.setup(SWAGGER_PATH, app, document, customOptions);
  console.log(`[Swagger] Documentation available at /${SWAGGER_PATH}`);
};
