import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { PrismaService } from "./prisma/prisma.service";
import { setupSwagger } from "./config/swagger";

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    // Enable CORS
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";
    app.enableCors({
      origin: frontendUrl,
      credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    setupSwagger(app);

    const port = process.env.PORT || 4242;
    await app.listen(port);

    console.log(`atuestampa backend listening on port ${port}`);

    // Graceful shutdown
    const prismaService = app.get(PrismaService);
    const shutdown = async () => {
      console.log("\n[Shutdown] Closing server...");
      await app.close();
      await prismaService.$disconnect();
      console.log("[Shutdown] Server closed");
      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.error("[Startup] Failed to start application:", error);
    process.exit(1);
  }
}

bootstrap();
