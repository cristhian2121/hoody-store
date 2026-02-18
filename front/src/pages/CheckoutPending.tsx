import { Link, useSearchParams } from "react-router-dom";
import { Clock, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const CheckoutPending = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();

  // Extract MP return parameters
  const paymentId = searchParams.get("payment_id");
  const status = searchParams.get("status");
  const externalReference = searchParams.get("external_reference");
  const merchantOrderId = searchParams.get("merchant_order_id");

  return (
    <div className="container py-20 text-center space-y-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-500">
        <Clock className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold">{t("checkout.pending.title")}</h1>
      <p className="text-muted-foreground">{t("checkout.pending.message")}</p>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {t("checkout.pending.instructions")}
      </p>

      {/* Display MP return parameters for debugging/verification */}
      {(paymentId || externalReference || merchantOrderId) && (
        <div className="mt-8 p-4 bg-muted rounded-lg text-left max-w-md mx-auto space-y-2 text-sm">
          {externalReference && (
            <div>
              <span className="font-semibold">Referencia:</span> {externalReference}
            </div>
          )}
          {paymentId && (
            <div>
              <span className="font-semibold">ID de pago:</span> {paymentId}
            </div>
          )}
          {merchantOrderId && (
            <div>
              <span className="font-semibold">ID de orden:</span> {merchantOrderId}
            </div>
          )}
          {status && (
            <div>
              <span className="font-semibold">Estado:</span> {status}
            </div>
          )}
        </div>
      )}

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

export default CheckoutPending;
