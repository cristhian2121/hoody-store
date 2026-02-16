import { Suspense, lazy, useMemo, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { products } from "@/lib/products";
import type { PersonalizationData, ProductCategory, ProductColor } from "@/lib/types";
import PersonalizationEditor from "@/components/PersonalizationEditor";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const GarmentViewer3D = lazy(() => import("@/components/garment3d/GarmentViewer3D"));

const Home = () => {
  const { t, language } = useLanguage();
  const [category, setCategory] = useState<ProductCategory>("hoodies");
  const product = useMemo(
    () => products.find((p) => p.category === category) ?? products[0],
    [category],
  );
  const [colorId, setColorId] = useState<string>(product.colors[0]?.id ?? "");

  // Keep color selection valid when switching category
  const selectedColor: ProductColor = useMemo(() => {
    const found = product.colors.find((c) => c.id === colorId);
    return found ?? product.colors[0];
  }, [product.colors, colorId]);
  const [savedPersonalization, setSavedPersonalization] = useState<
    PersonalizationData | undefined
  >();

  return (
    <div className="container py-8 md:py-10">
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 lg:gap-10">
        {/* Left panel */}
        <aside className="space-y-5">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
              {t("home.title")}
            </h1>
            <p className="mt-2 text-muted-foreground">{t("home.subtitle")}</p>
          </div>

          {/* Product type */}
          <section className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide">
              {t("home.productType")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={category === "hoodies" ? "default" : "outline"}
                onClick={() => {
                  setCategory("hoodies");
                  const next = products.find((p) => p.category === "hoodies");
                  setColorId(next?.colors[0]?.id ?? "");
                }}
                className="h-auto py-3 flex-col gap-2"
              >
                <img
                  src={products.find((p) => p.category === "hoodies")?.images[0]}
                  alt=""
                  className="h-16 w-full object-cover rounded-md"
                />
                <span>{t("home.productType.hoodie")}</span>
              </Button>
              <Button
                type="button"
                variant={category === "camisetas" ? "default" : "outline"}
                onClick={() => {
                  setCategory("camisetas");
                  const next = products.find((p) => p.category === "camisetas");
                  setColorId(next?.colors[0]?.id ?? "");
                }}
                className="h-auto py-3 flex-col gap-2"
              >
                <img
                  src={products.find((p) => p.category === "camisetas")?.images[0]}
                  alt=""
                  className="h-16 w-full object-cover rounded-md"
                />
                <span>{t("home.productType.tshirt")}</span>
              </Button>
            </div>
          </section>

          {/* Color picker */}
          <section className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide">
              {t("home.garmentColor")}
            </p>
            <div className="flex flex-wrap gap-2">
              {product.colors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColorId(c.id)}
                  className={`h-9 w-9 rounded-full border transition-shadow ${
                    selectedColor.id === c.id
                      ? "ring-2 ring-primary ring-offset-2"
                      : "hover:ring-2 hover:ring-primary/40 hover:ring-offset-2"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  aria-label={c.name[language]}
                />
              ))}
            </div>
          </section>

          {/* CTA */}
          <Button
            size="lg"
            className="w-full"
            onClick={() => toast.info(t("home.ctaHint"))}
          >
            {t("home.cta")}
          </Button>
        </aside>

        {/* Main editor */}
        <section className="rounded-2xl border bg-card p-4 md:p-6 space-y-4">
          <div className="aspect-[16/9] md:aspect-[21/9] relative">
            <Suspense
              fallback={
                <div className="h-full w-full rounded-xl border bg-muted/30 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    {t("home.loading3d")}
                  </p>
                </div>
              }
            >
              <GarmentViewer3D
                category={category}
                garmentColor={selectedColor.hex}
                personalization={savedPersonalization}
              />
            </Suspense>
            <div className="pointer-events-none absolute top-3 left-0 right-0 text-center">
              <span className="inline-flex rounded-full bg-background/70 backdrop-blur px-3 py-1 text-xs text-muted-foreground border">
                {t("home.rotateHint")}
              </span>
            </div>
          </div>
          <PersonalizationEditor
            category={category}
            garmentColor={selectedColor.hex}
            onSave={(data: PersonalizationData) => {
              // For MVP we keep the editor client-side only.
              // Persisting or adding to cart will be handled in later phases.
              setSavedPersonalization(data);
              toast.success(t("home.designSaved"));
            }}
          />
        </section>
      </div>
    </div>
  );
};

export default Home;

