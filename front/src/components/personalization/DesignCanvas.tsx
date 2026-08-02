import { Upload } from "lucide-react";
import type { DesignLayer } from "@/lib/types";
import type { ProductCategory, PrintSide } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";
import { PRINT_AREAS } from "@/lib/constants";
import { imageWidthCqw, textFontSizeCqw } from "@/lib/utils/print-geometry";
import { GarmentPreview } from "./GarmentPreview";
import { PrintAreaBox } from "./PrintAreaBox";
import type { RefObject } from "react";

interface DesignCanvasProps {
  category: ProductCategory;
  garmentColor: string;
  garmentImage?: string;
  activeSide: PrintSide;
  currentLayer: DesignLayer;
  selectedTextId: string | null;
  /** Se aplica al area de estampado: las coordenadas son % de ella. */
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
  const area = PRINT_AREAS[category][activeSide];
  const isEmpty = !currentLayer.image && currentLayer.texts.length === 0;

  return (
    <div className="relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-dashed border-border bg-muted/30 select-none">
      <GarmentPreview
        category={category}
        garmentColor={garmentColor}
        garmentImage={garmentImage}
        side={activeSide}
      />

      <PrintAreaBox
        area={area}
        boxRef={containerRef}
        className="border-2 border-dashed border-primary/20 rounded-lg"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(45deg, transparent, transparent 10px, hsl(var(--primary) / 0.02) 10px, hsl(var(--primary) / 0.02) 20px)",
          }}
        />

        {isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
            <Upload className="h-6 w-6 text-muted-foreground/30" />
            <span className="text-xs text-muted-foreground/40">{t("editor.printArea")}</span>
          </div>
        )}

        {currentLayer.image && (
          <div
            className="absolute cursor-grab active:cursor-grabbing ring-2 ring-primary/40 ring-offset-1 rounded-sm"
            style={{
              left: `${currentLayer.image.x}%`,
              top: `${currentLayer.image.y}%`,
              // El ancho se expresa en cqw (fraccion del area), no en una clase
              // fija por breakpoint: asi el preview coincide con el archivo que
              // se imprime a cualquier ancho de pantalla.
              width: `${imageWidthCqw(currentLayer.image.scale)}cqw`,
              transform: `translate(-50%, -50%) rotate(${currentLayer.image.rotation}deg)`,
            }}
            onPointerDown={onImagePointerDown}
          >
            <img
              src={currentLayer.image.src}
              alt="Design"
              className="w-full pointer-events-none"
              draggable={false}
            />
          </div>
        )}

        {currentLayer.texts.map((txt) => (
          <div
            key={txt.id}
            className={`absolute cursor-grab active:cursor-grabbing px-1 whitespace-nowrap ${
              selectedTextId === txt.id ? "ring-2 ring-primary rounded" : ""
            }`}
            style={{
              left: `${txt.x}%`,
              top: `${txt.y}%`,
              transform: `translate(-50%, -50%) rotate(${txt.rotation}deg)`,
              fontFamily: txt.fontFamily,
              fontSize: `${textFontSizeCqw(txt.fontSize, txt.scale)}cqw`,
              color: txt.color,
              fontWeight: txt.bold ? "bold" : "normal",
              fontStyle: txt.italic ? "italic" : "normal",
            }}
            onPointerDown={(e) => onTextPointerDown(e, txt.id)}
          >
            {txt.content}
          </div>
        ))}
      </PrintAreaBox>

      <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-muted-foreground/50 pointer-events-none">
        {t("editor.dragHint")}
      </p>
    </div>
  );
};
