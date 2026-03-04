import * as React from "react";
import type { PersonalizationData, ProductCategory, Product } from "@/lib/types";
import PersonalizationEditor from "@/components/PersonalizationEditor";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: ProductCategory;
  product: Product;
  garmentColor: string;
  onSave: (data: PersonalizationData) => void;
  onChange?: (data: PersonalizationData) => void;
  initialData?: PersonalizationData;
}

const PersonalizationEditorModal = ({
  open,
  onOpenChange,
  category,
  product,
  garmentColor,
  onSave,
  onChange,
  initialData,
}: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-none w-[90vw] h-[90vh] p-0 overflow-hidden sm:rounded-2xl">
      <div className="h-full w-full overflow-auto p-6">
        <PersonalizationEditor
          category={category}
          product={product}
          garmentColor={garmentColor}
          onSave={onSave}
          onChange={onChange}
          initialData={initialData}
        />
      </div>
    </DialogContent>
  </Dialog>
);

export default PersonalizationEditorModal;
