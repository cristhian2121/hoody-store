import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { ChevronLeft, Palette } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage, formatPrice } from "@/lib/i18n";
import { getProduct } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { useProductSelection } from "@/hooks/useProductSelection";
import type { PersonalizationData } from "@/lib/types";
import PersonalizationEditor from "@/components/PersonalizationEditor";
import { DesignLayerPreview } from "@/components/product/DesignLayerPreview";
import { SizeGuideDialog } from "@/components/product/SizeGuideDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { language, t } = useLanguage();
  const { addItem } = useCart();
  const product = getProduct(slug || "");

  const [showEditor, setShowEditor] = useState(false);
  const [personalization, setPersonalization] = useState<
    PersonalizationData | undefined
  >();
  const [livePreview, setLivePreview] = useState<
    PersonalizationData | undefined
  >();

  const productSelection = product
    ? useProductSelection({
        product,
        defaultGender: "hombre",
        defaultColorIndex: 0,
      })
    : null;

  const previewData = showEditor
    ? (livePreview ?? personalization)
    : personalization;

  if (!product || !productSelection) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">{t("product.notFound")}</p>
        <Button variant="outline" asChild className="mt-4">
          <Link to="/">{t("product.backToHome")}</Link>
        </Button>
      </div>
    );
  }

  const {
    selectedGender,
    setSelectedGender,
    selectedSize,
    setSelectedSize,
    selectedColorIdx,
    setSelectedColorIdx,
    activeImage,
    setActiveImage,
    sizes,
    selectedColor,
    isValidSelection,
  } = productSelection;

  const handleAddToCart = () => {
    if (!isValidSelection) {
      toast.error(t("product.selectSize"));
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      gender: selectedGender,
      size: selectedSize,
      color: selectedColor,
      personalization,
      image: product.images[0],
      category: product.category,
    });
    toast.success(t("product.addedToCart"));
  };

  const handleSavePersonalization = (data: PersonalizationData) => {
    setPersonalization(data);
    setShowEditor(false);
    toast.success(t("product.designSaved"));
  };

  return (
    <div className="container py-6 md:py-10">
      <Link
        to={`/categoria/${product.category}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        {product.category === "hoodies" ? t("nav.hoodies") : t("nav.tshirts")}
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Images */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <div className="aspect-square rounded-2xl overflow-hidden bg-muted border relative">
            <img
              src={product.images[activeImage]}
              alt={product.name[language]}
              className="h-full w-full object-cover"
            />
            {previewData?.front && (
              <div className="absolute inset-0">
                <DesignLayerPreview layer={previewData.front} />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`h-16 w-16 rounded-lg overflow-hidden border-2 transition-colors ${activeImage === i ? "border-primary" : "border-transparent"}`}
              >
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </motion.div>

        {/* Details */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div>
            <Badge variant="secondary" className="mb-2">
              {product.category === "hoodies"
                ? t("nav.hoodies")
                : t("nav.tshirts")}
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {product.name[language]}
            </h1>
            <p className="text-2xl font-bold text-primary">
              {formatPrice(product.price)}
            </p>
          </div>

          <p className="text-muted-foreground leading-relaxed">
            {product.description[language]}
          </p>

          {/* Gender */}
          <div className="space-y-2">
            <label className="text-sm font-semibold uppercase tracking-wide">
              {t("product.gender")}
            </label>
            <div className="flex gap-2">
              {(["hombre", "mujer"] as const).map((g) => (
                <Button
                  key={g}
                  variant={selectedGender === g ? "default" : "outline"}
                  size="lg"
                  className="flex-1"
                  onClick={() => setSelectedGender(g)}
                >
                  {g === "hombre"
                    ? t("product.gender.hombre")
                    : t("product.gender.mujer")}
                </Button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold uppercase tracking-wide">
                {t("product.size")}
              </label>
              <SizeGuideDialog
                category={product.category}
                gender={selectedGender}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <Button
                  key={s}
                  variant={selectedSize === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSize(s)}
                  className="min-w-[3rem]"
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <label className="text-sm font-semibold uppercase tracking-wide">
              {t("product.color")}: {selectedColor.name[language]}
            </label>
            <div className="flex gap-2">
              {product.colors.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedColorIdx(i)}
                  className={`h-10 w-10 rounded-full border-2 transition-all ${selectedColorIdx === i ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name[language]}
                />
              ))}
            </div>
          </div>

          {/* Personalize */}
          <div>
            <Button
              variant="outline"
              onClick={() => setShowEditor(!showEditor)}
              className="w-full"
            >
              <Palette className="h-4 w-4 mr-2" />
              {t("product.personalize")}
              {personalization && (
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  ✨
                </Badge>
              )}
            </Button>
          </div>

          {/* Add to cart */}
          <Button
            size="lg"
            className="w-full text-base"
            onClick={handleAddToCart}
          >
            {t("product.addToCart")} — {formatPrice(product.price)}
          </Button>
        </motion.div>
      </div>

      {/* Editor */}
      {showEditor && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-10 p-6 rounded-2xl border bg-card"
        >
          <PersonalizationEditor
            category={product.category}
            garmentColor={selectedColor.hex}
            garmentImage={product.images[activeImage]}
            onSave={handleSavePersonalization}
            onChange={setLivePreview}
            initialData={personalization}
          />
        </motion.div>
      )}
    </div>
  );
};

export default ProductDetail;
