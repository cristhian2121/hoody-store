import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";

const CheckoutSuccess = () => {
  const { t } = useLanguage();
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className="container py-20 text-center space-y-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
        <CheckCircle className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold">{t("checkout.success.title")}</h1>
      <p className="text-muted-foreground">{t("checkout.success.message")}</p>
      <div className="flex justify-center gap-3">
        <Button asChild>
          <Link to="/" className="inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            {t("cart.continue")}
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
