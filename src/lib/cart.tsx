import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import type {
  CartItem,
  Gender,
  ProductColor,
  PersonalizationData,
} from "./types";

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "cartItemId" | "quantity">) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateVariant: (
    cartItemId: string,
    updates: { gender?: Gender; size?: string; color?: ProductColor },
  ) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = "app-cart";

const loadCart = (): CartItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [isCartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback(
    (item: Omit<CartItem, "cartItemId" | "quantity">) => {
      setItems((prev) => {
        const existing = prev.find(
          (i) =>
            i.productId === item.productId &&
            i.gender === item.gender &&
            i.size === item.size &&
            i.color.id === item.color.id &&
            !i.personalization &&
            !item.personalization,
        );
        if (existing) {
          return prev.map((i) =>
            i.cartItemId === existing.cartItemId
              ? { ...i, quantity: i.quantity + 1 }
              : i,
          );
        }
        return [
          ...prev,
          { ...item, cartItemId: crypto.randomUUID(), quantity: 1 },
        ];
      });
      setCartOpen(true);
    },
    [],
  );

  const removeItem = useCallback((cartItemId: string) => {
    setItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  }, []);

  const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((i) => (i.cartItemId === cartItemId ? { ...i, quantity } : i)),
    );
  }, []);

  const updateVariant = useCallback(
    (
      cartItemId: string,
      updates: { gender?: Gender; size?: string; color?: ProductColor },
    ) => {
      setItems((prev) =>
        prev.map((i) =>
          i.cartItemId === cartItemId ? { ...i, ...updates } : i,
        ),
      );
    },
    [],
  );

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        updateVariant,
        clearCart,
        totalItems,
        subtotal,
        isCartOpen,
        setCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
