import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useLanguage, formatPrice } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { useCitySearch } from "@/hooks/useCitySearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { COLOMBIA_CITIES, SHIPPING_DAYS } from "@/lib/shipping";
import { createCheckoutSession } from "@/lib/stripe";
import { CitySearchInput } from "@/components/checkout/CitySearchInput";
import { OrderSummary } from "@/components/checkout/OrderSummary";

const Checkout = () => {
  const { t, language } = useLanguage();
  const { items, subtotal } = useCart();
  const [processing, setProcessing] = useState(false);

  const defaultCity = COLOMBIA_CITIES[0];
  const citySearch = useCitySearch(defaultCity);

  const {
    selectedCity,
    cityQuery,
    showCityOptions,
    filteredCities,
    handleCityInput,
    handleCitySelect,
    handleFocus,
    handleBlur,
  } = citySearch;

  const shippingCost = selectedCity ? selectedCity.shippingCost : 0;
  const total = subtotal + shippingCost;

  const handleCheckout = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCity) {
      toast.error(t("checkout.selectCity"));
      return;
    }
    if (items.length === 0) return;

    setProcessing(true);
    try {
      const baseUrl = window.location.origin;
      await createCheckoutSession({
        items: items.map((item) => ({
          name: item.name[language],
          price: item.price,
          quantity: item.quantity,
          description: `${item.size} · ${item.color.name[language]}`,
          image: item.image,
        })),
        shippingCost,
        shippingCity: selectedCity.name,
        successUrl: `${baseUrl}/checkout/success`,
        cancelUrl: `${baseUrl}/checkout/cancel`,
      });
    } catch (error) {
      console.error(error);
      toast.error(t("checkout.stripeError"));
    } finally {
      setProcessing(false);
    }
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

      <form onSubmit={handleCheckout}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
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

            <section className="space-y-4">
              <h2 className="text-lg font-semibold">{t("checkout.shipping")}</h2>
              <CitySearchInput
                cityQuery={cityQuery}
                selectedCity={selectedCity}
                showCityOptions={showCityOptions}
                filteredCities={filteredCities}
                onCityInput={handleCityInput}
                onCitySelect={handleCitySelect}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">{t("checkout.state")}</Label>
                  <Input
                    value={selectedCity?.department ?? ""}
                    readOnly
                    placeholder="Departamento"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="zip" className="text-sm">
                    {t("checkout.zip")}
                  </Label>
                  <Input id="zip" />
                </div>
              </div>
              <p className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary">
                {selectedCity
                  ? `${t("shipping.deliveryTime")} · ${SHIPPING_DAYS} ${t(
                      "shipping.businessDays",
                    )} · ${selectedCity.name}`
                  : t("shipping.selectCityHint")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("shipping.cost")}:{" "}
                {selectedCity ? formatPrice(shippingCost) : t("shipping.pending")}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold">{t("checkout.payment")}</h2>
              <div className="space-y-3 rounded-2xl border border-border bg-muted/50 p-4 text-sm">
                <p>{t("checkout.stripeInfo")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("checkout.secure")}
                </p>
              </div>
            </section>
          </div>

          <div className="lg:col-span-1">
            <OrderSummary
              selectedCity={selectedCity}
              shippingCost={shippingCost}
              total={total}
              processing={processing}
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default Checkout;
