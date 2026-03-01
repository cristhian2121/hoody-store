import type { ProductCategory } from "@/lib/types";

interface GarmentPreviewProps {
  category: ProductCategory;
  garmentColor: string;
  garmentImage?: string;
  garmentBase?: string;
}

export const GarmentPreview = ({
  category,
  garmentColor,
  garmentImage,
  garmentBase,
}: GarmentPreviewProps) => {
  const isHoodie = category === "hoodies";

  if (garmentImage) {
    return (
      <div className="relative w-96 aspect-[3/4]">
        {/* Base gris */}
        <img
          src={garmentBase}
          className="absolute inset-0 w-full h-full object-contain"
          alt="hoodie base"
        />

        {/* Color dinámico */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundColor: garmentColor,
            mixBlendMode: "color",
          }}
        />

        {/* Sombras */}
        <img
          src={garmentImage}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          alt="hoodie shadow"
        />
      </div>
    );
  }

  return (
    <svg viewBox="1 0 300 400" className="absolute inset-0 w-full h-full">
      {isHoodie ? (
        <>
          <path
            d="M100,20 Q110,5 130,8 L135,25 Q140,15 150,12 Q160,15 165,25 L170,8 Q190,5 200,20 L240,60 L250,100 L220,110 L210,70 L210,370 Q210,390 190,390 L110,390 Q90,390 90,370 L90,70 L80,110 L50,100 L60,60 Z"
            fill={garmentColor}
            opacity="0.85"
          />
          <path
            d="M100,20 Q110,5 130,8 L135,25 Q140,15 150,12 Q160,15 165,25 L170,8 Q190,5 200,20 L240,60 L250,100 L220,110 L210,70 L210,370 Q210,390 190,390 L110,390 Q90,390 90,370 L90,70 L80,110 L50,100 L60,60 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.2"
          />
          <path
            d="M130,8 Q130,-5 150,-8 Q170,-5 170,8"
            fill={garmentColor}
            opacity="0.7"
          />
          <path
            d="M130,8 Q130,-5 150,-8 Q170,-5 170,8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.15"
          />
          <rect
            x="120"
            y="250"
            width="60"
            height="35"
            rx="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            opacity="0.1"
          />
        </>
      ) : (
        <>
          <path
            d="M110,30 Q120,15 150,12 Q180,15 190,30 L250,70 L240,120 L200,105 L200,370 Q200,385 185,385 L115,385 Q100,385 100,370 L100,105 L60,120 L50,70 Z"
            fill={garmentColor}
            opacity="0.85"
          />
          <path
            d="M110,30 Q120,15 150,12 Q180,15 190,30 L250,70 L240,120 L200,105 L200,370 Q200,385 185,385 L115,385 Q100,385 100,370 L100,105 L60,120 L50,70 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.2"
          />
          <path
            d="M125,25 Q150,35 175,25"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.15"
          />
        </>
      )}
    </svg>
  );
};
