import { useParams } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { useProducts } from "@/hooks/useProducts";
import ProductCard from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductCategory } from "@/lib/types";

const Category = () => {
  const { category } = useParams<{ category: string }>();
  const { t } = useLanguage();

  const validCategory: ProductCategory =
    category === "hoodies" || category === "camisetas" ? category : "hoodies";

  const { data: products = [], isLoading, isError } = useProducts(validCategory);

  const title = validCategory === "hoodies" ? t("category.hoodies") : t("category.camisetas");

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground">
          {isLoading ? "…" : `${products.length} ${t("category.results")}`}
        </p>
      </div>

      {isError && <p className="text-destructive">{t("catalog.error")}</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))
          : products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
      </div>
    </div>
  );
};

export default Category;
