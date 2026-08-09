import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { toast } from "sonner";
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
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | null>(null);

/**
 * v2 porque cambio la forma de los items: la imagen del diseno paso de ser un
 * data URL base64 a una referencia al servidor. Un carrito v1 no tiene assetId
 * y sus imagenes de producto apuntan a URLs con hash de Vite que ya no existen,
 * asi que no hay nada que migrar: se descarta.
 */
const STORAGE_KEY = "app-cart-v2";
const LEGACY_STORAGE_KEY = "app-cart";

const loadCart = (): CartItem[] => {
  try {
    // Los base64 del carrito viejo son justamente lo que llenaba la cuota.
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [isCartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Sin este catch, un QuotaExceededError aca es una excepcion sin capturar
      // dentro de un effect de render: React desmonta el arbol y el cliente ve
      // una pantalla en blanco con el carrito lleno. El carrito en memoria
      // sigue funcionando; lo unico que se pierde es sobrevivir a un refresh.
      toast.error("No pudimos guardar tu carrito. Si recargas la pagina puede que se pierda.");
    }
  }, [items]);

  const addItem = useCallback(
    (item: Omit<CartItem, "cartItemId" | "quantity">) => {
      setItems((prev) => {
        // Se fusiona por variante, que es la combinacion exacta de producto,
        // genero, talla y color. Dos lineas personalizadas nunca se fusionan
        // aunque compartan variante: cada una lleva su propio diseno y unirlas
        // borraria uno en silencio.
        const existing = prev.find(
          (i) => i.variantId === item.variantId && !i.personalization && !item.personalization,
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
