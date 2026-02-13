import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, Menu, X, Globe } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import ThemeToggle from "./ThemeToggle";
import CartDrawer from "./CartDrawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { t, language, setLanguage } = useLanguage();
  const { totalItems, setCartOpen } = useCart();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { to: "/", label: t("nav.home") },
    { to: "/categoria/hoodies", label: t("nav.hoodies") },
    { to: "/categoria/camisetas", label: t("nav.tshirts") },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-xl tracking-tight"
          >
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-extrabold">
                CW
              </span>
            </div>
            <span>CustomWear</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLanguage(language === "es" ? "en" : "es")}
              aria-label="Toggle language"
            >
              <Globe className="h-5 w-5" />
            </Button>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setCartOpen(true)}
              aria-label={t("nav.cart")}
            >
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {totalItems}
                </Badge>
              )}
            </Button>

            {/* Mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <div className="flex flex-col gap-2 mt-8">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className={`px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        isActive(link.to)
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">{children}</main>

      {/* Cart drawer */}
      <CartDrawer />

      {/* Footer */}
      <footer className="border-t bg-secondary/50">
        <div className="container py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 font-bold text-lg">
              <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-extrabold">
                  CW
                </span>
              </div>
              CustomWear
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>{t("footer.about")}</span>
              <span>{t("footer.help")}</span>
              <span>{t("footer.terms")}</span>
              <span>{t("footer.privacy")}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 CustomWear. {t("footer.rights")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
