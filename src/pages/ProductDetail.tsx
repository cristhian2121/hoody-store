import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { ChevronLeft, Palette, Ruler } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage, formatPrice } from "@/lib/i18n";
import { getProduct } from "@/lib/products";
import { useCart } from "@/lib/cart";
import type { Gender, PersonalizationData } from "@/lib/types";
import PersonalizationEditor from "@/components/PersonalizationEditor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const SIZE_DATA: Record<
  string,
  Record<
    Gender,
    Record<string, { chest: string; length: string; shoulder: string }>
  >
> = {
  hoodies: {
    hombre: {
      S: { chest: "96", length: "68", shoulder: "44" },
      M: { chest: "102", length: "70", shoulder: "46" },
      L: { chest: "108", length: "72", shoulder: "48" },
      XL: { chest: "114", length: "74", shoulder: "50" },
      XXL: { chest: "120", length: "76", shoulder: "52" },
    },
    mujer: {
      XS: { chest: "84", length: "60", shoulder: "38" },
      S: { chest: "90", length: "62", shoulder: "40" },
      M: { chest: "96", length: "64", shoulder: "42" },
      L: { chest: "102", length: "66", shoulder: "44" },
      XL: { chest: "108", length: "68", shoulder: "46" },
    },
  },
  camisetas: {
    hombre: {
      S: { chest: "92", length: "70", shoulder: "43" },
      M: { chest: "98", length: "72", shoulder: "45" },
      L: { chest: "104", length: "74", shoulder: "47" },
      XL: { chest: "110", length: "76", shoulder: "49" },
      XXL: { chest: "116", length: "78", shoulder: "51" },
    },
    mujer: {
      XS: { chest: "80", length: "60", shoulder: "36" },
      S: { chest: "86", length: "62", shoulder: "38" },
      M: { chest: "92", length: "64", shoulder: "40" },
      L: { chest: "98", length: "66", shoulder: "42" },
      XL: { chest: "104", length: "68", shoulder: "44" },
    },
  },
};

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { language, t } = useLanguage();
  const { addItem } = useCart();
  const product = getProduct(slug || "");

  const [selectedGender, setSelectedGender] = useState<Gender>("hombre");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [personalization, setPersonalization] = useState<
    PersonalizationData | undefined
  >();
  const [activeImage, setActiveImage] = useState(0);

  if (!product) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">Producto no encontrado</p>
        <Button variant="outline" asChild className="mt-4">
          <Link to="/">Volver al inicio</Link>
        </Button>
      </div>
    );
  }

  const sizes = product.sizes[selectedGender];
  const selectedColor = product.colors[selectedColorIdx];
  const sizeTable = SIZE_DATA[product.category]?.[selectedGender] || {};

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error(language === "es" ? "Selecciona una talla" : "Select a size");
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
    toast.success(
      language === "es" ? "¡Agregado al carrito!" : "Added to cart!",
    );
  };

  const handleSavePersonalization = (data: PersonalizationData) => {
    setPersonalization(data);
    setShowEditor(false);
    toast.success(language === "es" ? "Diseño guardado" : "Design saved");
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
          <div className="aspect-square rounded-2xl overflow-hidden bg-muted border">
            <img
              src={product.images[activeImage]}
              alt={product.name[language]}
              className="h-full w-full object-cover"
            />
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

          {/* Gender - most prominent */}
          <div className="space-y-2">
            <label className="text-sm font-semibold uppercase tracking-wide">
              {t("product.gender")}
            </label>
            <div className="flex gap-2">
              {(["hombre", "mujer"] as Gender[]).map((g) => (
                <Button
                  key={g}
                  variant={selectedGender === g ? "default" : "outline"}
                  size="lg"
                  className="flex-1"
                  onClick={() => {
                    setSelectedGender(g);
                    setSelectedSize("");
                  }}
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
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs h-auto p-0"
                  >
                    <Ruler className="h-3 w-3 mr-1" /> {t("product.sizeGuide")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {t("sizeGuide.title")} —{" "}
                      {selectedGender === "hombre"
                        ? t("product.gender.hombre")
                        : t("product.gender.mujer")}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4">
                            {t("product.size")}
                          </th>
                          <th className="text-left py-2 pr-4">
                            {t("sizeGuide.chest")} ({t("sizeGuide.cm")})
                          </th>
                          <th className="text-left py-2 pr-4">
                            {t("sizeGuide.length")} ({t("sizeGuide.cm")})
                          </th>
                          <th className="text-left py-2">
                            {t("sizeGuide.shoulder")} ({t("sizeGuide.cm")})
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(sizeTable).map(([size, data]) => (
                          <tr key={size} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-medium">{size}</td>
                            <td className="py-2 pr-4">{data.chest}</td>
                            <td className="py-2 pr-4">{data.length}</td>
                            <td className="py-2">{data.shoulder}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DialogContent>
              </Dialog>
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
            onSave={handleSavePersonalization}
            initialData={personalization}
          />
        </motion.div>
      )}
    </div>
  );
};

export default ProductDetail;
