import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, Clock, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { confirmCheckoutPayment } from "@/lib/mercadopago";

type ConfirmationState = "idle" | "loading" | "confirmed" | "pending" | "error";

const CheckoutSuccess = () => {
  const { t } = useLanguage();
  const { clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>("idle");

  const paymentId = searchParams.get("payment_id");
  const externalReference = searchParams.get("external_reference");

  const confirmationMessage = useMemo(() => {
    if (!paymentId) return t("checkout.success.noPaymentId");
    if (confirmationState === "loading") return t("checkout.success.verifying");
    if (confirmationState === "pending") return t("checkout.pending.message");
    if (confirmationState === "error") return t("checkout.success.verifyFailed");
    return t("checkout.success.message");
  }, [confirmationState, paymentId, t]);

  useEffect(() => {
    if (!paymentId) return;

    let active = true;
    const confirmPayment = async () => {
      setConfirmationState("loading");
      try {
        const result = await confirmCheckoutPayment(paymentId);
        if (!active) return;

        if (result.status === "paid") {
          // El carrito solo se vacia con el pago confirmado. Un pago en efectivo
          // por Efecty puede tardar horas: vaciarlo antes dejaria a la persona
          // sin forma de reintentar si al final no paga.
          clearCart();
          setConfirmationState("confirmed");
          return;
        }

        if (result.status === "payment_pending") {
          setConfirmationState("pending");
          return;
        }

        setConfirmationState("error");
      } catch (error) {
        console.error(error);
        if (active) setConfirmationState("error");
      }
    };

    void confirmPayment();

    return () => {
      active = false;
    };
  }, [clearCart, paymentId]);

  const pending = confirmationState === "pending";

  return (
    <div className="container space-y-6 py-20 text-center">
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
          pending ? "bg-amber-500/20 text-amber-600" : "bg-emerald-500/20 text-emerald-500"
        }`}
      >
        {pending ? <Clock className="h-8 w-8" /> : <CheckCircle className="h-8 w-8" />}
      </div>

      <h1 className="text-2xl font-bold">
        {pending ? t("checkout.pending.title") : t("checkout.success.title")}
      </h1>
      <p className="text-muted-foreground">{confirmationMessage}</p>

      {pending && (
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {t("checkout.pending.instructions")}
        </p>
      )}

      {/* La referencia es lo unico que le sirve al cliente si tiene que
          escribirnos; los ids internos de Mercado Pago no le dicen nada. */}
      {externalReference && (
        <p className="text-sm text-muted-foreground">
          {t("checkout.success.reference")}:{" "}
          <span className="font-mono font-semibold">
            {externalReference.slice(0, 8).toUpperCase()}
          </span>
        </p>
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
