import * as React from "react";
import { Type, RotateCcw, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import type {
  PersonalizationData,
  PrintSide,
  ProductCategory,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePersonalization } from "@/hooks/usePersonalization";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useImageUpload } from "@/hooks/useImageUpload";
import { getPositionPreset } from "@/lib/utils/position";
import type { HorizontalPosition, VerticalPosition } from "@/lib/constants";
import { DesignCanvas } from "./personalization/DesignCanvas";
import { ImageControls } from "./personalization/ImageControls";
import { TextControls } from "./personalization/TextControls";
import { PositionPresets } from "./personalization/PositionPresets";
import { ColorSelector } from "@/components/ui/color-selector";
import { GARMENT_COLORS } from "@/lib/constants";

interface Props {
  category: ProductCategory;
  garmentColor: string;
  garmentImage?: string;
  garmentBase?: string;
  onSave: (data: PersonalizationData) => void;
  onChange?: (data: PersonalizationData) => void;
  initialData?: PersonalizationData;
}

const PersonalizationEditor = ({
  category,
  garmentColor,
  garmentImage,
  garmentBase,
  onSave,
  onChange,
  initialData,
}: Props) => {
  const { t } = useLanguage();

  const personalization = usePersonalization({
    initialData,
    onChange,
  });

  const [selectedGarmentColor, setSelectedGarmentColor] =
    React.useState(garmentColor);

  const {
    data,
    activeSide,
    setActiveSide,
    currentLayer,
    selectedTextId,
    setSelectedTextId,
    selectedText,
    addText,
    updateText,
    removeText,
    setImage,
    removeImage,
    updateImage,
    reset,
    updateLayer,
  } = personalization;

  const handleDragMove = React.useCallback(
    (type: "image" | "text", id: string | undefined, x: number, y: number) => {
      if (type === "image") {
        updateImage({ x, y });
      } else if (id) {
        updateText(id, { x, y });
      }
    },
    [updateImage, updateText],
  );

  const handleDragStart = React.useCallback(
    (type: "image" | "text", id?: string) => {
      if (type === "text" && id) {
        setSelectedTextId(id);
      }
    },
    [setSelectedTextId],
  );

  const dragAndDrop = useDragAndDrop({
    onDragMove: handleDragMove,
    onDragStart: handleDragStart,
  });

  const handleImageUploaded = React.useCallback(
    (image: Parameters<typeof setImage>[0]) => {
      setImage(image);
    },
    [setImage],
  );

  const handleImageError = React.useCallback((error: string) => {
    alert(error);
  }, []);

  const imageUpload = useImageUpload({
    onImageUploaded: handleImageUploaded,
    onError: handleImageError,
  });

  const handleImagePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (!currentLayer.image) return;
      dragAndDrop.handlePointerDown(e, "image", currentLayer.image);
    },
    [currentLayer.image, dragAndDrop],
  );

  const handleTextPointerDown = React.useCallback(
    (e: React.PointerEvent, id: string) => {
      const text = currentLayer.texts.find((t) => t.id === id);
      if (!text) return;
      dragAndDrop.handlePointerDown(e, "text", text, id);
    },
    [currentLayer.texts, dragAndDrop],
  );

  const handlePositionSelect = React.useCallback(
    (horizontal: HorizontalPosition, vertical: VerticalPosition) => {
      const { x, y } = getPositionPreset(horizontal, vertical);
      if (selectedText) {
        updateText(selectedText.id, { x, y });
      } else if (currentLayer.image) {
        updateImage({ x, y });
      }
    },
    [selectedText, currentLayer.image, updateText, updateImage],
  );

  const handleCenterImage = React.useCallback(() => {
    updateImage({ x: 50, y: 50 });
  }, [updateImage]);

  const handleCenterText = React.useCallback(() => {
    if (selectedTextId) {
      updateText(selectedTextId, { x: 50 });
    }
  }, [selectedTextId, updateText]);

  const activeElement = selectedText ?? currentLayer.image;

  return (
    <div className="h-full flex flex-col space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        {t("editor.title")}
      </h3>
      {/* Side tabs */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[40%_60%] gap-4 min-h-0 ">
        {/* Controls */}
        <div className="space-y-3 lg:pr-2 overflow-x-hidden">
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
          <ColorSelector
            colors={GARMENT_COLORS[category]}
            value={selectedGarmentColor}
            onChange={setSelectedGarmentColor}
          />
          <ImageControls
            image={currentLayer.image}
            fileInputRef={imageUpload.fileInputRef}
            aiPrompt={imageUpload.aiPrompt}
            aiLoading={imageUpload.aiLoading}
            onAiPromptChange={imageUpload.setAiPrompt}
            onUploadClick={imageUpload.triggerFileInput}
            onFileChange={imageUpload.handleFileInputChange}
            onRemove={removeImage}
            onAiGenerate={imageUpload.handleAiGenerate}
            onScaleChange={(scale) => updateImage({ scale })}
            onRotationChange={(rotation) => updateImage({ rotation })}
            onCenter={handleCenterImage}
          />

          <PositionPresets
            activeElement={activeElement}
            onPositionSelect={handlePositionSelect}
          />

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
            <TextControls
              text={selectedText}
              onContentChange={(content) =>
                updateText(selectedText.id, { content })
              }
              onFontFamilyChange={(fontFamily) =>
                updateText(selectedText.id, { fontFamily })
              }
              onFontSizeChange={(fontSize) =>
                updateText(selectedText.id, { fontSize })
              }
              onColorChange={(color) => updateText(selectedText.id, { color })}
              onBoldToggle={() =>
                updateText(selectedText.id, { bold: !selectedText.bold })
              }
              onItalicToggle={() =>
                updateText(selectedText.id, { italic: !selectedText.italic })
              }
              onScaleChange={(scale) => updateText(selectedText.id, { scale })}
              onRotationChange={(rotation) =>
                updateText(selectedText.id, { rotation })
              }
              onCenter={handleCenterText}
              onRemove={() => removeText(selectedText.id)}
            />
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-1" /> {t("editor.reset")}
            </Button>
            <Button size="sm" onClick={() => onSave(data)} className="flex-1">
              {t("editor.save")}
            </Button>
          </div>
        </div>
        {/* Canvas */}
        <div className="space-y-4 lg:pl-2 overflow-x-hidden">
          <DesignCanvas
            category={category}
            garmentColor={selectedGarmentColor}
            garmentImage={garmentImage}
            garmentBase={garmentBase}
            activeSide={activeSide}
            currentLayer={currentLayer}
            selectedTextId={selectedTextId}
            containerRef={dragAndDrop.containerRef}
            onPointerMove={dragAndDrop.handlePointerMove}
            onPointerUp={dragAndDrop.handlePointerUp}
            onImagePointerDown={handleImagePointerDown}
            onTextPointerDown={handleTextPointerDown}
          />
        </div>
      </div>
    </div>
  );
};

export default PersonalizationEditor;
