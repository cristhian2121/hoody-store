import type { DesignLayer } from "@/lib/types";

interface DesignLayerPreviewProps {
  layer: DesignLayer;
}

export const DesignLayerPreview = ({ layer }: DesignLayerPreviewProps) => (
  <>
    {layer.image && (
      <img
        src={layer.image.src}
        alt=""
        className="absolute pointer-events-none max-w-[45%] max-h-[45%] object-contain"
        style={{
          left: `${layer.image.x}%`,
          top: `${layer.image.y}%`,
          transform: `translate(-50%, -50%) scale(${layer.image.scale}) rotate(${layer.image.rotation}deg)`,
          mixBlendMode: "multiply",
        }}
      />
    )}
    {layer.texts.map((txt) => (
      <div
        key={txt.id}
        className="absolute pointer-events-none text-center"
        style={{
          left: `${txt.x}%`,
          top: `${txt.y}%`,
          transform: `translate(-50%, -50%) scale(${txt.scale}) rotate(${txt.rotation}deg)`,
          fontFamily: txt.fontFamily,
          fontSize: `min(${txt.fontSize}px, 5vw)`,
          color: txt.color,
          fontWeight: txt.bold ? "bold" : "normal",
          fontStyle: txt.italic ? "italic" : "normal",
          mixBlendMode: "multiply",
        }}
      >
        {txt.content}
      </div>
    ))}
  </>
);
