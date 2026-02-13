import React, { useState, useRef, useCallback } from "react";
import {
  Upload,
  Type,
  RotateCcw,
  Sparkles,
  Trash2,
  AlignCenter,
  Loader2,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import type {
  PersonalizationData,
  PrintSide,
  DesignLayer,
  TextElement,
  ImageElement,
  ProductCategory,
} from "@/lib/types";
import { emptyPersonalization } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const FONTS = [
  "Plus Jakarta Sans",
  "Arial",
  "Georgia",
  "Courier New",
  "Impact",
  "Comic Sans MS",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

interface Props {
  category: ProductCategory;
  garmentColor: string;
  onSave: (data: PersonalizationData) => void;
  initialData?: PersonalizationData;
}

const PersonalizationEditor = ({
  category,
  garmentColor,
  onSave,
  initialData,
}: Props) => {
  const { t } = useLanguage();
  const [data, setData] = useState<PersonalizationData>(
    initialData || emptyPersonalization(),
  );
  const [activeSide, setActiveSide] = useState<PrintSide>("front");
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    type: "image" | "text";
    id?: string;
    startX: number;
    startY: number;
    elemX: number;
    elemY: number;
  } | null>(null);

  const currentLayer = data[activeSide];

  const updateLayer = useCallback(
    (side: PrintSide, updater: (layer: DesignLayer) => DesignLayer) => {
      setData((prev) => ({ ...prev, [side]: updater(prev[side]) }));
    },
    [],
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert("Solo se permiten PNG, JPG y SVG");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert("El archivo es demasiado grande (máx. 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Resize if too large
        const maxDim = 800;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width *= ratio;
          height *= ratio;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
        const src = canvas.toDataURL("image/jpeg", 0.8);
        updateLayer(activeSide, (layer) => ({
          ...layer,
          image: { src, x: 50, y: 50, scale: 1, rotation: 0 },
        }));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const addText = () => {
    const id = crypto.randomUUID();
    updateLayer(activeSide, (layer) => ({
      ...layer,
      texts: [
        ...layer.texts,
        {
          id,
          content: "Tu texto",
          x: 50,
          y: 60,
          fontFamily: FONTS[0],
          fontSize: 24,
          color: "#ffffff",
          bold: false,
          italic: false,
          scale: 1,
          rotation: 0,
        },
      ],
    }));
    setSelectedTextId(id);
  };

  const updateText = (id: string, updates: Partial<TextElement>) => {
    updateLayer(activeSide, (layer) => ({
      ...layer,
      texts: layer.texts.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  };

  const removeText = (id: string) => {
    updateLayer(activeSide, (layer) => ({
      ...layer,
      texts: layer.texts.filter((t) => t.id !== id),
    }));
    setSelectedTextId(null);
  };

  const removeImage = () => {
    updateLayer(activeSide, (layer) => ({ ...layer, image: null }));
  };

  const handlePointerDown = (
    e: React.PointerEvent,
    type: "image" | "text",
    id?: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const elem =
      type === "image"
        ? currentLayer.image
        : currentLayer.texts.find((t) => t.id === id);
    if (!elem) return;
    dragRef.current = {
      type,
      id,
      startX: e.clientX,
      startY: e.clientY,
      elemX: elem.x,
      elemY: elem.y,
    };
    if (type === "text" && id) setSelectedTextId(id);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
    const newX = Math.max(0, Math.min(100, dragRef.current.elemX + dx));
    const newY = Math.max(0, Math.min(100, dragRef.current.elemY + dy));

    if (dragRef.current.type === "image") {
      updateLayer(activeSide, (layer) => ({
        ...layer,
        image: layer.image ? { ...layer.image, x: newX, y: newY } : null,
      }));
    } else if (dragRef.current.id) {
      updateText(dragRef.current.id, { x: newX, y: newY });
    }
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const centerElement = (type: "image" | "text") => {
    if (type === "image") {
      updateLayer(activeSide, (layer) => ({
        ...layer,
        image: layer.image ? { ...layer.image, x: 50, y: 50 } : null,
      }));
    } else if (selectedTextId) {
      updateText(selectedTextId, { x: 50 });
    }
  };

  const handleReset = () => {
    setData(emptyPersonalization());
    setSelectedTextId(null);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    // Simulated AI generation - in production this would call an API
    await new Promise((r) => setTimeout(r, 2000));
    // Create a placeholder generated image
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 400, 400);
    gradient.addColorStop(0, "#22c55e");
    gradient.addColorStop(1, "#3b82f6");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 400);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px Plus Jakarta Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("AI Generated", 200, 190);
    ctx.font = "14px Plus Jakarta Sans, sans-serif";
    ctx.fillText(aiPrompt.slice(0, 30), 200, 220);
    const src = canvas.toDataURL("image/png");
    updateLayer(activeSide, (layer) => ({
      ...layer,
      image: { src, x: 50, y: 50, scale: 1, rotation: 0 },
    }));
    setAiLoading(false);
    setAiPrompt("");
  };

  const selectedText = selectedTextId
    ? currentLayer.texts.find((t) => t.id === selectedTextId)
    : null;

  const isHoodie = category === "hoodies";

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        {t("editor.title")}
      </h3>

      {/* Side tabs */}
      <Tabs
        value={activeSide}
        onValueChange={(v) => {
          setActiveSide(v as PrintSide);
          setSelectedTextId(null);
        }}
      >
        <TabsList className="w-full">
          <TabsTrigger value="front" className="flex-1">
            {t("editor.front")}
          </TabsTrigger>
          <TabsTrigger value="back" className="flex-1">
            {t("editor.back")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Canvas */}
        <div
          ref={canvasRef}
          className="relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-dashed border-border bg-muted/30 select-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ touchAction: "none" }}
        >
          {/* Garment shape */}
          <svg viewBox="0 0 300 400" className="absolute inset-0 w-full h-full">
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
                {/* Hood detail */}
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
                {/* Pocket */}
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
                {/* Collar */}
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

          {/* Print area indicator */}
          <div
            className="absolute inset-[18%] top-[22%] bottom-[20%] border-2 border-dashed border-primary/20 rounded-lg flex items-center justify-center transition-colors"
            style={{
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

          {/* Uploaded image */}
          {currentLayer.image && (
            <div
              className="absolute cursor-grab active:cursor-grabbing ring-2 ring-primary/40 ring-offset-1 rounded-sm"
              style={{
                left: `${currentLayer.image.x}%`,
                top: `${currentLayer.image.y}%`,
                transform: `translate(-50%, -50%) scale(${currentLayer.image.scale}) rotate(${currentLayer.image.rotation}deg)`,
              }}
              onPointerDown={(e) => handlePointerDown(e, "image")}
            >
              <img
                src={currentLayer.image.src}
                alt="Design"
                className="w-28 sm:w-36 pointer-events-none"
                draggable={false}
              />
            </div>
          )}

          {/* Text elements */}
          {currentLayer.texts.map((txt) => (
            <div
              key={txt.id}
              className={`absolute cursor-grab active:cursor-grabbing px-1 ${selectedTextId === txt.id ? "ring-2 ring-primary rounded" : ""}`}
              style={{
                left: `${txt.x}%`,
                top: `${txt.y}%`,
                transform: `translate(-50%, -50%) scale(${txt.scale}) rotate(${txt.rotation}deg)`,
                fontFamily: txt.fontFamily,
                fontSize: `${txt.fontSize}px`,
                color: txt.color,
                fontWeight: txt.bold ? "bold" : "normal",
                fontStyle: txt.italic ? "italic" : "normal",
              }}
              onPointerDown={(e) => handlePointerDown(e, "text", txt.id)}
            >
              {txt.content}
            </div>
          ))}

          <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-muted-foreground/50">
            {t("editor.dragHint")}
          </p>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Image upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t("editor.uploadImage")}
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.svg"
              className="hidden"
              onChange={handleImageUpload}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-1" /> {t("editor.uploadImage")}
              </Button>
              {currentLayer.image && (
                <Button variant="outline" size="sm" onClick={removeImage}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* AI Generate */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t("editor.generateAI")}
            </Label>
            <div className="flex gap-2">
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={t("editor.aiPrompt")}
                className="text-sm min-h-[60px]"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAiGenerate}
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
          {currentLayer.image && (
            <div className="space-y-3 p-3 rounded-lg bg-muted/50">
              <div className="space-y-1">
                <Label className="text-xs">
                  {t("editor.scale")}: {currentLayer.image.scale.toFixed(1)}x
                </Label>
                <Slider
                  value={[currentLayer.image.scale]}
                  min={0.2}
                  max={3}
                  step={0.1}
                  onValueChange={([v]) =>
                    updateLayer(activeSide, (l) => ({
                      ...l,
                      image: l.image ? { ...l.image, scale: v } : null,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  {t("editor.rotation")}: {currentLayer.image.rotation}°
                </Label>
                <Slider
                  value={[currentLayer.image.rotation]}
                  min={-180}
                  max={180}
                  step={5}
                  onValueChange={([v]) =>
                    updateLayer(activeSide, (l) => ({
                      ...l,
                      image: l.image ? { ...l.image, rotation: v } : null,
                    }))
                  }
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => centerElement("image")}
              >
                <AlignCenter className="h-3.5 w-3.5 mr-1" />{" "}
                {t("editor.center")}
              </Button>
            </div>
          )}

          {/* Add text */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={addText}
                className="flex-1"
              >
                <Type className="h-4 w-4 mr-1" /> {t("editor.addText")}
              </Button>
            </div>
          </div>

          {/* Text controls */}
          {selectedText && (
            <div className="space-y-3 p-3 rounded-lg bg-muted/50">
              <Input
                value={selectedText.content}
                onChange={(e) =>
                  updateText(selectedText.id, { content: e.target.value })
                }
                className="text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={selectedText.fontFamily}
                  onValueChange={(v) =>
                    updateText(selectedText.id, { fontFamily: v })
                  }
                >
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
                  value={selectedText.fontSize}
                  onChange={(e) =>
                    updateText(selectedText.id, {
                      fontSize: Number(e.target.value),
                    })
                  }
                  className="text-xs h-8"
                  min={8}
                  max={72}
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={selectedText.color}
                  onChange={(e) =>
                    updateText(selectedText.id, { color: e.target.value })
                  }
                  className="h-8 w-10 p-0.5 cursor-pointer"
                />
                <Button
                  variant={selectedText.bold ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-8 p-0 font-bold"
                  onClick={() =>
                    updateText(selectedText.id, { bold: !selectedText.bold })
                  }
                >
                  B
                </Button>
                <Button
                  variant={selectedText.italic ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-8 p-0 italic"
                  onClick={() =>
                    updateText(selectedText.id, {
                      italic: !selectedText.italic,
                    })
                  }
                >
                  I
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => centerElement("text")}
                >
                  <AlignCenter className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive"
                  onClick={() => removeText(selectedText.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  {t("editor.scale")}: {selectedText.scale.toFixed(1)}x
                </Label>
                <Slider
                  value={[selectedText.scale]}
                  min={0.5}
                  max={3}
                  step={0.1}
                  onValueChange={([v]) =>
                    updateText(selectedText.id, { scale: v })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  {t("editor.rotation")}: {selectedText.rotation}°
                </Label>
                <Slider
                  value={[selectedText.rotation]}
                  min={-180}
                  max={180}
                  step={5}
                  onValueChange={([v]) =>
                    updateText(selectedText.id, { rotation: v })
                  }
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-1" /> {t("editor.reset")}
            </Button>
            <Button size="sm" onClick={() => onSave(data)} className="flex-1">
              {t("editor.save")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalizationEditor;
