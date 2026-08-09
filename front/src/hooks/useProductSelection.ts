import { useState, useCallback, useMemo, useEffect } from "react";
import type { Gender, Product, ProductVariant } from "@/lib/types";

interface UseProductSelectionOptions {
  product: Product;
  defaultGender?: Gender;
  defaultColorIndex?: number;
}

/**
 * Resuelve la variante concreta que el cliente esta eligiendo.
 *
 * Antes las tallas salian de una tabla fija y no habia forma de saber si esa
 * combinacion existia: se podia agregar al carrito un color y una talla que
 * nunca se fabricaron juntos. Ahora las opciones se derivan de las variantes
 * disponibles, asi que una combinacion imposible ni siquiera aparece.
 */
export const useProductSelection = ({
  product,
  defaultGender = "hombre",
  defaultColorIndex = 0,
}: UseProductSelectionOptions) => {
  const [selectedGender, setSelectedGender] = useState<Gender>(defaultGender);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColorIdx, setSelectedColorIdx] = useState(defaultColorIndex);
  const [activeImage, setActiveImage] = useState(0);

  const selectedColor = useMemo(
    () => product.colors[selectedColorIdx] ?? product.colors[0],
    [product.colors, selectedColorIdx],
  );

  const availableVariants = useMemo(
    () => product.variants.filter((variant) => variant.available),
    [product.variants],
  );

  // Solo las tallas que existen para este genero y este color.
  const sizes = useMemo(() => {
    const forSelection = availableVariants.filter(
      (variant) => variant.gender === selectedGender && variant.colorId === selectedColor?.id,
    );
    const order = product.sizes[selectedGender] ?? [];
    const present = new Set(forSelection.map((variant) => variant.size));
    // Se respeta el orden del catalogo (XS, S, M...) en vez del orden en que
    // vengan las variantes.
    return order.filter((size) => present.has(size));
  }, [availableVariants, selectedGender, selectedColor?.id, product.sizes]);

  // Cambiar de genero o de color puede dejar seleccionada una talla que ya no
  // se ofrece. Se limpia para que no quede un boton marcado sin variante detras.
  useEffect(() => {
    if (selectedSize && !sizes.includes(selectedSize)) {
      setSelectedSize("");
    }
  }, [sizes, selectedSize]);

  const selectedVariant: ProductVariant | undefined = useMemo(
    () =>
      availableVariants.find(
        (variant) =>
          variant.gender === selectedGender &&
          variant.size === selectedSize &&
          variant.colorId === selectedColor?.id,
      ),
    [availableVariants, selectedGender, selectedSize, selectedColor?.id],
  );

  const handleGenderChange = useCallback((gender: Gender) => {
    setSelectedGender(gender);
    setSelectedSize("");
  }, []);

  const handleSizeChange = useCallback((size: string) => setSelectedSize(size), []);
  const handleColorChange = useCallback((index: number) => setSelectedColorIdx(index), []);
  const handleImageChange = useCallback((index: number) => setActiveImage(index), []);

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
    selectedVariant,
    /** Precio de la variante elegida; mientras no haya talla, el "desde". */
    displayPrice: selectedVariant?.price ?? product.priceFrom,
    isValidSelection: Boolean(selectedVariant),
  };
};
