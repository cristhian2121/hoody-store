import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { NOTIFICATION_ADAPTERS } from "./notification.tokens";
import { WhatsAppCloudNotificationAdapter } from "./adapters/whatsapp-cloud.adapter";

@Module({
  providers: [
    NotificationsService,
    WhatsAppCloudNotificationAdapter,
    {
      provide: NOTIFICATION_ADAPTERS,
      useFactory: (whatsAppAdapter: WhatsAppCloudNotificationAdapter) => [whatsAppAdapter],
      inject: [WhatsAppCloudNotificationAdapter],
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
