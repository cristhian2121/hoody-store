import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const CheckoutCancel = () => {
  const { t } = useLanguage();

  return (
    <div className="container py-20 text-center space-y-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-destructive">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold">{t("checkout.cancel.title")}</h1>
      <p className="text-muted-foreground">{t("checkout.cancel.message")}</p>
      <div className="flex justify-center gap-3">
        <Button asChild>
          <Link to="/checkout" className="inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            {t("checkout.retry")}
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/">{t("cart.continue")}</Link>
        </Button>
      </div>
    </div>
  );
};

export default CheckoutCancel;
