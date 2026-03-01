import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { Request, Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PaymentsService } from "../services/payments.service";
import { ConfigService } from "@nestjs/config";
import { ConfirmPaymentDto } from "./dto/confirm-payment.dto";

@Controller("api/payments/mercadopago")
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  @Post("confirm")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async confirmPayment(@Body() body: ConfirmPaymentDto) {
    const order = await this.paymentsService.processWebhook(body.paymentId);
    return {
      ok: true,
      orderId: order.id,
      status: order.status,
    };
  }

  @Post("webhook")
  @Get("webhook")
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body?: any,
    @Headers("x-signature") signature?: string,
    @Headers("x-request-id") requestId?: string,
  ) {
    const host = req.headers.host || "localhost";
    const requestUrl = new URL(req.originalUrl || req.url, `http://${host}`);
    const topic = requestUrl.searchParams.get("topic") || requestUrl.searchParams.get("type") || body?.type;
    const paymentIdFromQuery =
      requestUrl.searchParams.get("data.id") || requestUrl.searchParams.get("id");
    const paymentId = paymentIdFromQuery || body?.data?.id;

    // Verify webhook signature for POST requests
    if (
      req.method === "POST" &&
      !this.verifyWebhookSignature({
        signature,
        requestId,
        dataId: paymentId,
      })
    ) {
      console.error("[Webhook] Invalid signature, rejecting request");
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    if (topic !== "payment" || !paymentId) {
      return res.json({ ok: true });
    }

    try {
      await this.paymentsService.processWebhook(paymentId);
      return res.json({ ok: true });
    } catch (error: any) {
      console.error("[Webhook] Failed to process webhook", {
        paymentId,
        error: error.message,
      });
      // Return 200 to prevent MP retries on our errors
      return res.json({ ok: true });
    }
  }

  private verifyWebhookSignature(
    params: {
      signature?: string;
      requestId?: string;
      dataId?: string;
    },
  ): boolean {
    const webhookSecret = this.configService.get<string>("MERCADOPAGO_WEBHOOK_SECRET");
    if (!webhookSecret || webhookSecret.includes("your_webhook_secret_here")) {
      console.warn(
        "[Webhook] MERCADOPAGO_WEBHOOK_SECRET not configured properly. Webhook signature validation skipped.",
      );
      return true;
    }

    if (!params.signature) {
      console.warn("[Webhook] Missing x-signature header");
      return false;
    }

    const signatureParts = params.signature.split(",").reduce<Record<string, string>>(
      (acc, rawPart) => {
        const [key, value] = rawPart.trim().split("=");
        if (key && value) {
          acc[key.trim()] = value.trim();
        }
        return acc;
      },
      {},
    );

    const timestamp = signatureParts.ts;
    const receivedHash = signatureParts.v1;

    if (!timestamp || !receivedHash) {
      console.warn("[Webhook] Invalid signature format");
      return false;
    }

    // Manifest according to Mercado Pago docs:
    // id:<data.id>;request-id:<x-request-id>;ts:<ts>;
    // If a value is missing, it must be omitted from the manifest.
    const manifestParts = [
      params.dataId ? `id:${params.dataId}` : null,
      params.requestId ? `request-id:${params.requestId}` : null,
      `ts:${timestamp}`,
    ].filter(Boolean);
    const manifest = `${manifestParts.join(";")};`;

    // Compute HMAC-SHA256
    const computedHash = createHmac("sha256", webhookSecret)
      .update(manifest)
      .digest("hex");

    let isValid = false;
    try {
      const receivedBuffer = Buffer.from(receivedHash, "hex");
      const computedBuffer = Buffer.from(computedHash, "hex");
      isValid =
        receivedBuffer.length === computedBuffer.length &&
        timingSafeEqual(receivedBuffer, computedBuffer);
    } catch {
      return false;
    }

    if (!isValid) {
      console.error("[Webhook] Signature validation failed", {
        receivedHash: receivedHash.substring(0, 16) + "...",
        computedHash: computedHash.substring(0, 16) + "...",
        requestId: params.requestId,
      });
    }

    return isValid;
  }
}
