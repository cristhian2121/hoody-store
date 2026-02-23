import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from "@nestjs/common";
import { Request, Response } from "express";
import { createHmac } from "node:crypto";
import { PaymentsService } from "../services/payments.service";
import { ConfigService } from "@nestjs/config";

@Controller("api/payments/mercadopago")
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  @Post("webhook")
  @Get("webhook")
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: Request,
    @Res() res: Response,
    @Query("topic") topic?: string,
    @Query("data.id") dataId?: string,
    @Query("id") id?: string,
    @Body() body?: any,
    @Headers("x-signature") signature?: string,
    @Headers("x-request-id") requestId?: string,
  ) {
    const queryString = new URL(req.url, `http://${req.headers.host}`).searchParams.toString();

    // Verify webhook signature for POST requests
    if (req.method === "POST" && !this.verifyWebhookSignature(req, body, queryString, signature, requestId)) {
      console.error("[Webhook] Invalid signature, rejecting request");
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    const paymentTopic = topic || body?.type;
    const paymentId = dataId || body?.data?.id || id;

    if (paymentTopic !== "payment" || !paymentId) {
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
    req: Request,
    body: any,
    queryString: string,
    signature?: string,
    requestId?: string,
  ): boolean {
    const webhookSecret = this.configService.get<string>("MERCADOPAGO_WEBHOOK_SECRET");
    if (!webhookSecret || webhookSecret.startsWith("/")) {
      console.warn(
        "[Webhook] MERCADOPAGO_WEBHOOK_SECRET not configured properly. Webhook signature validation skipped.",
      );
      return true;
    }

    if (!signature) {
      console.warn("[Webhook] Missing x-signature header");
      return false;
    }

    // Mercado Pago sends signature as: sha256=hash
    const parts = signature.split("=");
    if (parts.length !== 2 || parts[0] !== "sha256") {
      console.warn("[Webhook] Invalid signature format");
      return false;
    }

    const receivedHash = parts[1];

    // Build the data string: request_id + query_string + body
    const dataToSign = `${requestId || ""}${queryString}${JSON.stringify(body)}`;

    // Compute HMAC-SHA256
    const computedHash = createHmac("sha256", webhookSecret)
      .update(dataToSign)
      .digest("hex");

    const isValid = computedHash === receivedHash;
    if (!isValid) {
      console.error("[Webhook] Signature validation failed", {
        receivedHash: receivedHash.substring(0, 16) + "...",
        computedHash: computedHash.substring(0, 16) + "...",
        requestId,
      });
    }

    return isValid;
  }
}
