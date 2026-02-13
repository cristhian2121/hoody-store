import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/lib/cart";
import { useLanguage, formatPrice } from "@/lib/i18n";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const CartDrawer = () => {
  const {
    items,
    removeItem,
    updateQuantity,
    subtotal,
    isCartOpen,
    setCartOpen,
  } = useCart();
  const { language, t } = useLanguage();

  return (
    <Sheet open={isCartOpen} onOpenChange={setCartOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            {t("cart.title")} ({items.length} {t("cart.items")})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <ShoppingBag className="h-16 w-16 opacity-20" />
            <p>{t("cart.empty")}</p>
            <Button
              variant="outline"
              onClick={() => setCartOpen(false)}
              asChild
            >
              <Link to="/">{t("cart.continue")}</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {items.map((item) => (
                <div
                  key={item.cartItemId}
                  className="flex gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="h-20 w-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.name[language]}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      {item.name[language]}
                    </h4>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {item.gender === "hombre"
                          ? t("product.gender.hombre")
                          : t("product.gender.mujer")}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {item.size}
                      </Badge>
                      <span
                        className="h-3 w-3 rounded-full border inline-block"
                        style={{ backgroundColor: item.color.hex }}
                      />
                    </div>
                    {item.personalization && (
                      <Badge variant="secondary" className="text-[10px] mt-1">
                        ✨ {t("cart.personalized")}
                      </Badge>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            updateQuantity(item.cartItemId, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            updateQuantity(item.cartItemId, item.quantity + 1)
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.cartItemId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("cart.subtotal")}
                </span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("cart.shipping")}
                </span>
                <span className="text-muted-foreground">
                  {t("cart.shippingCalc")}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>{t("cart.total")}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <Button
                className="w-full"
                size="lg"
                asChild
                onClick={() => setCartOpen(false)}
              >
                <Link to="/checkout">{t("cart.checkout")}</Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setCartOpen(false)}
              >
                {t("cart.continue")}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
