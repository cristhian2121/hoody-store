import Index from "./Index";
import { useLanguage } from "@/lib/i18n";

const HomeLegacy = () => {
  const { t } = useLanguage();

  return (
    <div>
      <div className="border-b bg-secondary/50">
        <div className="container py-3">
          <p className="text-sm text-muted-foreground">{t("home.legacyBanner")}</p>
        </div>
      </div>
      <Index />
    </div>
  );
};

export default HomeLegacy;

