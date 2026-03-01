import * as React from "react";
import type { PersonalizationData, ProductCategory } from "@/lib/types";
import PersonalizationEditor from "@/components/PersonalizationEditor";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: ProductCategory;
  garmentColor: string;
  garmentImage?: string;
  garmentBase?: string;
  onSave: (data: PersonalizationData) => void;
  onChange?: (data: PersonalizationData) => void;
  initialData?: PersonalizationData;
}

const PersonalizationEditorModal = ({
  open,
  onOpenChange,
  category,
  garmentColor,
  garmentImage,
  garmentBase,
  onSave,
  onChange,
  initialData,
}: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-none w-[90vw] h-[90vh] p-0 overflow-hidden sm:rounded-2xl">
      <div className="h-full w-full overflow-auto p-6">
        <PersonalizationEditor
          category={category}
          garmentColor={garmentColor}
          garmentImage={garmentImage}
          garmentBase={garmentBase}
          onSave={onSave}
          onChange={onChange}
          initialData={initialData}
        />
      </div>
    </DialogContent>
  </Dialog>
);

export default PersonalizationEditorModal;
