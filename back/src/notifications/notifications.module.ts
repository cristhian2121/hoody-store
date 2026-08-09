import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { NOTIFICATION_ADAPTERS } from "./notification.tokens";
import { WhatsAppCloudNotificationAdapter } from "./adapters/whatsapp-cloud.adapter";
import { ResendEmailNotificationAdapter } from "./adapters/resend-email.adapter";

@Module({
  providers: [
    NotificationsService,
    WhatsAppCloudNotificationAdapter,
    ResendEmailNotificationAdapter,
    {
      provide: NOTIFICATION_ADAPTERS,
      // Cada adapter conoce su audiencia: WhatsApp le escribe al comerciante y
      // Resend al comprador. Por eso el payload no lleva un campo que diga a
      // quien va dirigido.
      useFactory: (
        whatsAppAdapter: WhatsAppCloudNotificationAdapter,
        emailAdapter: ResendEmailNotificationAdapter,
      ) => [whatsAppAdapter, emailAdapter],
      inject: [WhatsAppCloudNotificationAdapter, ResendEmailNotificationAdapter],
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
