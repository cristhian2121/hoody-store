import { Link } from "react-router-dom";
import { useLanguage, formatPrice } from "@/lib/i18n";
import type { Product } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface ProductCardProps {
  product: Product;
  index?: number;
}

const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const { language, t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link
        to={`/producto/${product.slug}`}
        className="group block rounded-xl overflow-hidden border bg-card transition-shadow hover:shadow-lg"
      >
        <div className="aspect-square overflow-hidden bg-muted">
          <img
            src={product.images[0]}
            alt={product.name[language]}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>
        <div className="p-4">
          <Badge variant="secondary" className="mb-2 text-xs">
            {product.category === "hoodies"
              ? t("nav.hoodies")
              : t("nav.tshirts")}
          </Badge>
          <h3 className="font-semibold text-base leading-tight mb-1">
            {product.name[language]}
          </h3>
          <p className="text-primary font-bold text-lg">
            {formatPrice(product.price)}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            {product.colors.map((c) => (
              <span
                key={c.id}
                className="h-4 w-4 rounded-full border"
                style={{ backgroundColor: c.hex }}
                title={c.name[language]}
              />
            ))}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
