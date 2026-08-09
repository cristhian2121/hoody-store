import { AlertTriangle, Info, XCircle } from "lucide-react";
import type { DesignImageQuality } from "@/hooks/useDesignValidation";
import { MIN_PRINT_DPI } from "@/lib/constants";

interface DpiWarningProps {
  quality: DesignImageQuality | null;
}

const TONE = {
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  poor: "border-destructive/40 bg-destructive/10 text-destructive",
  block: "border-destructive bg-destructive/15 text-destructive",
  info: "border-border bg-muted/50 text-muted-foreground",
} as const;

const cm = (mm: number) => (mm / 10).toFixed(1).replace(".", ",");

/**
 * Traduce el DPI efectivo a lenguaje de prenda.
 *
 * Deliberadamente dice cuantos centimetros va a medir el estampado: "146 dpi" no
 * le dice nada a nadie, "21,4 cm de ancho a partir de una imagen de 1200 px" si.
 */
export const DpiWarning = ({ quality }: DpiWarningProps) => {
  if (!quality) return null;

  const size = `${cm(quality.drawWidthMm)} × ${cm(quality.drawHeightMm)} cm`;
  const dpi = Math.round(quality.dpi);

  const messages: { tone: keyof typeof TONE; icon: typeof Info; text: string }[] = [];

  if (quality.verdict === "block") {
    messages.push({
      tone: "block",
      icon: XCircle,
      text:
        `Tu imagen es muy pequena para estamparse a ${size} (${dpi} dpi, minimo ${MIN_PRINT_DPI}). ` +
        "Reducí el tamano del diseno o subí una imagen de mas resolucion.",
    });
  } else if (quality.verdict === "poor") {
    messages.push({
      tone: "poor",
      icon: AlertTriangle,
      text: `A ${size} tu imagen se va a ver pixelada (${dpi} dpi). Podés comprarla igual, pero se nota.`,
    });
  } else if (quality.verdict === "warn") {
    messages.push({
      tone: "warn",
      icon: AlertTriangle,
      text: `A ${size} la calidad va a ser aceptable pero no perfecta (${dpi} dpi).`,
    });
  }

  // La transparencia no es un problema de calidad, pero es la sorpresa mas
  // comun al recibir la prenda: el cliente esperaba su logo recortado y le
  // llega dentro de un rectangulo de color.
  if (!quality.hasAlpha) {
    messages.push({
      tone: "info",
      icon: Info,
      text: "Tu imagen no tiene fondo transparente: se va a estampar el rectangulo completo.",
    });
  }

  if (messages.length === 0) return null;

  return (
    <div className="space-y-2">
      {messages.map(({ tone, icon: Icon, text }, index) => (
        <div
          key={index}
          role={tone === "block" ? "alert" : "status"}
          className={`flex gap-2 rounded-lg border p-2.5 text-xs ${TONE[tone]}`}
        >
          <Icon className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{text}</p>
        </div>
      ))}
    </div>
  );
};
