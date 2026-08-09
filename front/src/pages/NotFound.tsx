import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const { t } = useLanguage();

  return (
    <div className="container py-24 text-center">
      <h1 className="mb-2 text-5xl font-extrabold">404</h1>
      <p className="mb-6 text-lg text-muted-foreground">{t("notFound.message")}</p>
      <Button asChild>
        <Link to="/">{t("product.backToHome")}</Link>
      </Button>
    </div>
  );
};

export default NotFound;
