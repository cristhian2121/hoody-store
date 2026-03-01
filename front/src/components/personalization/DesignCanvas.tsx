import { Upload } from "lucide-react";
import type { DesignLayer, ImageElement, TextElement } from "@/lib/types";
import type { ProductCategory, PrintSide } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";
import { PRINT_AREAS } from "@/lib/constants";
import { GarmentPreview } from "./GarmentPreview";
import type { RefObject } from "react";

interface DesignCanvasProps {
  category: ProductCategory;
  garmentColor: string;
  garmentImage?: string;
  garmentBase?: string;
  activeSide: PrintSide;
  currentLayer: DesignLayer;
  selectedTextId: string | null;
  containerRef: RefObject<HTMLDivElement>;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onImagePointerDown: (e: React.PointerEvent) => void;
  onTextPointerDown: (e: React.PointerEvent, id: string) => void;
}

export const DesignCanvas = ({
  category,
  garmentColor,
  garmentImage,
  garmentBase,
  activeSide,
  currentLayer,
  selectedTextId,
  containerRef,
  onPointerMove,
  onPointerUp,
  onImagePointerDown,
  onTextPointerDown,
}: DesignCanvasProps) => {
  const { t } = useLanguage();
  const canvasPrintArea = PRINT_AREAS[category][activeSide];

  return (
    <div
      ref={containerRef}
      className="relative aspect-[8/6] rounded-xl overflow-x-hidden border-2 border-dashed border-border bg-muted/30 select-none"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ touchAction: "none" }}
    >
      <GarmentPreview
        category={category}
        garmentColor={garmentColor}
        garmentImage={garmentImage}
        garmentBase={garmentBase}
      />

      <div
        className="absolute border-2 border-dashed border-primary/20 rounded-lg flex items-center justify-center transition-colors"
        style={{
          ...canvasPrintArea,
          background:
            "repeating-linear-gradient(45deg, transparent, transparent 10px, hsl(var(--primary) / 0.02) 10px, hsl(var(--primary) / 0.02) 20px)",
        }}
      >
        {!currentLayer.image && currentLayer.texts.length === 0 && (
          <div className="text-center space-y-1">
            <Upload className="h-6 w-6 mx-auto text-muted-foreground/30" />
            <span className="text-xs text-muted-foreground/40 block">
              {t("editor.printArea")}
            </span>
          </div>
        )}
      </div>

      {currentLayer.image && (
        <div
          className="absolute cursor-grab active:cursor-grabbing ring-2 ring-primary/40 ring-offset-1 rounded-sm"
          style={{
            left: `${currentLayer.image.x}%`,
            top: `${currentLayer.image.y}%`,
            transform: `translate(-50%, -50%) scale(${currentLayer.image.scale}) rotate(${currentLayer.image.rotation}deg)`,
          }}
          onPointerDown={onImagePointerDown}
        >
          <img
            src={currentLayer.image.src}
            alt="Design"
            className="w-28 sm:w-36 pointer-events-none"
            draggable={false}
            style={{ mixBlendMode: "multiply" }}
          />
        </div>
      )}

      {currentLayer.texts.map((txt) => (
        <div
          key={txt.id}
          className={`absolute cursor-grab active:cursor-grabbing px-1 ${
            selectedTextId === txt.id ? "ring-2 ring-primary rounded" : ""
          }`}
          style={{
            left: `${txt.x}%`,
            top: `${txt.y}%`,
            transform: `translate(-50%, -50%) scale(${txt.scale}) rotate(${txt.rotation}deg)`,
            fontFamily: txt.fontFamily,
            fontSize: `${txt.fontSize}px`,
            color: txt.color,
            fontWeight: txt.bold ? "bold" : "normal",
            fontStyle: txt.italic ? "italic" : "normal",
            mixBlendMode: "multiply",
          }}
          onPointerDown={(e) => onTextPointerDown(e, txt.id)}
        >
          {txt.content}
        </div>
      ))}

      <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-muted-foreground/50">
        {t("editor.dragHint")}
      </p>
    </div>
  );
};
