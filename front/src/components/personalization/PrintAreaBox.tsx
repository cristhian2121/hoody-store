import type { CSSProperties, ReactNode, RefObject } from "react";
import type { PrintArea } from "@/lib/constants";

interface PrintAreaBoxProps {
  area: PrintArea;
  boxRef?: RefObject<HTMLDivElement>;
  children?: ReactNode;
  className?: string;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: () => void;
}

/**
 * El area de estampado como caja real, no como rectangulo decorativo.
 *
 * Tres cosas la hacen determinista:
 *  - `aspect-ratio` sale de los milimetros, asi que la caja en pantalla no puede
 *    contradecir al rectangulo fisico.
 *  - `container-type: inline-size` habilita unidades `cqw`, con las que todo lo
 *    de adentro se dimensiona como fraccion del area. Eso reemplaza al
 *    `w-28 sm:w-36` anterior, que hacia que el diseno cambiara de tamano segun
 *    el breakpoint del navegador.
 *  - `overflow: hidden` impide que algo se vea fuera del area.
 *
 * Ademas es el contenedor de arrastre: las coordenadas son % de esta caja.
 */
export const PrintAreaBox = ({
  area,
  boxRef,
  children,
  className = "",
  onPointerMove,
  onPointerUp,
}: PrintAreaBoxProps) => {
  const style: CSSProperties = {
    top: `${area.preview.topPct}%`,
    left: `${area.preview.leftPct}%`,
    width: `${area.preview.widthPct}%`,
    aspectRatio: `${area.widthMm} / ${area.heightMm}`,
    containerType: "inline-size",
    touchAction: "none",
  };

  return (
    <div
      ref={boxRef}
      className={`absolute overflow-hidden ${className}`}
      style={style}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {children}
    </div>
  );
};
