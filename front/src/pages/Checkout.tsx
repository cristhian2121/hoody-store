import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useLanguage, formatPrice } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { useCheckoutLocations } from "@/hooks/useCheckoutLocations";
import { useShippingQuote } from "@/hooks/useShippingQuote";
import { SHIPPING_DAYS } from "@/lib/shipping";
import { COLOMBIA_COUNTRY_CODE, COLOMBIA_COUNTRY_NAME } from "@/lib/locations";
import { createCheckoutSession } from "@/lib/mercadopago";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { toast } from "sonner";

const Checkout = () => {
  const { t, language } = useLanguage();
  const { items, subtotal } = useCart();
  const [processing, setProcessing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const {
    departments,
    cities,
    selectedDepartmentCode,
    setSelectedDepartmentCode,
    selectedCityCode,
    setSelectedCityCode,
    selectedDepartment,
    selectedCity,
    loadingDepartments,
    loadingCities,
    error: locationError,
  } = useCheckoutLocations();

  const {
    quote,
    shippingCost,
    loading: shippingLoading,
    error: shippingError,
  } = useShippingQuote({
    countryCode: COLOMBIA_COUNTRY_CODE,
    departmentCode: selectedDepartmentCode,
    cityCode: selectedCityCode,
  });

  const total = subtotal + shippingCost;
  const shippingReady = Boolean(quote && selectedDepartment && selectedCity);

  useEffect(() => {
    if (locationError) {
      toast.error(locationError);
    }
  }, [locationError]);

  useEffect(() => {
    if (shippingError) {
      toast.error(shippingError);
    }
  }, [shippingError]);

  const handleCheckout = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedDepartment || !selectedCity) {
      toast.error(t("checkout.selectCity"));
      return;
    }

    if (!shippingReady) {
      toast.error(t("shipping.pending"));
      return;
    }

    if (items.length === 0) {
      return;
    }

    setProcessing(true);
    try {
      await createCheckoutSession({
        items: items.map((item) => ({
          productId: item.productId,
          name: item.name[language],
          price: item.price,
          quantity: item.quantity,
          gender: item.gender,
          size: item.size,
          color: item.color,
          category: item.category,
          personalization: item.personalization,
          description: `${item.size} · ${item.color.name[language]}`,
          image: item.image,
        })),
        customer: {
          firstName,
          lastName,
          email,
          phone,
        },
        shipping: {
          countryCode: COLOMBIA_COUNTRY_CODE,
          departmentCode: selectedDepartment.code,
          cityCode: selectedCity.code,
          address,
          postalCode: postalCode || undefined,
        },
      });
    } catch (error) {
      console.error(error);
      toast.error(t("checkout.paymentError"));
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
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lastName" className="text-sm">
                    {t("checkout.lastName")}
                  </Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-sm">
                    {t("checkout.email")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-sm">
                    {t("checkout.phone")}
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold">{t("checkout.shipping")}</h2>
              <div className="space-y-1">
                <Label htmlFor="country" className="text-sm">
                  {t("checkout.country")}
                </Label>
                <Input
                  id="country"
                  value={COLOMBIA_COUNTRY_NAME}
                  readOnly
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">{t("checkout.state")}</Label>
                  <Select
                    value={selectedDepartmentCode}
                    onValueChange={setSelectedDepartmentCode}
                    disabled={loadingDepartments}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingDepartments
                            ? "Cargando departamentos..."
                            : t("checkout.state")
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((department) => (
                        <SelectItem key={department.id} value={department.code}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">{t("checkout.city")}</Label>
                  <Select
                    value={selectedCityCode}
                    onValueChange={setSelectedCityCode}
                    disabled={!selectedDepartmentCode || loadingCities}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !selectedDepartmentCode
                            ? t("checkout.selectCity")
                            : loadingCities
                              ? "Cargando ciudades..."
                              : t("checkout.city")
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.id} value={city.code}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="address" className="text-sm">
                    {t("checkout.address")}
                  </Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="postalCode" className="text-sm">
                    {t("checkout.zip")}
                  </Label>
                  <Input
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </div>
              </div>

              <p className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary">
                {shippingReady && selectedCity
                  ? `${t("shipping.deliveryTime")} · ${SHIPPING_DAYS} ${t(
                      "shipping.businessDays",
                    )} · ${selectedCity.name}`
                  : t("shipping.selectCityHint")}
              </p>

              <p className="text-sm text-muted-foreground">
                {t("shipping.cost")}:{" "}
                {shippingReady ? formatPrice(shippingCost) : shippingLoading ? "..." : t("shipping.pending")}
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold">{t("checkout.payment")}</h2>
              <div className="space-y-3 rounded-2xl border border-border bg-muted/50 p-4 text-sm">
                <p>{t("checkout.paymentInfo")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("checkout.secure")}
                </p>
              </div>
            </section>
          </div>

          <div className="lg:col-span-1">
            <OrderSummary
              shippingReady={shippingReady}
              shippingLoading={shippingLoading}
              shippingCost={shippingCost}
              total={total}
              processing={processing}
              checkoutDisabled={shippingLoading || !shippingReady}
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default Checkout;
