import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { execSync } from "node:child_process";
import { PrismaService } from "./prisma/prisma.service";

/**
 * Run Prisma migrations
 */
const runMigrations = async () => {
  const nodeEnv = process.env.NODE_ENV || "development";
  try {
    console.log("[Migration] Running Prisma migrations...");
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("[Migration] Migrations completed successfully");
  } catch (error: any) {
    console.error("[Migration] Failed to run migrations:", error.message);
    // In development, try migrate dev instead
    if (nodeEnv === "development") {
      try {
        console.log("[Migration] Trying migrate dev...");
        execSync("npx prisma migrate dev --name init", { stdio: "inherit" });
        console.log("[Migration] Migrations completed successfully");
      } catch (devError: any) {
        console.error("[Migration] Failed to run migrate dev:", devError.message);
        // Continue anyway - migrations might already be applied
      }
    }
  }
};

/**
 * Generate Prisma Client
 */
const generatePrismaClient = async () => {
  try {
    console.log("[Prisma] Generating Prisma Client...");
    execSync("npx prisma generate", { stdio: "inherit" });
    console.log("[Prisma] Client generated successfully");
  } catch (error: any) {
    console.error("[Prisma] Failed to generate client:", error.message);
    throw error;
  }
};

async function bootstrap() {
  try {
    // Generate Prisma Client first
    await generatePrismaClient();

    // Run migrations
    await runMigrations();

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
