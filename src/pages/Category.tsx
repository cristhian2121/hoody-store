import { useParams } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { getByCategory } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import type { ProductCategory } from "@/lib/types";

const Category = () => {
  const { category } = useParams<{ category: string }>();
  const { t } = useLanguage();

  const validCategory =
    category === "hoodies" || category === "camisetas"
      ? (category as ProductCategory)
      : "hoodies";
  const categoryProducts = getByCategory(validCategory);
  const title =
    validCategory === "hoodies"
      ? t("category.hoodies")
      : t("category.camisetas");

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground">
          {categoryProducts.length} {t("category.results")}
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {categoryProducts.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </div>
  );
};

export default Category;
