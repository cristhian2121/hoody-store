import { useLanguage } from "@/lib/i18n";
import { Label } from "@/components/ui/label";
import type { ImageElement, TextElement } from "@/lib/types";
import type { HorizontalPosition, VerticalPosition } from "@/lib/constants";
import {
  HORIZONTAL_POSITIONS,
  VERTICAL_POSITIONS,
} from "@/lib/constants";
import { isPositionActive } from "@/lib/utils/position";

interface PositionPresetsProps {
  activeElement: ImageElement | TextElement | null;
  onPositionSelect: (horizontal: HorizontalPosition, vertical: VerticalPosition) => void;
}

export const PositionPresets = ({
  activeElement,
  onPositionSelect,
}: PositionPresetsProps) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{t("editor.position")}</Label>
      <p className="text-xs text-muted-foreground">
        {activeElement
          ? t("editor.position.helper")
          : t("editor.position.empty")}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {VERTICAL_POSITIONS.flatMap((vertical) =>
          HORIZONTAL_POSITIONS.map((horizontal) => {
            const isActive = isPositionActive(activeElement, horizontal, vertical);
            return (
              <button
                key={`${vertical}-${horizontal}`}
                type="button"
                onClick={() => onPositionSelect(horizontal, vertical)}
                disabled={!activeElement}
                className={`rounded-lg border px-2 py-1 text-[10px] text-center transition ${
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted-foreground/60 hover:border-primary/60"
                }`}
              >
                <span className="block">{t(`editor.position.${vertical}`)}</span>
                <span className="block">{t(`editor.position.${horizontal}`)}</span>
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
};
