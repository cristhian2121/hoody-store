import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n";
import { products } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero.jpg";

const Index = () => {
  const { t } = useLanguage();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/20" />
        </div>
        <div className="container relative py-24 md:py-36 lg:py-44">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-xl"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-4">
              {t("hero.title")}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/categoria/hoodies">
                  {t("hero.cta")} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/categoria/hoodies"
            className="group relative aspect-[16/9] rounded-2xl overflow-hidden border bg-card"
          >
            <img
              src={products[0].images[0]}
              alt="Hoodies"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
            <div className="absolute bottom-6 left-6">
              <h2 className="text-2xl font-bold text-primary-foreground">
                {t("nav.hoodies")}
              </h2>
            </div>
          </Link>
          <Link
            to="/categoria/camisetas"
            className="group relative aspect-[16/9] rounded-2xl overflow-hidden border bg-card"
          >
            <img
              src={products[2].images[0]}
              alt="Camisetas"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
            <div className="absolute bottom-6 left-6">
              <h2 className="text-2xl font-bold text-primary-foreground">
                {t("nav.tshirts")}
              </h2>
            </div>
          </Link>
        </div>
      </section>

      {/* Featured products */}
      <section className="container pb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold">
            {t("products.featured")}
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      </section>
    </>
  );
};

export default Index;
