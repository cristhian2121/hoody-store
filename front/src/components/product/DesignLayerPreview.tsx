import type { DesignLayer, ProductCategory, PrintSide } from "@/lib/types";
import { PRINT_AREAS } from "@/lib/constants";
import { imageWidthCqw, textFontSizeCqw } from "@/lib/utils/print-geometry";
import { PrintAreaBox } from "@/components/personalization/PrintAreaBox";

interface DesignLayerPreviewProps {
  layer: DesignLayer;
  category: ProductCategory;
  side?: PrintSide;
}

/**
 * Vista de solo lectura del diseno sobre la foto del producto.
 *
 * Usa exactamente la misma caja y las mismas unidades que el editor. Antes era
 * un segundo renderer con reglas propias (`max-w-[45%]`, `min(px, 5vw)`), asi
 * que la ficha de producto y el carrito mostraban el diseno distinto al editor.
 */
export const DesignLayerPreview = ({
  layer,
  category,
  side = "front",
}: DesignLayerPreviewProps) => {
  const area = PRINT_AREAS[category][side];

  return (
    <PrintAreaBox area={area} className="pointer-events-none">
      {layer.image && (
        <img
          src={layer.image.src}
          alt=""
          className="absolute"
          style={{
            left: `${layer.image.x}%`,
            top: `${layer.image.y}%`,
            width: `${imageWidthCqw(layer.image.scale)}cqw`,
            transform: `translate(-50%, -50%) rotate(${layer.image.rotation}deg)`,
          }}
        />
      )}
      {layer.texts.map((txt) => (
        <div
          key={txt.id}
          className="absolute text-center whitespace-nowrap"
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
        >
          {txt.content}
        </div>
      ))}
    </PrintAreaBox>
  );
};
