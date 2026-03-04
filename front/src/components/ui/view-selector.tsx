import * as React from "react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import type { ProductViewSide } from "@/lib/types";

interface ViewSelectorProps {
  supportedViews: ProductViewSide[];
  activeView: ProductViewSide;
  onViewChange: (view: ProductViewSide) => void;
}

export const ViewSelector: React.FC<ViewSelectorProps> = ({
  supportedViews,
  activeView,
  onViewChange,
}) => {
  const { t } = useLanguage();

  // Si solo hay una vista, no mostrar selector
  if (supportedViews.length === 1) {
    return null;
  }

  return (
    <div className="flex gap-2">
      {supportedViews.map((view) => (
        <Button
          key={view}
          variant={activeView === view ? "default" : "outline"}
          size="sm"
          onClick={() => onViewChange(view)}
          className="flex-1"
        >
          {t(`editor.view.${view}`)}
        </Button>
      ))}
    </div>
  );
};
