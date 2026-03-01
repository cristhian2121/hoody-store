import { ShieldCheck } from "lucide-react";
import { useLanguage, formatPrice } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface OrderSummaryProps {
  shippingReady: boolean;
  shippingLoading: boolean;
  shippingCost: number;
  total: number;
  processing: boolean;
  checkoutDisabled: boolean;
}

export const OrderSummary = ({
  shippingReady,
  shippingLoading,
  shippingCost,
  total,
  processing,
  checkoutDisabled,
}: OrderSummaryProps) => {
  const { t, language } = useLanguage();
  const { items, subtotal } = useCart();

  return (
    <div className="sticky top-24 rounded-2xl border bg-card p-6 space-y-4">
      <h2 className="font-semibold text-lg">{t("checkout.review")}</h2>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {items.map((item) => (
          <div key={item.cartItemId} className="flex gap-3">
            <div className="h-14 w-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
              <img
                src={item.image}
                alt={item.name[language]}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {item.name[language]}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.size} · {item.color.name[language]} · x{item.quantity}
              </p>
              {item.personalization && (
                <Badge variant="secondary" className="text-[10px] mt-0.5">
                  ✨
                </Badge>
              )}
            </div>
            <span className="text-sm font-medium">
              {formatPrice(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>
      <Separator />
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("cart.subtotal")}</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("shipping.cost")}</span>
          <span>
            {shippingReady ? formatPrice(shippingCost) : shippingLoading ? "..." : t("shipping.pending")}
          </span>
        </div>
      </div>
      <Separator />
      <div className="flex justify-between font-bold text-lg">
        <span>{t("cart.total")}</span>
        <span>{formatPrice(total)}</span>
      </div>
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={processing || checkoutDisabled}
      >
        <ShieldCheck className="h-4 w-4 mr-2" />
        {processing ? t("checkout.processing") : t("checkout.payWithMercadoPago")}
      </Button>
      <p className="text-[10px] text-center text-muted-foreground">
        {t("checkout.secure")}
      </p>
    </div>
  );
};
