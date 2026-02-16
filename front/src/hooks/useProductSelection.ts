import { useState, useCallback, useMemo } from "react";
import type { Gender, Product } from "@/lib/types";

interface UseProductSelectionOptions {
  product: Product;
  defaultGender?: Gender;
  defaultColorIndex?: number;
}

export const useProductSelection = ({
  product,
  defaultGender = "hombre",
  defaultColorIndex = 0,
}: UseProductSelectionOptions) => {
  const [selectedGender, setSelectedGender] = useState<Gender>(defaultGender);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColorIdx, setSelectedColorIdx] = useState(defaultColorIndex);
  const [activeImage, setActiveImage] = useState(0);

  const sizes = useMemo(
    () => product.sizes[selectedGender],
    [product.sizes, selectedGender],
  );

  const selectedColor = useMemo(
    () => product.colors[selectedColorIdx],
    [product.colors, selectedColorIdx],
  );

  const handleGenderChange = useCallback((gender: Gender) => {
    setSelectedGender(gender);
    setSelectedSize("");
  }, []);

  const handleSizeChange = useCallback((size: string) => {
    setSelectedSize(size);
  }, []);

  const handleColorChange = useCallback((index: number) => {
    setSelectedColorIdx(index);
  }, []);

  const handleImageChange = useCallback((index: number) => {
    setActiveImage(index);
  }, []);

  const isValidSelection = useMemo(() => {
    return selectedSize !== "";
  }, [selectedSize]);

  return {
    selectedGender,
    setSelectedGender: handleGenderChange,
    selectedSize,
    setSelectedSize: handleSizeChange,
    selectedColorIdx,
    setSelectedColorIdx: handleColorChange,
    activeImage,
    setActiveImage: handleImageChange,
    sizes,
    selectedColor,
    isValidSelection,
  };
};
