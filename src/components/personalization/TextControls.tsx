import { AlignCenter, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TextElement } from "@/lib/types";
import { FONTS } from "@/lib/constants";

interface TextControlsProps {
  text: TextElement;
  onContentChange: (content: string) => void;
  onFontFamilyChange: (fontFamily: string) => void;
  onFontSizeChange: (fontSize: number) => void;
  onColorChange: (color: string) => void;
  onBoldToggle: () => void;
  onItalicToggle: () => void;
  onScaleChange: (scale: number) => void;
  onRotationChange: (rotation: number) => void;
  onCenter: () => void;
  onRemove: () => void;
}

export const TextControls = ({
  text,
  onContentChange,
  onFontFamilyChange,
  onFontSizeChange,
  onColorChange,
  onBoldToggle,
  onItalicToggle,
  onScaleChange,
  onRotationChange,
  onCenter,
  onRemove,
}: TextControlsProps) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-3 p-3 rounded-lg bg-muted/50">
      <Input
        value={text.content}
        onChange={(e) => onContentChange(e.target.value)}
        className="text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <Select value={text.fontFamily} onValueChange={onFontFamilyChange}>
          <SelectTrigger className="text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONTS.map((f) => (
              <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          value={text.fontSize}
          onChange={(e) => onFontSizeChange(Number(e.target.value))}
          className="text-xs h-8"
          min={8}
          max={72}
        />
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="color"
          value={text.color}
          onChange={(e) => onColorChange(e.target.value)}
          className="h-8 w-10 p-0.5 cursor-pointer"
        />
        <Button
          variant={text.bold ? "default" : "outline"}
          size="sm"
          className="h-8 w-8 p-0 font-bold"
          onClick={onBoldToggle}
        >
          B
        </Button>
        <Button
          variant={text.italic ? "default" : "outline"}
          size="sm"
          className="h-8 w-8 p-0 italic"
          onClick={onItalicToggle}
        >
          I
        </Button>
        <Button variant="ghost" size="sm" className="h-8" onClick={onCenter}>
          <AlignCenter className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">
          {t("editor.scale")}: {text.scale.toFixed(1)}x
        </Label>
        <Slider
          value={[text.scale]}
          min={0.5}
          max={3}
          step={0.1}
          onValueChange={([v]) => onScaleChange(v)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">
          {t("editor.rotation")}: {text.rotation}°
        </Label>
        <Slider
          value={[text.rotation]}
          min={-180}
          max={180}
          step={5}
          onValueChange={([v]) => onRotationChange(v)}
        />
      </div>
    </div>
  );
};
