export interface PaidOrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  size: string;
  colorName: string;
  gender: string;
  /** Cierto si la linea lleva estampado, en cualquiera de sus lados. */
  personalized: boolean;
}

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
  subtotal: number;
  totalPaid: number;
  currency: string;
  items: PaidOrderItem[];
}

export interface PrintAssetsReadyPayload {
  orderId: string;
  customerName: string;
  /** Cuantos archivos quedaron listos. */
  fileCount: number;
  /** Link firmado y con expiracion al ZIP con todo el arte. */
  downloadUrl: string;
  expiresInMinutes: number;
}

export interface NotificationAdapter {
  readonly channel: string;

  sendPaidOrderNotification(payload: PaidOrderNotificationPayload): Promise<void>;

  /**
   * Aviso de que el arte quedo listo para descargar. Opcional: solo lo
   * implementan los canales del comerciante, no los del cliente.
   */
  sendPrintAssetsReadyNotification?(payload: PrintAssetsReadyPayload): Promise<void>;
}
