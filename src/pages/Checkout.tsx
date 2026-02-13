import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  CreditCard,
  Building2,
  Landmark,
  ShieldCheck,
} from "lucide-react";
import { useLanguage, formatPrice } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type PaymentMethod = "card" | "pse" | "transfer";

const Checkout = () => {
  const { t, language } = useLanguage();
  const { items, subtotal } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 2000));
    setProcessing(false);
    toast.success(
      language === "es"
        ? "¡Pedido realizado con éxito!"
        : "Order placed successfully!",
    );
  };

  if (items.length === 0) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">{t("cart.empty")}</p>
        <Button variant="outline" asChild className="mt-4">
          <Link to="/">{t("cart.continue")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-6 md:py-10 max-w-5xl">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4" /> {t("cart.continue")}
      </Link>

      <h1 className="text-3xl font-bold mb-8">{t("checkout.title")}</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Contact */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">{t("checkout.contact")}</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="firstName" className="text-sm">
                    {t("checkout.firstName")}
                  </Label>
                  <Input id="firstName" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lastName" className="text-sm">
                    {t("checkout.lastName")}
                  </Label>
                  <Input id="lastName" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-sm">
                    {t("checkout.email")}
                  </Label>
                  <Input id="email" type="email" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-sm">
                    {t("checkout.phone")}
                  </Label>
                  <Input id="phone" type="tel" required />
                </div>
              </div>
            </section>

            {/* Shipping */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">
                {t("checkout.shipping")}
              </h2>
              <div className="space-y-1">
                <Label className="text-sm">{t("checkout.country")}</Label>
                <Select defaultValue="CO">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CO">Colombia 🇨🇴</SelectItem>
                    <SelectItem value="EC">Ecuador 🇪🇨</SelectItem>
                    <SelectItem value="PA">Panamá 🇵🇦</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="address" className="text-sm">
                  {t("checkout.address")}
                </Label>
                <Input id="address" required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="city" className="text-sm">
                    {t("checkout.city")}
                  </Label>
                  <Input id="city" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="state" className="text-sm">
                    {t("checkout.state")}
                  </Label>
                  <Input id="state" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="zip" className="text-sm">
                    {t("checkout.zip")}
                  </Label>
                  <Input id="zip" />
                </div>
              </div>
            </section>

            {/* Payment */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">{t("checkout.payment")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: "card" as const,
                    icon: CreditCard,
                    label: t("checkout.card"),
                  },
                  {
                    id: "pse" as const,
                    icon: Building2,
                    label: t("checkout.pse"),
                  },
                  {
                    id: "transfer" as const,
                    icon: Landmark,
                    label: t("checkout.bankTransfer"),
                  },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-colors ${
                      paymentMethod === pm.id
                        ? "border-primary bg-accent"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <pm.icon className="h-5 w-5 mb-2" />
                    <span className="text-sm font-medium">{pm.label}</span>
                  </button>
                ))}
              </div>

              {paymentMethod === "card" && (
                <div className="space-y-3 p-4 rounded-xl bg-muted/50">
                  <Input placeholder="1234 5678 9012 3456" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="MM/YY" />
                    <Input placeholder="CVC" />
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
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
                        {item.size} · {item.color.name[language]} · x
                        {item.quantity}
                      </p>
                      {item.personalization && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] mt-0.5"
                        >
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
                  <span className="text-muted-foreground">
                    {t("cart.subtotal")}
                  </span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("cart.shipping")}
                  </span>
                  <span className="text-muted-foreground">
                    {t("cart.shippingCalc")}
                  </span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>{t("cart.total")}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={processing}
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                {processing
                  ? t("checkout.processing")
                  : t("checkout.placeOrder")}
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">
                {language === "es"
                  ? "Pago seguro y encriptado"
                  : "Secure and encrypted payment"}
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Checkout;
