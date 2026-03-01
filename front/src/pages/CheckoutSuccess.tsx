import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { confirmCheckoutPayment } from "@/lib/mercadopago";

type ConfirmationState = "idle" | "loading" | "confirmed" | "error";

const CheckoutSuccess = () => {
  const { t } = useLanguage();
  const { clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>("idle");

  const paymentId = searchParams.get("payment_id");
  const status = searchParams.get("status");
  const externalReference = searchParams.get("external_reference");
  const merchantOrderId = searchParams.get("merchant_order_id");

  const confirmationMessage = useMemo(() => {
    if (!paymentId) {
      return t("checkout.success.noPaymentId");
    }
    if (confirmationState === "loading") {
      return t("checkout.success.verifying");
    }
    if (confirmationState === "confirmed") {
      return t("checkout.success.message");
    }
    if (confirmationState === "error") {
      return t("checkout.success.verifyFailed");
    }
    return t("checkout.success.message");
  }, [confirmationState, paymentId, t]);

  useEffect(() => {
    if (!paymentId) {
      return;
    }

    let active = true;
    const confirmPayment = async () => {
      setConfirmationState("loading");
      try {
        const result = await confirmCheckoutPayment(paymentId);
        if (!active) {
          return;
        }

        if (result.status === "paid") {
          clearCart();
          setConfirmationState("confirmed");
          return;
        }

        setConfirmationState("error");
      } catch (error) {
        console.error(error);
        if (active) {
          setConfirmationState("error");
        }
      }
    };

    void confirmPayment();

    return () => {
      active = false;
    };
  }, [clearCart, paymentId]);

  return (
    <div className="container py-20 text-center space-y-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
        <CheckCircle className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold">{t("checkout.success.title")}</h1>
      <p className="text-muted-foreground">{confirmationMessage}</p>

      {(externalReference || paymentId || merchantOrderId) && (
        <div className="mt-8 p-4 bg-muted rounded-lg text-left max-w-md mx-auto space-y-2 text-sm">
          {externalReference && (
            <div>
              <span className="font-semibold">Referencia de orden:</span> {externalReference}
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

export default CheckoutSuccess;
