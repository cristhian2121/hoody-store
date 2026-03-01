export interface PaidOrderNotificationPayload {
  orderId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  shippingAddress: string;
  department: string;
  city: string;
  country: string;
  shippingCost: number;
  totalPaid: number;
  currency: string;
  items: Array<{
    name: string;
    quantity: number;
  }>;
}

export interface NotificationAdapter {
  readonly channel: string;
  sendPaidOrderNotification(payload: PaidOrderNotificationPayload): Promise<void>;
}
