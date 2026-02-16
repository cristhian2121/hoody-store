import { Ruler } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Gender, ProductCategory } from "@/lib/types";
import { SIZE_DATA } from "@/lib/constants";

interface SizeGuideDialogProps {
  category: ProductCategory;
  gender: Gender;
}

export const SizeGuideDialog = ({ category, gender }: SizeGuideDialogProps) => {
  const { t } = useLanguage();
  const sizeTable = SIZE_DATA[category]?.[gender] || {};

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className="text-xs h-auto p-0">
          <Ruler className="h-3 w-3 mr-1" /> {t("product.sizeGuide")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("sizeGuide.title")} —{" "}
            {gender === "hombre"
              ? t("product.gender.hombre")
              : t("product.gender.mujer")}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4">{t("product.size")}</th>
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
  );
};
