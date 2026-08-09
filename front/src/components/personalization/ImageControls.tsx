import { Upload, Trash2, Loader2, AlignCenter } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { ImageElement } from "@/lib/types";
import { IMAGE_FILE_ACCEPT } from "@/lib/constants";
import type { DesignImageQuality } from "@/hooks/useDesignValidation";
import { DpiWarning } from "./DpiWarning";
import type { RefObject } from "react";

interface ImageControlsProps {
  image: ImageElement | null;
  fileInputRef: RefObject<HTMLInputElement>;
  uploading: boolean;
  quality: DesignImageQuality | null;
  onUploadClick: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  onScaleChange: (scale: number) => void;
  onRotationChange: (rotation: number) => void;
  onCenter: () => void;
}

export const ImageControls = ({
  image,
  fileInputRef,
  uploading,
  quality,
  onUploadClick,
  onFileChange,
  onRemove,
  onScaleChange,
  onRotationChange,
  onCenter,
}: ImageControlsProps) => {
  const { t } = useLanguage();

  return (
    <>
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("editor.uploadImage")}</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_FILE_ACCEPT}
          className="hidden"
          onChange={onFileChange}
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onUploadClick}
            disabled={uploading}
            className="flex-1"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            {uploading ? t("editor.uploading") : t("editor.uploadImage")}
          </Button>
          {image && !uploading && (
            <Button variant="outline" size="sm" onClick={onRemove} title={t("editor.removeImage")}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">{t("editor.uploadHint")}</p>
      </div>

      {image && (
        <div className="space-y-3 p-3 rounded-lg bg-muted/50">
          {/* El aviso va junto al control de escala: agrandar el diseno es lo
              que baja el dpi, asi que el cliente ve la causa y el efecto. */}
          <DpiWarning quality={quality} />

          <div className="space-y-1">
            <Label className="text-xs">
              {t("editor.scale")}: {image.scale.toFixed(1)}x
            </Label>
            <Slider
              value={[image.scale]}
              min={0.2}
              max={3}
              step={0.1}
              onValueChange={([v]) => onScaleChange(v)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              {t("editor.rotation")}: {image.rotation}°
            </Label>
            <Slider
              value={[image.rotation]}
              min={-180}
              max={180}
              step={5}
              onValueChange={([v]) => onRotationChange(v)}
            />
          </div>
          <Button variant="ghost" size="sm" onClick={onCenter}>
            <AlignCenter className="h-3.5 w-3.5 mr-1" /> {t("editor.center")}
          </Button>
        </div>
      )}
    </>
  );
};
