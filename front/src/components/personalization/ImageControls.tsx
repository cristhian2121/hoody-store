import { Upload, Trash2, Sparkles, Loader2, AlignCenter } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import type { ImageElement } from "@/lib/types";
import type { RefObject } from "react";

interface ImageControlsProps {
  image: ImageElement | null;
  fileInputRef: RefObject<HTMLInputElement>;
  aiPrompt: string;
  aiLoading: boolean;
  onAiPromptChange: (value: string) => void;
  onUploadClick: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  onAiGenerate: () => void;
  onScaleChange: (scale: number) => void;
  onRotationChange: (rotation: number) => void;
  onCenter: () => void;
}

export const ImageControls = ({
  image,
  fileInputRef,
  aiPrompt,
  aiLoading,
  onAiPromptChange,
  onUploadClick,
  onFileChange,
  onRemove,
  onAiGenerate,
  onScaleChange,
  onRotationChange,
  onCenter,
}: ImageControlsProps) => {
  const { t } = useLanguage();

  return (
    <>
      {/* Image upload */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("editor.uploadImage")}</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.svg"
          className="hidden"
          onChange={onFileChange}
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onUploadClick}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-1" /> {t("editor.uploadImage")}
          </Button>
          {image && (
            <Button variant="outline" size="sm" onClick={onRemove}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* AI Generate */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("editor.generateAI")}</Label>
        <div className="flex gap-2">
          <Textarea
            value={aiPrompt}
            onChange={(e) => onAiPromptChange(e.target.value)}
            placeholder={t("editor.aiPrompt")}
            className="text-sm min-h-[60px]"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onAiGenerate}
          disabled={aiLoading || !aiPrompt.trim()}
          className="w-full"
        >
          {aiLoading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-1" />
          )}
          {aiLoading ? t("editor.generating") : t("editor.generateAI")}
        </Button>
      </div>

      {/* Image controls */}
      {image && (
        <div className="space-y-3 p-3 rounded-lg bg-muted/50">
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
