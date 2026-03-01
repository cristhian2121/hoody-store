import * as React from "react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "./button";

interface ColorOption {
  id: string;
  name: { es: string; en: string };
  hex: string;
}

interface ColorSelectorProps {
  colors: ColorOption[];
  value: string;
  onChange: (hex: string) => void;
}

export const ColorSelector: React.FC<ColorSelectorProps> = ({
  colors,
  value,
  onChange,
}) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{t("editor.garmentColor")}</label>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <Button
            key={color.id}
            variant="outline"
            size="sm"
            className={`w-8 h-8 p-0 border-2 ${
              value === color.hex
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-muted-foreground/60"
            }`}
            style={{ backgroundColor: color.hex }}
            onClick={() => onChange(color.hex)}
            title={color.name.es} // Assuming es for now, can use t for i18n
          />
        ))}
      </div>
    </div>
  );
};
